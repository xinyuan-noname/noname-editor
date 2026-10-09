/**
 * 武将卡绘制后端：把**同一份绘制指令**翻译成 canvas 2D 调用或 SVG 元素。
 *
 * 为什么要有这一层：`characterCard.mjs` 的版式（势力渐变底 / 立绘 cover / 压暗层 / 姓名竖排 /
 * 体力护甲 / 势力徽记 / 技能面板 / 卡框）是用户逐条拍过板的，只能有**一份实现**。
 * 导出 SVG 时若另写一套绘制，改版式就要改两处、必然漂移（本仓库历史上多次栽在「两份副本」上）。
 * 所以绘制函数一律面向本文件的 `CardSurface` 接口：
 * - `CanvasSurface` —— 薄封装真 ctx（行为与改造前一致，PNG/JPG 观感不变）
 * - `SvgSurface`    —— 同一串指令翻译成 SVG 元素（文字保持真 `<text>`，图片以 base64 内嵌，按图层分组）
 *
 * 接口清单见 `SURFACE_METHODS` / `SURFACE_PROPERTIES`：两个后端都必须实现全部成员，
 * `_x19D6_backup/tools/card-svg-check.mjs` 会逐项核对（少一个 = 某个后端静默丢绘制）。
 */

/** 需要逐项实现的状态属性（canvas 2D 子集；两个后端都用访问器暴露） */
export const SURFACE_PROPERTIES = [
    "font", "fillStyle", "strokeStyle", "lineWidth", "lineJoin", "lineCap",
    "globalAlpha", "filter", "shadowColor", "shadowBlur", "textAlign", "textBaseline",
];

/** 需要逐项实现的方法（canvas 2D 子集 + 本模块自加的 section） */
export const SURFACE_METHODS = [
    "save", "restore", "beginPath", "moveTo", "lineTo", "arcTo", "arc", "rect", "closePath",
    "clip", "fill", "stroke", "fillRect", "fillText", "strokeText", "drawImage",
    "createLinearGradient", "measureText", "section",
];

/** 默认状态（与 canvas 2D 的默认值对齐） */
const DEFAULT_STATE = {
    font: "16px sans-serif",
    fillStyle: "#000000",
    strokeStyle: "#000000",
    lineWidth: 1,
    lineJoin: "miter",
    lineCap: "butt",
    globalAlpha: 1,
    filter: "",
    shadowColor: "",
    shadowBlur: 0,
    textAlign: "left",
    textBaseline: "alphabetic",
};

/** canvas 的 textAlign -> SVG 的 text-anchor */
const TEXT_ANCHOR = { left: "start", center: "middle", right: "end" };

/**
 * canvas 的 textBaseline -> SVG 的 dominant-baseline。
 * `middle` → `central`（em 盒中心）、`top` → `text-before-edge`（em 盒上沿），这是与 canvas 语义最接近的对应；
 * 差异由无头 Edge 的像素比对兜底（见 tools/card-svg-check 的浏览器段）。
 */
const TEXT_BASELINE = { middle: "central", top: "text-before-edge", bottom: "text-after-edge", hanging: "hanging" };

/** 扩展名兜底（**只做兜底**：游戏里不少 `.png` 其实是 webp 内容，所以优先按文件头嗅探） */
const MIME_BY_EXT = {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
    webp: "image/webp", gif: "image/gif", bmp: "image/bmp",
};

/**
 * 数字格式化：SVG 里不要出现科学计数法与长尾巴
 * @param {number} value
 * @returns {string}
 */
export function svgNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "0";
    return String(Math.round(number * 100) / 100);
}

/**
 * XML 文本/属性转义（技能描述里可能有 `<br>` 之类，不清洗会破坏 SVG 结构）
 * @param {unknown} text
 * @returns {string}
 */
export function escapeXml(text) {
    return String(text ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
    }[char]));
}

/**
 * 颜色解析：SVG 的 `fill`/`stop-color` 不接受 `rgba()`，要拆成颜色 + 独立的不透明度
 * @param {unknown} value 形如 `#f7e7bb` / `rgb(1, 2, 3)` / `rgba(0, 0, 0, .62)` / `wheat`
 * @returns {{color:string, opacity:number}}
 */
export function parseColor(value) {
    const text = String(value ?? "").trim();
    if (!text) return { color: "none", opacity: 1 };
    const rgba = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+%?)\s*)?\)$/i.exec(text);
    if (!rgba) return { color: text, opacity: 1 };
    const channels = [rgba[1], rgba[2], rgba[3]].map(channel => Math.max(0, Math.min(255, Math.round(Number(channel)))));
    let opacity = 1;
    if (rgba[4] != null && rgba[4] !== "") {
        opacity = rgba[4].endsWith("%") ? Number(rgba[4].slice(0, -1)) / 100 : Number(rgba[4]);
    }
    if (!Number.isFinite(opacity)) opacity = 1;
    return { color: `rgb(${channels[0]}, ${channels[1]}, ${channels[2]})`, opacity: Math.max(0, Math.min(1, opacity)) };
}

/**
 * canvas 的 `font` 简写 -> SVG 的三个属性。
 * 本模块只面对自己写死的几个字体栈（`bold 38px "方正…",serif` 这种形态），够用即可。
 * @param {unknown} font
 * @returns {{style:string, weight:string, size:number, family:string}}
 */
export function parseFont(font) {
    const text = String(font ?? "").trim();
    const matched = /^(?:(italic|oblique)\s+)?(?:(bold|bolder|lighter|[1-9]00)\s+)?([\d.]+)px\s+(.+)$/i.exec(text);
    if (!matched) return { style: "normal", weight: "normal", size: 16, family: text || "sans-serif" };
    return {
        style: matched[1] ? matched[1].toLowerCase() : "normal",
        weight: matched[2] ? matched[2].toLowerCase() : "normal",
        size: Number(matched[3]) || 16,
        family: matched[4].trim(),
    };
}

/**
 * 按**文件头**认图片类型（游戏里很多 `.png` 其实是 webp 内容，只按后缀认会在 SVG 里解码失败）
 * @param {Uint8Array|number[]} bytes
 * @param {string} [fallbackPath] 认不出来时按后缀兜底
 * @returns {string} MIME
 */
export function sniffImageMime(bytes, fallbackPath = "") {
    const data = bytes || [];
    const at = (offset, ...codes) => codes.every((code, index) => data[offset + index] === code);
    if (at(0, 0x89, 0x50, 0x4e, 0x47)) return "image/png";
    if (at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
    if (at(0, 0x47, 0x49, 0x46, 0x38)) return "image/gif";
    if (at(0, 0x42, 0x4d)) return "image/bmp";
    if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "image/webp";
    const ext = String(fallbackPath || "").split("?")[0].split(".").pop().toLowerCase();
    return MIME_BY_EXT[ext] || "image/png";
}

/**
 * 字节 -> data URI（SVG 内嵌素材用；分块 fromCharCode 避免大图爆栈）
 * @param {Uint8Array|number[]} bytes
 * @param {string} [mime]
 * @returns {string}
 */
export function bytesToDataURL(bytes, mime = "image/png") {
    const data = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes || []);
    let binary = "";
    const chunk = 0x8000;
    for (let index = 0; index < data.length; index += chunk) {
        binary += String.fromCharCode.apply(null, data.subarray(index, index + chunk));
    }
    return `data:${mime};base64,${btoa(binary)}`;
}

/**
 * 体积显示（保存提示里带上，SVG 内嵌立绘后会明显大于 PNG，用户要能一眼看到）
 * @param {number} size
 * @returns {string}
 */
export function formatBytes(size) {
    const value = Number(size) || 0;
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * 默认的图片 -> SVG 引用解析：只有 `data:` 地址能直接进 SVG（blob:/页面相对地址导出后都会失效，
 * 由调用方通过 `resolveImage` 提供内嵌数据，见 `characterCard.mjs:createAssetResolver`）
 * @param {HTMLImageElement} img
 * @returns {{href:string, width:number, height:number}|null}
 */
export function defaultResolveImage(img) {
    if (!img) return null;
    const href = String(img.currentSrc || img.src || "");
    if (!href || !href.startsWith("data:")) return null;
    return { href, width: img.naturalWidth || img.width || 0, height: img.naturalHeight || img.height || 0 };
}

/**
 * canvas 后端：**薄封装**，每个成员一对一转发给真 ctx（改造前后 PNG 观感必须完全一致）
 */
export class CanvasSurface {
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {{scale?:number, width?:number, height?:number}} [config]
     */
    constructor(ctx, config = {}) {
        this.ctx = ctx;
        const scale = Number(config.scale) || 1;
        if (typeof ctx.setTransform === "function") ctx.setTransform(scale, 0, 0, scale, 0, 0);
        if (config.width && config.height && typeof ctx.clearRect === "function") {
            ctx.clearRect(0, 0, config.width, config.height);
        }
    }
    save() { this.ctx.save(); }
    restore() { this.ctx.restore(); }
    beginPath() { this.ctx.beginPath(); }
    moveTo(x, y) { this.ctx.moveTo(x, y); }
    lineTo(x, y) { this.ctx.lineTo(x, y); }
    arcTo(x1, y1, x2, y2, radius) { this.ctx.arcTo(x1, y1, x2, y2, radius); }
    arc(cx, cy, radius, startAngle, endAngle, counterclockwise) {
        this.ctx.arc(cx, cy, radius, startAngle, endAngle, Boolean(counterclockwise));
    }
    rect(x, y, width, height) { this.ctx.rect(x, y, width, height); }
    closePath() { this.ctx.closePath(); }
    clip() { this.ctx.clip(); }
    fill() { this.ctx.fill(); }
    stroke() { this.ctx.stroke(); }
    fillRect(x, y, width, height) { this.ctx.fillRect(x, y, width, height); }
    fillText(text, x, y) { this.ctx.fillText(text, x, y); }
    strokeText(text, x, y) { this.ctx.strokeText(text, x, y); }
    drawImage(...args) { this.ctx.drawImage(...args); }
    createLinearGradient(x0, y0, x1, y1) { return this.ctx.createLinearGradient(x0, y0, x1, y1); }
    measureText(text) { return this.ctx.measureText(String(text ?? "")).width; }
    /** 图层分组：canvas 不需要（导出的是位图），保持绘制顺序即可 */
    section(id, draw) { draw(); }
}

/**
 * SVG 后端：把同一串绘制指令翻译成 SVG 元素串。
 *
 * 三条实现约定：
 * 1. **`clip()` 开一个 `<g clip-path>`，由配对的 `restore()` 关闭**（与 canvas 的 clip 生命周期一致）；
 * 2. **图片统一走 `<defs>` 去重 + 嵌套 `<svg viewBox>` 换算源矩形**：base64 只出现一次（体力珠画 8 次也不会撑爆文件），
 *    而嵌套 svg 的 viewBox 正好等价于 canvas 的 `drawImage` 九参数裁剪；
 * 3. **文字的 strokeText + fillText 会合并成一个 `<text>`**（`paint-order="stroke"`）：不合并的话玩家改字要改两处。
 */
export class SvgSurface {
    /**
     * @param {{
     *   width?:number, height?:number,
     *   measure?:(font:string, text:string)=>number,
     *   resolveImage?:(img:HTMLImageElement)=>({href:string, width:number, height:number}|null)
     * }} [config]
     */
    constructor(config = {}) {
        this.width = Number(config.width) || 400;
        this.height = Number(config.height) || 559;
        this.measure = typeof config.measure === "function" ? config.measure : () => 0;
        this.resolveImage = typeof config.resolveImage === "function" ? config.resolveImage : defaultResolveImage;
        this.state = { ...DEFAULT_STATE };
        this.frames = [{ state: { ...DEFAULT_STATE }, tags: [] }];
        this.parts = [];
        this.defs = [];
        this.filters = new Map();
        this.sources = new Map();
        this.assets = new Map();
        this.layers = [];
        this.path = [];
        this.counter = 0;
        this.lastText = null;
    }

    /** 已经产出过的图层 id（自检用） */
    get layerIds() { return this.layers.slice(); }

    save() { this.frames.push({ state: { ...this.state }, tags: [] }); }
    restore() {
        const frame = this.frames.pop();
        if (!frame) return;
        for (let index = frame.tags.length - 1; index >= 0; index--) this.parts.push(frame.tags[index]);
        this.state = frame.state;
    }

    /**
     * 图层分组：`<g id="...">`，方便玩家在图软件里按层编辑（canvas 后端是空操作）
     * @param {string} id
     * @param {() => void} draw
     */
    section(id, draw) {
        const frame = this.frames[this.frames.length - 1];
        const depth = this.frames.length;
        this.layers.push(id);
        this.parts.push(`<g id="${escapeXml(id)}">`);
        frame.tags.push("</g>");
        try {
            draw();
        } finally {
            //绘制函数忘了配对 restore 时也要把 XML 收干净（否则导出文件不能解析）
            while (this.frames.length > depth) this.restore();
            this.parts.push("</g>");
            frame.tags.pop();
        }
    }

    beginPath() { this.path = []; }
    moveTo(x, y) { this.path.push(`M ${svgNumber(x)} ${svgNumber(y)}`); }
    lineTo(x, y) { this.path.push(`L ${svgNumber(x)} ${svgNumber(y)}`); }
    /**
     * canvas `arcTo` 的语义是「到 (x1,y1) 的切线与到 (x2,y2) 的切线之间的圆弧」；
     * 卡面只用它画**直角圆角**（`roundRectPath`，顺时针），此时严格等价于 `A r r 0 0 1 x2 y2`。
     */
    arcTo(x1, y1, x2, y2, radius) {
        this.path.push(`A ${svgNumber(radius)} ${svgNumber(radius)} 0 0 1 ${svgNumber(x2)} ${svgNumber(y2)}`);
    }
    arc(cx, cy, radius, startAngle, endAngle, counterclockwise = false) {
        const startX = cx + radius * Math.cos(startAngle);
        const startY = cy + radius * Math.sin(startAngle);
        const endX = cx + radius * Math.cos(endAngle);
        const endY = cy + radius * Math.sin(endAngle);
        let delta = endAngle - startAngle;
        if (counterclockwise && delta > 0) delta -= Math.PI * 2;
        if (!counterclockwise && delta < 0) delta += Math.PI * 2;
        const largeArc = Math.abs(delta) > Math.PI ? 1 : 0;
        const sweep = delta > 0 ? 1 : 0;
        if (!this.path.length) this.path.push(`M ${svgNumber(startX)} ${svgNumber(startY)}`);
        else this.path.push(`L ${svgNumber(startX)} ${svgNumber(startY)}`);
        this.path.push(`A ${svgNumber(radius)} ${svgNumber(radius)} 0 ${largeArc} ${sweep} ${svgNumber(endX)} ${svgNumber(endY)}`);
    }
    rect(x, y, width, height) {
        this.path.push(`M ${svgNumber(x)} ${svgNumber(y)} h ${svgNumber(width)} v ${svgNumber(height)} h ${svgNumber(-width)} Z`);
    }
    closePath() { this.path.push("Z"); }
    /** 当前路径的 `d`（空路径返回 ""，调用方据此忽略这次 fill/stroke） */
    pathData() { return this.path.join(" "); }

    clip() {
        const data = this.pathData();
        if (!data) return;
        const id = `clip${++this.counter}`;
        this.defs.push(`<clipPath id="${id}" clipPathUnits="userSpaceOnUse"><path d="${data}"/></clipPath>`);
        this.openGroup(`clip-path="url(#${id})"`);
    }
    openGroup(attributes) {
        this.parts.push(`<g ${attributes}>`);
        this.frames[this.frames.length - 1].tags.push("</g>");
    }

    fill() {
        const data = this.pathData();
        if (!data) return;
        const paint = this.resolvePaint(this.state.fillStyle);
        this.parts.push(`<path d="${data}" ${this.paintAttributes("fill", paint)}${this.effectAttributes()}/>`);
    }
    stroke() {
        const data = this.pathData();
        if (!data) return;
        const paint = this.resolvePaint(this.state.strokeStyle);
        const attributes = [
            this.paintAttributes("stroke", paint),
            `stroke-width="${svgNumber(this.state.lineWidth)}"`,
        ];
        if (this.state.lineJoin && this.state.lineJoin !== "miter") attributes.push(`stroke-linejoin="${escapeXml(this.state.lineJoin)}"`);
        if (this.state.lineCap && this.state.lineCap !== "butt") attributes.push(`stroke-linecap="${escapeXml(this.state.lineCap)}"`);
        this.parts.push(`<path d="${data}" fill="none" ${attributes.join(" ")}${this.effectAttributes()}/>`);
    }
    fillRect(x, y, width, height) {
        const paint = this.resolvePaint(this.state.fillStyle);
        this.parts.push(`<rect x="${svgNumber(x)}" y="${svgNumber(y)}" width="${svgNumber(width)}" height="${svgNumber(height)}" ${this.paintAttributes("fill", paint)}${this.effectAttributes()}/>`);
    }

    fillText(text, x, y) { this.emitText(text, x, y, "fill"); }
    strokeText(text, x, y) { this.emitText(text, x, y, "stroke"); }

    drawImage(image, ...args) {
        let source = this.sources.get(image);
        if (!source) {
            source = this.resolveImage(image);
            if (source) this.sources.set(image, source);
        }
        if (!source || !source.href) return;
        const width = source.width || image.naturalWidth || image.width || 0;
        const height = source.height || image.naturalHeight || image.height || 0;
        if (!width || !height) return;
        const href = this.imageRef(image, source, width, height);
        const attributes = [`preserveAspectRatio="none"`];
        if (Number(this.state.globalAlpha) < 1) attributes.push(`opacity="${svgNumber(this.state.globalAlpha)}"`);
        const effects = this.effectAttributes();
        if (args.length >= 8) {
            const [sx, sy, sw, sh, dx, dy, dw, dh] = args;
            //嵌套 svg 的 viewBox 正好等价于 canvas drawImage 的九参数源矩形裁剪
            this.parts.push(`<svg x="${svgNumber(dx)}" y="${svgNumber(dy)}" width="${svgNumber(dw)}" height="${svgNumber(dh)}" viewBox="${svgNumber(sx)} ${svgNumber(sy)} ${svgNumber(sw)} ${svgNumber(sh)}" ${attributes.join(" ")}${effects}><use href="${href}"/></svg>`);
            return;
        }
        const [dx, dy, dw, dh] = args;
        this.parts.push(`<svg x="${svgNumber(dx)}" y="${svgNumber(dy)}" width="${svgNumber(dw)}" height="${svgNumber(dh)}" viewBox="0 0 ${svgNumber(width)} ${svgNumber(height)}" ${attributes.join(" ")}${effects}><use href="${href}"/></svg>`);
    }

    createLinearGradient(x0, y0, x1, y1) {
        const gradient = { x0, y0, x1, y1, stops: [] };
        gradient.addColorStop = (offset, color) => { gradient.stops.push({ offset, color }); };
        return gradient;
    }
    measureText(text) { return this.measure(this.state.font, String(text ?? "")); }

    /** 把一次绘制翻译成 SVG 文档（`defs` 里的内容由绘制过程惰性收集，最后统一放到文档头部） */
    toSvg(options = {}) {
        while (this.frames.length > 1) this.restore();
        const title = String(options.title || "");
        const desc = String(options.desc || "");
        const blocks = [];
        if (title) blocks.push(`<title>${escapeXml(title)}</title>`);
        if (desc) blocks.push(`<desc>${escapeXml(desc)}</desc>`);
        if (this.defs.length) blocks.push(`<defs>${this.defs.join("")}</defs>`);
        blocks.push(...this.parts);
        const header = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${svgNumber(this.width)}" height="${svgNumber(this.height)}" viewBox="0 0 ${svgNumber(this.width)} ${svgNumber(this.height)}">`;
        return [header, ...blocks, "</svg>", ""].join("\n");
    }

    /** 颜色串/渐变 -> `fill="..."` / `stroke="..."`（渐变写入 defs 并引用） */
    paintAttributes(property, paint) {
        const attributes = [`${property}="${escapeXml(paint.color)}"`];
        if (paint.opacity < 1) attributes.push(`${property}-opacity="${svgNumber(paint.opacity)}"`);
        return attributes.join(" ");
    }
    resolvePaint(value) {
        const alpha = Number(this.state.globalAlpha);
        const safeAlpha = Number.isFinite(alpha) ? alpha : 1;
        if (value && typeof value === "object" && Array.isArray(value.stops)) {
            const id = `grad${++this.counter}`;
            const stops = value.stops.map(stop => {
                const color = parseColor(stop.color);
                const opacity = color.opacity < 1 ? ` stop-opacity="${svgNumber(color.opacity)}"` : "";
                return `<stop offset="${svgNumber(stop.offset)}" stop-color="${escapeXml(color.color)}"${opacity}/>`;
            }).join("");
            this.defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${svgNumber(value.x0)}" y1="${svgNumber(value.y0)}" x2="${svgNumber(value.x1)}" y2="${svgNumber(value.y1)}">${stops}</linearGradient>`);
            return { color: `url(#${id})`, opacity: safeAlpha };
        }
        const color = parseColor(value);
        return { color: color.color, opacity: color.opacity * safeAlpha };
    }
    /** canvas 的 `filter`（灰度）+ `shadowBlur`（阴影）-> SVG 滤镜引用（同一种组合只注册一次） */
    effectAttributes() {
        const gray = /grayscale/.test(String(this.state.filter || ""));
        const shadow = Number(this.state.shadowBlur) > 0 && Boolean(this.state.shadowColor);
        if (!gray && !shadow) return "";
        const key = `${gray ? "g" : ""}${shadow ? `s${svgNumber(this.state.shadowBlur)}${this.state.shadowColor}` : ""}`;
        let id = this.filters.get(key);
        if (!id) {
            id = `fx${++this.counter}`;
            const primitives = [];
            if (gray) primitives.push(`<feColorMatrix type="saturate" values="0"/>`);
            if (shadow) {
                const color = parseColor(this.state.shadowColor);
                const deviation = Math.max(0.01, Number(this.state.shadowBlur) / 2);
                primitives.push(`<feDropShadow dx="0" dy="0" stdDeviation="${svgNumber(deviation)}" flood-color="${escapeXml(color.color)}" flood-opacity="${svgNumber(color.opacity)}"/>`);
            }
            this.defs.push(`<filter id="${id}" x="-25%" y="-25%" width="150%" height="150%">${primitives.join("")}</filter>`);
            this.filters.set(key, id);
        }
        return ` filter="url(#${id})"`;
    }
    /** 同一张图只内嵌一次 base64，后续都走 `<use>` */
    imageRef(image, source, width, height) {
        let id = this.assets.get(image);
        if (id) return `#${id}`;
        id = `img${++this.counter}`;
        this.defs.push(`<image id="${id}" x="0" y="0" width="${svgNumber(width)}" height="${svgNumber(height)}" preserveAspectRatio="none" href="${escapeXml(source.href)}"/>`);
        this.assets.set(image, id);
        return `#${id}`;
    }
    /**
     * 文字：`strokeText` + `fillText` 落在同一处时**合并成一个 `<text>`**（`paint-order="stroke"`），
     * 否则玩家在 Inkscape 里改字要改两处（描边那层不会跟着变）。
     */
    emitText(text, x, y, mode) {
        const value = String(text ?? "");
        const last = this.lastText;
        const index = this.parts.length - 1;
        if (last && last.index === index && last.value === value && last.x === x && last.y === y && !last.modes.has(mode)) {
            last.modes.add(mode);
            last[mode] = this.textPaint(mode);
            this.parts[index] = this.renderTextElement(last);
            return;
        }
        const record = {
            index: this.parts.length,
            value, x, y,
            modes: new Set([mode]),
            fill: null,
            stroke: null,
            font: parseFont(this.state.font),
            align: this.state.textAlign,
            baseline: this.state.textBaseline,
            opacity: Number(this.state.globalAlpha),
        };
        record[mode] = this.textPaint(mode);
        this.parts.push(this.renderTextElement(record));
        this.lastText = record;
    }
    textPaint(mode) {
        return {
            paint: this.resolvePaint(mode === "fill" ? this.state.fillStyle : this.state.strokeStyle),
            width: Number(this.state.lineWidth),
            join: this.state.lineJoin,
            cap: this.state.lineCap,
            filter: /grayscale/.test(String(this.state.filter || "")),
        };
    }
    renderTextElement(record) {
        const attributes = [
            `x="${svgNumber(record.x)}"`,
            `y="${svgNumber(record.y)}"`,
            `font-family="${escapeXml(record.font.family)}"`,
            `font-size="${svgNumber(record.font.size)}"`,
        ];
        if (record.font.weight !== "normal") attributes.push(`font-weight="${escapeXml(record.font.weight)}"`);
        if (record.font.style !== "normal") attributes.push(`font-style="${escapeXml(record.font.style)}"`);
        const anchor = TEXT_ANCHOR[record.align];
        if (anchor && anchor !== "start") attributes.push(`text-anchor="${anchor}"`);
        const baseline = TEXT_BASELINE[record.baseline];
        if (baseline) attributes.push(`dominant-baseline="${baseline}"`);
        if (Number(record.opacity) < 1) attributes.push(`opacity="${svgNumber(record.opacity)}"`);
        if (record.fill && record.stroke) {
            attributes.push(
                this.paintAttributes("fill", record.fill.paint),
                this.paintAttributes("stroke", record.stroke.paint),
                `stroke-width="${svgNumber(record.stroke.width)}"`,
                `stroke-linejoin="${escapeXml(record.stroke.join || "round")}"`,
                `paint-order="stroke"`,
            );
            if (record.stroke.cap && record.stroke.cap !== "butt") attributes.push(`stroke-linecap="${escapeXml(record.stroke.cap)}"`);
        } else if (record.fill) {
            attributes.push(this.paintAttributes("fill", record.fill.paint));
        } else if (record.stroke) {
            attributes.push(
                `fill="none"`,
                this.paintAttributes("stroke", record.stroke.paint),
                `stroke-width="${svgNumber(record.stroke.width)}"`,
                `stroke-linejoin="${escapeXml(record.stroke.join || "round")}"`,
            );
            if (record.stroke.cap && record.stroke.cap !== "butt") attributes.push(`stroke-linecap="${escapeXml(record.stroke.cap)}"`);
        }
        return `<text ${attributes.join(" ")}>${escapeXml(record.value)}</text>`;
    }
}

//状态属性按清单批量定义：CanvasSurface 一对一转发给 ctx，SvgSurface 写进自己的 state
for (const property of SURFACE_PROPERTIES) {
    Object.defineProperty(CanvasSurface.prototype, property, {
        get() { return this.ctx[property]; },
        set(value) { this.ctx[property] = value; },
        enumerable: true,
        configurable: true,
    });
    Object.defineProperty(SvgSurface.prototype, property, {
        get() { return this.state[property]; },
        set(value) { this.state[property] = value; },
        enumerable: true,
        configurable: true,
    });
}
