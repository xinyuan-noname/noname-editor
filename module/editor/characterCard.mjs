/**
 * 「一键转化为武将卡」：把武将编辑器当前草稿画成一张实体武将牌（新版UI样式）并预览导出。
 *
 * 分工：
 * - 本模块负责**收集数据 + 画卡面 + 浮层交互 + 导出**，不落盘到扩展目录、不联网、不改草稿。
 * - 编辑器组件（component.mjs）只负责把菜单项接进来：`openCharacterCardPreview(this)`。
 * - **绘制后端在 `cardSurface.mjs`**：`CanvasSurface`（位图）/ `SvgSurface`（矢量），本文件的绘制函数
 *   一律面向那个接口 —— 一份版式实现，同时产出 PNG / JPG / SVG，改版式只改一处、两版不会走样。
 *
 * 宿主要求（`host` = `<character-editor>` 组件实例，只用到下面这些成员）：
 * - `host.shadowRoot`                 —— 浮层挂载点（挂在编辑器自己的 shadowRoot 里，样式同源）
 * - `host.getData(type)`              —— 读草稿字段
 * - `host.textQuery(mode, query)`     —— 翻译查询（getTranslation / skillTranslation）
 * - `host.fileQuery(mode, query)`     —— readBinaryFile（读扩展素材 / 引擎素材）
 * - `host.workspace`                  —— 当前工作区（扩展名），自建势力图标在它下面找
 * - `host.configQuery(mode, query)`   —— 记住上次选的导出格式（`x19D6_editor.settings.cardExportFormat`）
 * - `host.avatarReference` / `host.storedAvatarReference` / `host.toExtReference()` / `host.referenceRelative()` / `host.referenceUrl()`
 *                                     —— 立绘引用的既有归一化链路（与编辑器其它地方同一套）
 *
 * 三个关键取舍：
 * 1. **图片一律先读成二进制 → blob URL**：立绘/图标若是 file:// 地址，画进 canvas 会污染画布，
 *    之后 `toDataURL`/`toBlob` 直接抛 SecurityError（导出就废了）；同一份字节也正好给 SVG 做 base64 内嵌。
 * 2. 卡面**程序化绘制**（不依赖任何卡框素材图），但**图标一律复用编辑器/引擎已有的图**：
 *    势力图标 `image/card/group_*.png`、体力珠 `theme/style/hp/image/glass1-4.png`、
 *    护甲盾 `image/card/shield.png`、主公 `module/editor/image/icon/zhugong.png`
 *    —— 与武将编辑器「体力&护甲」区、侧栏导航是同一批素材（统一风格）；任一素材缺失就退回自绘/篆书大字。
 * 3. SVG 里**文字是真文本**（不转路径）：玩家能直接改字，代价是本机需装了卡面用的中文字体；
 *    素材以 base64 内嵌，所以 SVG 体积会明显大于 PNG（保存提示里带上体积）。
 */

import {
    CanvasSurface, SvgSurface, bytesToDataURL, defaultResolveImage, formatBytes, parseFont, sniffImageMime,
} from "./cardSurface.mjs";

/** 卡面逻辑尺寸：63×88mm 的实体武将牌比例（88 / 63 ≈ 1.397） */
export const CHARACTER_CARD_SIZE = { width: 400, height: 559 };

/** 导出位图相对逻辑尺寸的放大倍数（2 倍足够清晰，又不会让 toBlob 太慢） */
export const CHARACTER_CARD_SCALE = 2;

/** 各势力配色：[主色, 暗色]；表中没有的势力走 default（群雄灰） */
const GROUP_THEME = {
    wei: ["#33608f", "#0c1a2c"],
    shu: ["#9c3b33", "#2b0f0c"],
    wu: ["#2b7350", "#082117"],
    qun: ["#6d6a63", "#241f19"],
    jin: ["#4a4f8c", "#13152a"],
    shen: ["#b8862d", "#2a1c05"],
    ye: ["#5a4a7a", "#1a1330"],
    devil: ["#7a2b2b", "#220b0b"],
    western: ["#8a5a2b", "#2a1a08"],
    default: ["#6d6a63", "#241f19"],
};

/**
 * 卡面字体族：先试编辑器自带字体与常见中文书写字体，再退到系统字体。
 * ⚠️ shadowRoot 里的 `@font-face` 不保证对 canvas 生效（字体表在文档级解析），
 * 所以字体栈必须带系统兜底——最坏情况是换成黑体，字还在。
 * ⚠️ SVG 里这三个栈会原样写进 `font-family`：本机没装对应字体时由系统回退（这就是「可编辑」的代价）。
 */
const FONT_GROUP_CHAR = '"minifanzhuanshu","FangZhengLiShuJianTi","方正隶书简体","STZhongsong","KaiTi","Microsoft YaHei",serif';
const FONT_TITLE = '"FangZhengZhunYuan","方正准圆","Microsoft YaHei","SimHei",sans-serif';
const FONT_NAME = '"FangZhengLiShuJianTi","方正隶书简体","STLiti","KaiTi","Microsoft YaHei",serif';
const FONT_TEXT = '"Microsoft YaHei","SimHei",sans-serif';

/** 底部技能区面板顶边（逻辑 y）——竖排姓名排到这里为止 */
const PANEL_TOP = 336;

/** 导出格式表：另存对话框的后缀/过滤器、文件名后缀、提示语都从这里取 */
export const EXPORT_FORMATS = {
    png: {
        label: "PNG（位图）",
        ext: "png",
        mime: "image/png",
        hint: "",
        filters: [{ name: "PNG 图片", extensions: ["png"] }],
    },
    jpg: {
        label: "JPG（位图·小体积）",
        ext: "jpg",
        mime: "image/jpeg",
        hint: "JPG：白底位图，无透明通道",
        filters: [{ name: "JPEG 图片", extensions: ["jpg", "jpeg"] }],
    },
    svg: {
        label: "SVG（矢量·可编辑）",
        ext: "svg",
        mime: "image/svg+xml",
        hint: "SVG：矢量卡面，文字可直接编辑；素材以 base64 内嵌",
        filters: [{ name: "SVG 矢量图", extensions: ["svg"] }],
    },
};

/** 默认导出格式 */
export const DEFAULT_EXPORT_FORMAT = "png";

/** 记住上次导出格式的配置键（宿主 configQuery("get"/"write", {member})） */
export const EXPORT_FORMAT_CONFIG = "x19D6_editor.settings.cardExportFormat";

/**
 * 格式名归一（配置里可能是旧值/脏值；认不出来就是 PNG）
 * @param {unknown} value
 * @returns {"png"|"jpg"|"svg"}
 */
export function normalizeFormat(value) {
    return Object.prototype.hasOwnProperty.call(EXPORT_FORMATS, value) ? value : DEFAULT_EXPORT_FORMAT;
}

/** 预览浮层的 DOM 骨架（样式在 style/character-editor.css 的 `.card-preview` 段） */
const PREVIEW_TEMPLATE = `<div class="card-preview">
    <div class="card-title">武将卡预览</div>
    <div class="card-stage"><canvas></canvas></div>
    <div class="card-message"></div>
    <div class="card-toolbar">
        <select class="card-format" title="导出格式">
            <option value="png">PNG（位图）</option>
            <option value="jpg">JPG（位图·小体积）</option>
            <option value="svg">SVG（矢量·可编辑）</option>
        </select>
        <span class="card-copy">复制</span>
        <span class="card-save">下载</span>
        <span class="card-close">关闭</span>
    </div>
</div>`;

/**
 * 加载一张图片（本地 blob URL / data URL）
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
export function loadCardImage(src) {
    return new Promise((resolve, reject) => {
        if (!src) {
            reject(new Error("空图片地址"));
            return;
        }
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`图片加载失败：${src}`));
        img.src = src;
    });
}

/**
 * 技能描述清洗：描述里可能带 HTML 标记（引擎的描述支持 `<br>` 之类）
 * @param {string} text
 * @returns {string}
 */
export function cleanSkillDescription(text) {
    return String(text ?? "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(?:div|p|li)>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&amp;/gi, "&")
        .replace(/[ \t]{2,}/g, " ")
        .trim();
}

/** 圆角矩形路径（不依赖 ctx.roundRect，老 Chromium 也能跑） */
function roundRectPath(surface, x, y, width, height, radius) {
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));
    surface.beginPath();
    surface.moveTo(x + r, y);
    surface.lineTo(x + width - r, y);
    surface.arcTo(x + width, y, x + width, y + r, r);
    surface.lineTo(x + width, y + height - r);
    surface.arcTo(x + width, y + height, x + width - r, y + height, r);
    surface.lineTo(x + r, y + height);
    surface.arcTo(x, y + height, x, y + height - r, r);
    surface.lineTo(x, y + r);
    surface.arcTo(x, y, x + r, y, r);
    surface.closePath();
}

/** 铺满式绘制（cover），多余的部分偏向顶部（人像的脸通常在上半部分） */
function drawCover(surface, img, x, y, width, height, verticalBias = 0.2) {
    const ratio = Math.max(width / img.naturalWidth, height / img.naturalHeight);
    const drawWidth = img.naturalWidth * ratio;
    const drawHeight = img.naturalHeight * ratio;
    surface.drawImage(img, x + (width - drawWidth) / 2, y + (height - drawHeight) * verticalBias, drawWidth, drawHeight);
}

/** 按宽度折行（中文没有词边界，逐字量宽；\n 强制换行） */
function wrapText(surface, text, maxWidth) {
    const lines = [];
    let line = "";
    for (const char of Array.from(String(text ?? ""))) {
        if (char === "\n") {
            lines.push(line);
            line = "";
            continue;
        }
        const next = line + char;
        if (line && surface.measureText(next) > maxWidth) {
            lines.push(line);
            line = char;
        } else {
            line = next;
        }
    }
    lines.push(line);
    return lines;
}

/** 竖排逐字绘制，返回下一个字的 y */
function drawVerticalText(surface, text, x, top, { font, lineHeight, fill, stroke, strokeWidth = 4 }) {
    surface.save();
    surface.font = font;
    surface.textAlign = "center";
    surface.textBaseline = "middle";
    surface.lineJoin = "round";
    let y = top;
    for (const char of Array.from(String(text ?? ""))) {
        if (!char.trim()) {
            y += lineHeight;
            continue;
        }
        if (stroke) {
            surface.lineWidth = strokeWidth;
            surface.strokeStyle = stroke;
            surface.strokeText(char, x, y);
        }
        surface.fillStyle = fill;
        surface.fillText(char, x, y);
        y += lineHeight;
    }
    surface.restore();
    return y;
}

/** 体力 / 护甲 / 主公 的素材图——**与武将编辑器「体力&护甲」区完全同一批图**（统一风格） */
const PIP_ASSETS = {
    healthy: "theme/style/hp/image/glass1.png",
    damaged: "theme/style/hp/image/glass2.png",
    dangerous: "theme/style/hp/image/glass3.png",
    empty: "theme/style/hp/image/glass4.png",
    shield: "image/card/shield.png",
};

/** 技能名底条（引擎里给临时牌名用的米色金角条，正好当技能名徽章底） */
const BADGE_ASSET = "image/card/cardtempname_bg.png";

/**
 * 本模块所在扩展在 app 根下的相对路径（形如 `extension/魂氏编辑器`）——取扩展内素材（主公图标）要用
 * @returns {string} 取不到时返回 ""
 */
function extensionRoot() {
    const matched = /(extension\/[^/]+)\//.exec(String(import.meta.url || "").replace(/\\/g, "/"));
    return matched ? matched[1] : "";
}

/**
 * 体力 / 护甲 / 主公印：**优先用编辑器自己的素材图**（体力珠 glass1-4、护甲盾 shield.png、主公 zhugong.png），
 * 状态规则对齐 `style/character-editor.css`：血量比 >0.5 用 glass1、≤0.5 用 glass2、≤0.25 用 glass3，
 * 空位是 glass4 + `grayscale(100%)` + `opacity:.5`（SVG 里翻译成灰度滤镜 + opacity）；
 * 一张素材都拿不到时整行走自绘兜底（见 `drawDrawnHpPips`）。
 * 布局：**上排 = 主公印 + 体力珠，下排 = 护甲盾**（用户反馈挤在同一行太挤），两排各自右对齐。
 */
function drawHpPips(surface, data, W) {
    const { hp, maxHp, hujia = 0, isZhugong, pips = {} } = data;
    if (!pips.healthy && !pips.damaged && !pips.dangerous && !pips.empty && !pips.shield && !pips.zhugong) {
        drawDrawnHpPips(surface, data, W);
        return;
    }
    const beadSize = 24;
    const shieldSize = 26;
    const gap = 1;
    const top = 14;
    const rowHeight = Math.max(beadSize, shieldSize);
    const beadTop = top + (rowHeight - beadSize) / 2;
    const centerY = top + rowHeight / 2;
    //用户反馈「体力条和护甲挤在同一行」→ 拆两行：上排体力（含主公印），下排护甲，各自右对齐
    const armorTop = top + rowHeight + 6;
    const rightEdge = W - 18;
    let pipRight = rightEdge;
    const armor = Math.max(0, Math.min(8, Number(hujia) || 0));
    const max = Math.max(0, Number(maxHp) || 0);
    const now = Math.max(0, Number(hp) || 0);
    const ratio = max > 0 ? now / max : 1;
    const filledBead = (ratio <= 0.25 && (pips.dangerous || pips.healthy))
        || (ratio <= 0.5 && (pips.damaged || pips.healthy))
        || pips.healthy;

    /** 画一张素材图；dim = 空位（灰度 + 半透明，对齐 CSS 的 `.lost`） */
    const drawAsset = (img, x, y, width, height, dim = false) => {
        surface.save();
        if (dim) {
            surface.filter = "grayscale(100%)";
            surface.globalAlpha = 0.5;
        }
        surface.drawImage(img, x, y, width, height);
        surface.restore();
    };
    /** 素材缺张时的自绘单格 */
    const drawnPip = (x, filled, color = "#c0392b") => {
        roundRectPath(surface, x, beadTop, beadSize, beadSize, 4);
        surface.fillStyle = filled ? color : "rgba(20,18,16,.78)";
        surface.fill();
        surface.strokeStyle = filled ? "rgba(255,235,190,.85)" : "rgba(255,235,190,.5)";
        surface.lineWidth = 1.4;
        surface.stroke();
    };

    surface.save();
    surface.textAlign = "center";
    surface.textBaseline = "middle";

    if (isZhugong) {
        if (pips.zhugong) {
            drawAsset(pips.zhugong, pipRight - beadSize, top, beadSize, rowHeight);
        } else {
            const x = pipRight - beadSize;
            roundRectPath(surface, x, top, beadSize, rowHeight, 4);
            const seal = surface.createLinearGradient(x, top, x + beadSize, top + rowHeight);
            seal.addColorStop(0, "#f6dfa0");
            seal.addColorStop(1, "#b8860b");
            surface.fillStyle = seal;
            surface.fill();
            surface.strokeStyle = "rgba(0,0,0,.65)";
            surface.lineWidth = 1.5;
            surface.stroke();
            surface.fillStyle = "#3a2606";
            surface.font = `bold 14px ${FONT_TEXT}`;
            surface.fillText("主", x + beadSize / 2, centerY + 0.5);
        }
        pipRight -= beadSize + gap;
    }

    // 护甲盾：单独一行（在体力珠下面），同样右对齐
    let armorRight = rightEdge;
    for (let index = 0; index < armor; index++) {
        const x = armorRight - shieldSize;
        if (pips.shield) drawAsset(pips.shield, x, armorTop, shieldSize, shieldSize);
        else {
            roundRectPath(surface, x, armorTop + 2, beadSize, beadSize, 4);
            surface.fillStyle = "#2f7f9e";
            surface.fill();
            surface.strokeStyle = "rgba(190,240,255,.85)";
            surface.lineWidth = 1.4;
            surface.stroke();
        }
        armorRight -= shieldSize + gap;
    }

    if (max > 9) {
        //体力上限 >9：一颗「X」珠 + 数字（引擎同款写法）
        const x = pipRight - beadSize;
        if (filledBead) drawAsset(filledBead, x, beadTop, beadSize, beadSize);
        else drawnPip(x, now > 9);
        surface.lineWidth = 3;
        surface.strokeStyle = "rgba(0,0,0,.85)";
        surface.font = `bold 14px ${FONT_TEXT}`;
        surface.strokeText("X", x + beadSize / 2, centerY + 0.5);
        surface.fillStyle = "#fff";
        surface.fillText("X", x + beadSize / 2, centerY + 0.5);
        surface.fillStyle = "#ffe9b0";
        surface.font = `bold 20px ${FONT_TEXT}`;
        surface.textAlign = "right";
        surface.fillText(String(Math.min(now, 99)), x - gap - 1, centerY + 1);
    } else {
        for (let index = 0; index < max; index++) {
            const x = pipRight - (max - index) * beadSize - (max - 1 - index) * gap;
            const filled = index < now;
            if (filled) {
                if (filledBead) drawAsset(filledBead, x, beadTop, beadSize, beadSize);
                else drawnPip(x, true);
            } else if (pips.empty) {
                drawAsset(pips.empty, x, beadTop, beadSize, beadSize, true);
            } else {
                drawnPip(x, false);
            }
        }
    }
    surface.restore();
}

/** 体力格 / 护甲格 / 主公印（**没有素材图时的自绘兜底**；体力 > 9 时用引擎那种「X + 数字」写法） */
function drawDrawnHpPips(surface, data, W) {
    const { hp, maxHp, hujia = 0, isZhugong } = data;
    const size = 19;
    const gap = 3;
    const top = 16;
    let right = W - 20;
    const armor = Math.max(0, Math.min(6, Number(hujia) || 0));

    surface.save();
    surface.textAlign = "center";
    surface.textBaseline = "middle";

    if (isZhugong) {
        const x = right - size;
        roundRectPath(surface, x, top, size, size, 4);
        const seal = surface.createLinearGradient(x, top, x + size, top + size);
        seal.addColorStop(0, "#f6dfa0");
        seal.addColorStop(1, "#b8860b");
        surface.fillStyle = seal;
        surface.fill();
        surface.strokeStyle = "rgba(0,0,0,.65)";
        surface.lineWidth = 1.5;
        surface.stroke();
        surface.fillStyle = "#3a2606";
        surface.font = `bold 14px ${FONT_TEXT}`;
        surface.fillText("主", x + size / 2, top + size / 2 + 0.5);
        right = x - gap;
    }

    const pip = (x, filled, color) => {
        roundRectPath(surface, x, top, size, size, 4);
        surface.fillStyle = filled ? color : "rgba(20,18,16,.78)";
        surface.fill();
        surface.strokeStyle = filled ? "rgba(255,235,190,.85)" : "rgba(255,235,190,.5)";
        surface.lineWidth = 1.4;
        surface.stroke();
    };

    // 护甲（青色）画在体力格左边：它是「额外的血」
    for (let index = 0; index < armor; index++) {
        const x = right - size;
        roundRectPath(surface, x, top, size, size, 4);
        surface.fillStyle = "#2f7f9e";
        surface.fill();
        surface.strokeStyle = "rgba(190,240,255,.85)";
        surface.lineWidth = 1.4;
        surface.stroke();
        right = x - gap;
    }

    const max = Math.max(0, Number(maxHp) || 0);
    const now = Math.max(0, Number(hp) || 0);
    if (max > 9) {
        const x = right - size;
        pip(x, now > 9, "#c0392b");
        surface.fillStyle = "#fff";
        surface.font = `bold 13px ${FONT_TEXT}`;
        surface.fillText("X", x + size / 2, top + size / 2 + 0.5);
        surface.fillStyle = "#ffe9b0";
        surface.font = `bold 20px ${FONT_TEXT}`;
        surface.textAlign = "right";
        surface.fillText(String(Math.min(now, 99)), x - gap, top + size / 2 + 1);
        surface.restore();
        return;
    }
    for (let index = 0; index < max; index++) {
        const x = right - (max - index) * size - (max - 1 - index) * gap;
        pip(x, index < now, "#c0392b");
    }
    surface.restore();
}

/**
 * 技能名徽章：**底条用引擎的 `image/card/cardtempname_bg.png`**（九宫格拉伸，保住两端金角），
 * 拿不到图就退化成自绘的米色渐变条；技能名用深色字打在上面。
 * @param {HTMLImageElement|null} badge
 */
function drawSkillBadge(surface, x, y, width, height, name, badge) {
    if (badge) {
        const sourceWidth = badge.naturalWidth || badge.width;
        const sourceHeight = badge.naturalHeight || badge.height;
        const capSource = Math.max(1, Math.min(Math.round(sourceWidth * 0.12), Math.round(sourceWidth / 3)));
        const capWidth = Math.min(capSource * (width / sourceWidth), width / 2);
        const middleWidth = Math.max(0, width - capWidth * 2);
        surface.drawImage(badge, 0, 0, capSource, sourceHeight, x, y, capWidth, height);
        surface.drawImage(badge, capSource, 0, Math.max(1, sourceWidth - capSource * 2), sourceHeight, x + capWidth, y, middleWidth, height);
        surface.drawImage(badge, sourceWidth - capSource, 0, capSource, sourceHeight, x + width - capWidth, y, capWidth, height);
    } else {
        roundRectPath(surface, x, y, width, height, 5);
        const gradient = surface.createLinearGradient(x, y, x, y + height);
        gradient.addColorStop(0, "#efe9d8");
        gradient.addColorStop(1, "#cdc4ab");
        surface.fillStyle = gradient;
        surface.fill();
        surface.strokeStyle = "rgba(20,30,50,.85)";
        surface.lineWidth = 1.4;
        surface.stroke();
    }
    //技能名：太长先缩字号，再长就省略号（别撑出底条）
    const maxTextWidth = width - 12;
    let fontSize = 15;
    surface.font = `bold ${fontSize}px ${FONT_TEXT}`;
    while (fontSize > 10 && surface.measureText(name) > maxTextWidth) {
        fontSize -= 1;
        surface.font = `bold ${fontSize}px ${FONT_TEXT}`;
    }
    let text = name;
    if (surface.measureText(text) > maxTextWidth) {
        while (text.length > 1 && surface.measureText(`${text}…`) > maxTextWidth) text = text.slice(0, -1);
        text = `${text}…`;
    }
    surface.fillStyle = "#1d2735";
    surface.textAlign = "center";
    surface.textBaseline = "middle";
    surface.fillText(text, x + width / 2, y + height / 2 + 1);
    surface.textAlign = "left";
    surface.textBaseline = "top";
}

/**
 * 底部技能区：**技能名在左侧徽章里、描述在右侧且首行与徽章对齐**（对齐官方武将牌版式；
 * 用户反馈「技能名位置不对」就是原来把技能名单独占了一行）。超出面板就截断。
 */
function drawSkillPanel(surface, data, W, H) {
    const left = 13;
    const right = W - 13;
    const bottom = H - 13;
    roundRectPath(surface, left, PANEL_TOP, right - left, bottom - PANEL_TOP, 10);
    surface.fillStyle = "rgba(8,10,14,.8)";
    surface.fill();
    surface.strokeStyle = "rgba(240,208,137,.55)";
    surface.lineWidth = 1.2;
    surface.stroke();

    const paddingX = 14;
    const idText = String(data.id || "").trim();
    const idBottom = idText ? bottom - 20 : bottom;
    const badgeHeight = 26;
    const badgeGap = 10;

    surface.save();
    surface.beginPath();
    surface.rect(left, PANEL_TOP, right - left, idBottom - PANEL_TOP);
    surface.clip();
    surface.textAlign = "left";
    surface.textBaseline = "top";

    const skills = Array.isArray(data.skills) ? data.skills : [];
    const drawList = skills.length ? skills : [{ name: "无技能", description: "" }];
    //徽章统一宽度：所有技能名的底条一样宽，描述的左边缘才会对齐
    surface.font = `bold 15px ${FONT_TEXT}`;
    const badgeWidth = Math.min(104, Math.max(64, ...drawList.map(skill => surface.measureText(String(skill.name || "")) + 24)));
    const textLeft = left + paddingX + badgeWidth + badgeGap;
    const textWidth = right - paddingX - textLeft;

    let y = PANEL_TOP + 14;
    let truncated = false;
    for (const skill of drawList) {
        if (y > idBottom - badgeHeight) {
            truncated = true;
            break;
        }
        drawSkillBadge(surface, left + paddingX, y, badgeWidth, badgeHeight, String(skill.name || ""), data.badge);
        const description = cleanSkillDescription(skill.description);
        let textY = y + 4;
        if (description) {
            surface.fillStyle = "rgba(238,238,238,.92)";
            surface.font = `13px ${FONT_TEXT}`;
            for (const line of wrapText(surface, description, textWidth)) {
                if (textY > idBottom - 15) {
                    truncated = true;
                    break;
                }
                surface.fillText(line, textLeft, textY);
                textY += 18;
            }
        }
        y = Math.max(y + badgeHeight, textY + 2) + 8;
    }
    if (truncated) {
        //描述被面板裁掉时给个明确提示（右对齐，别越出面板）
        surface.fillStyle = "rgba(240,208,137,.9)";
        surface.font = `14px ${FONT_TEXT}`;
        surface.textAlign = "right";
        surface.textBaseline = "alphabetic";
        surface.fillText("……", right - paddingX, idBottom - 6);
    }
    surface.restore();

    if (idText) {
        surface.fillStyle = "rgba(255,255,255,.6)";
        surface.font = `11px ${FONT_TEXT}`;
        surface.textAlign = "center";
        surface.textBaseline = "alphabetic";
        surface.fillText(idText, W / 2, bottom - 7);
    }
}

/** 卡框（金属渐变描边 + 四角装饰） */
function drawFrame(surface, W, H) {
    const radius = 14;
    roundRectPath(surface, 1.5, 1.5, W - 3, H - 3, radius);
    surface.strokeStyle = "rgba(0,0,0,.85)";
    surface.lineWidth = 3;
    surface.stroke();

    const gradient = surface.createLinearGradient(0, 0, W, H);
    gradient.addColorStop(0, "#f7e7bb");
    gradient.addColorStop(0.35, "#c9a227");
    gradient.addColorStop(0.6, "#f4e3b2");
    gradient.addColorStop(1, "#9c7415");
    roundRectPath(surface, 3.5, 3.5, W - 7, H - 7, radius - 1);
    surface.strokeStyle = gradient;
    surface.lineWidth = 4;
    surface.stroke();

    roundRectPath(surface, 8, 8, W - 16, H - 16, radius - 4);
    surface.strokeStyle = "rgba(255,236,190,.35)";
    surface.lineWidth = 1;
    surface.stroke();

    const arm = 26;
    const inset = 10;
    surface.save();
    surface.strokeStyle = "rgba(247,231,187,.9)";
    surface.lineWidth = 3;
    surface.lineCap = "round";
    const corners = [
        [inset, inset, 1, 1],
        [W - inset, inset, -1, 1],
        [inset, H - inset, 1, -1],
        [W - inset, H - inset, -1, -1],
    ];
    for (const [x, y, sx, sy] of corners) {
        surface.beginPath();
        surface.moveTo(x, y + arm * sy);
        surface.lineTo(x, y);
        surface.lineTo(x + arm * sx, y);
        surface.stroke();
    }
    surface.restore();
}

/** 卡头：**只用势力图片**（用户明确「删除多余的势力字，仅保留图片」）；没有图才退回篆书势力大字 */
function drawEmblem(surface, data) {
    const { groupIcon, groupName, group } = data;
    if (groupIcon) {
        const size = 54;
        surface.save();
        surface.shadowColor = "rgba(0,0,0,.8)";
        surface.shadowBlur = 8;
        surface.drawImage(groupIcon, 20, 12, size, size);
        surface.restore();
        return;
    }
    const name = String(groupName || group || "").trim();
    if (!name) return;
    surface.save();
    surface.font = `46px ${FONT_GROUP_CHAR}`;
    surface.textAlign = "center";
    surface.textBaseline = "middle";
    surface.lineJoin = "round";
    surface.lineWidth = 5;
    surface.strokeStyle = "rgba(0,0,0,.85)";
    surface.strokeText(name, 48, 42);
    surface.fillStyle = "#ffe9b0";
    surface.fillText(name, 48, 42);
    surface.restore();
}

/** 左侧竖排：称号（小字金）+ 姓名（大字白描黑边） */
function drawNameColumn(surface, data) {
    const title = String(data.title || "").trim();
    const name = String(data.name || "").trim();
    const x = 32;
    let y = 118;
    if (title) {
        y = drawVerticalText(surface, title, x, y, {
            font: `18px ${FONT_TITLE}`,
            lineHeight: 22,
            fill: "#f0d089",
            stroke: "rgba(0,0,0,.8)",
            strokeWidth: 3,
        });
        y += 14;
    }
    if (!name) return;
    drawVerticalText(surface, name, x, y, {
        font: `bold 38px ${FONT_NAME}`,
        lineHeight: 42,
        fill: "#ffffff",
        stroke: "rgba(0,0,0,.85)",
        strokeWidth: 5,
    });
}

/**
 * 把数据画到任意绘制后端上——**这是唯一的版式实现**（canvas 与 SVG 都走这里）。
 * 图层顺序与分组 id：card-base / art / scrim / name-column / hp-pips / emblem / skill-panel / frame。
 * @param {CanvasSurface|SvgSurface} surface
 * @param {object} data
 * @param {number} W
 * @param {number} H
 */
export function paintCharacterCard(surface, data, W, H) {
    const theme = GROUP_THEME[String(data.group || "").toLowerCase()] || GROUP_THEME.default;

    // 1. 卡底：势力配色渐变
    surface.section("card-base", () => {
        roundRectPath(surface, 0, 0, W, H, 14);
        const base = surface.createLinearGradient(0, 0, W * 0.6, H);
        base.addColorStop(0, theme[0]);
        base.addColorStop(1, theme[1]);
        surface.fillStyle = base;
        surface.fill();
    });

    // 2~3 都在卡底圆角裁剪内：立绘 + 压暗层（亮立绘下也要读得清字）
    surface.save();
    roundRectPath(surface, 0, 0, W, H, 14);
    surface.clip();

    surface.section("art", () => {
        if (data.art) {
            //立绘 cover 铺满；没有立绘就用势力色斜纹 + 放大的势力图标做水印，避免卡面空成一块
            drawCover(surface, data.art, 0, 0, W, H);
            return;
        }
        surface.save();
        surface.globalAlpha = 0.28;
        surface.strokeStyle = "rgba(255,255,255,.35)";
        surface.lineWidth = 1;
        for (let x = -H; x < W; x += 16) {
            surface.beginPath();
            surface.moveTo(x, 0);
            surface.lineTo(x + H, H);
            surface.stroke();
        }
        surface.restore();
        if (data.groupIcon) {
            const size = 260;
            surface.save();
            surface.globalAlpha = 0.14;
            surface.drawImage(data.groupIcon, (W - size) / 2, (H - size) / 2 - 20, size, size);
            surface.restore();
        }
    });

    surface.section("scrim", () => {
        const topScrim = surface.createLinearGradient(0, 0, 0, 120);
        topScrim.addColorStop(0, "rgba(0,0,0,.62)");
        topScrim.addColorStop(1, "rgba(0,0,0,0)");
        surface.fillStyle = topScrim;
        surface.fillRect(0, 0, W, 120);

        const leftScrim = surface.createLinearGradient(0, 0, 130, 0);
        leftScrim.addColorStop(0, "rgba(0,0,0,.55)");
        leftScrim.addColorStop(1, "rgba(0,0,0,0)");
        surface.fillStyle = leftScrim;
        surface.fillRect(0, 0, 130, H);

        const bottomScrim = surface.createLinearGradient(0, PANEL_TOP - 80, 0, PANEL_TOP + 10);
        bottomScrim.addColorStop(0, "rgba(0,0,0,0)");
        bottomScrim.addColorStop(1, "rgba(0,0,0,.55)");
        surface.fillStyle = bottomScrim;
        surface.fillRect(0, PANEL_TOP - 80, W, 90);
    });

    surface.restore();

    // 4. 卡面内容
    surface.section("name-column", () => drawNameColumn(surface, data));
    surface.section("hp-pips", () => drawHpPips(surface, data, W));
    surface.section("emblem", () => drawEmblem(surface, data));
    surface.section("skill-panel", () => drawSkillPanel(surface, data, W, H));
    surface.section("frame", () => drawFrame(surface, W, H));
}

/**
 * 把武将数据画成一张武将卡（位图后端）
 * @param {HTMLCanvasElement} canvas
 * @param {{
 *   id?:string, name?:string, title?:string, group?:string, groupName?:string,
 *   hp?:number, maxHp?:number, hujia?:number, isZhugong?:boolean,
 *   skills?:{name:string,description:string}[],
 *   art?:HTMLImageElement|null, groupIcon?:HTMLImageElement|null,
 *   pips?:Record<string,HTMLImageElement>, badge?:HTMLImageElement|null
 * }} data
 * @param {{scale?:number}} [config]
 * @returns {HTMLCanvasElement}
 */
export function renderCharacterCard(canvas, data, config = {}) {
    const { width: W, height: H } = CHARACTER_CARD_SIZE;
    const scale = config.scale || CHARACTER_CARD_SCALE;
    canvas.width = Math.round(W * scale);
    canvas.height = Math.round(H * scale);
    const surface = new CanvasSurface(canvas.getContext("2d"), { scale, width: W, height: H });
    paintCharacterCard(surface, data, W, H);
    return canvas;
}

/**
 * 文字量宽器：canvas 的 `measureText`（折行/缩字号/省略号都靠它，两个后端必须用同一个，
 * 否则 SVG 的断行与 PNG 不一致）。
 */
function createCanvasMeasurer() {
    if (typeof document === "undefined") {
        //Node（自检环境）没有 canvas：用等宽粗估，保证不抛错
        return (font, text) => String(text ?? "").length * parseFont(font).size;
    }
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    return (font, text) => {
        ctx.font = font;
        return ctx.measureText(String(text ?? "")).width;
    };
}

/**
 * 把卡片素材映射成 SVG 可用的内嵌地址（base64 data URI）。
 * `data.assetData` 是 `Map<HTMLImageElement, {bytes, mime}>`（由素材加载时登记）；
 * 没有字节时退回图片自身地址（只对 `data:` 有效）。
 */
export function createAssetResolver(data) {
    const records = data && data.assetData instanceof Map ? data.assetData : null;
    const cache = new Map();
    return img => {
        if (cache.has(img)) return cache.get(img);
        const record = records ? records.get(img) : null;
        let source = null;
        if (record && record.bytes && record.bytes.length) {
            source = {
                href: bytesToDataURL(record.bytes, record.mime || "image/png"),
                width: img.naturalWidth || img.width || 0,
                height: img.naturalHeight || img.height || 0,
            };
        } else {
            source = defaultResolveImage(img);
        }
        cache.set(img, source);
        return source;
    };
}

/**
 * 把武将数据画成 SVG 矢量卡面（文字是可选可改的真 `<text>`，素材 base64 内嵌，按图层分组）
 * @param {object} data 同 `renderCharacterCard`
 * @param {{measure?:Function, resolveImage?:Function}} [config]
 * @returns {string} SVG 文本
 */
export function renderCharacterCardSvg(data, config = {}) {
    const { width: W, height: H } = CHARACTER_CARD_SIZE;
    const surface = new SvgSurface({
        width: W,
        height: H,
        measure: config.measure || createCanvasMeasurer(),
        resolveImage: config.resolveImage || createAssetResolver(data),
    });
    paintCharacterCard(surface, data, W, H);
    const name = [data.name, data.id ? `(${data.id})` : ""].filter(Boolean).join("");
    return surface.toSvg({
        title: ["武将卡", name].filter(Boolean).join(" · "),
        desc: "由魂氏编辑器生成：文字为可编辑文本，立绘等素材以 base64 内嵌。",
    });
}

/** 导出 PNG Blob（失败时 reject，调用方负责提示） */
export function canvasToPngBlob(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            blob ? resolve(blob) : reject(new Error("画布导出失败（toBlob 返回 null）"));
        }, "image/png");
    });
}

/** 新建一块临时画布（JPG 白底用；自检时注入假工厂） */
function defaultCanvasFactory() {
    return document.createElement("canvas");
}

/**
 * JPG 没有透明通道：**先铺白底再画一遍**，否则圆角外会被 Chromium 画成黑块。
 * @param {HTMLCanvasElement} source
 * @param {() => HTMLCanvasElement} [factory]
 * @returns {HTMLCanvasElement}
 */
export function flattenForJpeg(source, factory = defaultCanvasFactory) {
    const canvas = factory();
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0);
    return canvas;
}

/** 导出 JPG Blob（白底 + 有损质量） */
export function canvasToJpegBlob(canvas, quality = 0.92, factory = defaultCanvasFactory) {
    const opaque = flattenForJpeg(canvas, factory);
    return new Promise((resolve, reject) => {
        opaque.toBlob(blob => {
            blob ? resolve(blob) : reject(new Error("JPG 导出失败（toBlob 返回 null）"));
        }, "image/jpeg", quality);
    });
}

/**
 * 按当前格式产出导出 Blob（SVG 是文本，其余是位图）
 * @param {"png"|"jpg"|"svg"} format
 * @param {HTMLCanvasElement} canvas
 * @param {() => string|Promise<string>} buildSvg
 * @returns {Promise<Blob>}
 */
export async function createExportBlob(format, canvas, buildSvg) {
    const normalized = normalizeFormat(format);
    if (normalized === "svg") {
        const text = await buildSvg();
        //charset 不写进 Blob 类型：字节由 Blob 按 UTF-8 编码，文件里也有 XML 声明
        return new Blob([text], { type: "image/svg+xml" });
    }
    if (normalized === "jpg") return canvasToJpegBlob(canvas);
    return canvasToPngBlob(canvas);
}

/**
 * 读一张素材：bytes（SVG 内嵌用）+ 图片元素（canvas 绘制用）。
 * 同一个 `assetData` Map 会把图片元素与原始字节关联起来。
 * @param {object} host
 * @param {string} path 如 `image/card/group_wei.png` / `extension/<扩展>/image/group/x.png`
 * @param {string[]} objectURLs
 * @param {Map<HTMLImageElement, {bytes:Uint8Array, mime:string}>} assetData
 * @returns {Promise<{img:HTMLImageElement, bytes:Uint8Array, mime:string}|null>}
 */
async function readAsset(host, path, objectURLs, assetData) {
    try {
        const data = await host.fileQuery("readBinaryFile", { path });
        if (!data || !data.length) return null;
        const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
        const url = URL.createObjectURL(new Blob([bytes]));
        objectURLs.push(url);
        const img = await loadCardImage(url);
        const mime = sniffImageMime(bytes, path);
        assetData.set(img, { bytes, mime });
        return { img, bytes, mime };
    } catch (err) {
        //引擎 readFile 对不存在的文件会 reject：这里属于正常分支（图标可能没有）
        return null;
    }
}

/**
 * 立绘：**优先「读磁盘 → blob URL」**（file:// 图片画进 canvas 会污染画布，
 * 导出时 toDataURL/toBlob 直接抛 SecurityError），读不到磁盘再退回地址加载。
 * @returns {Promise<HTMLImageElement|null>}
 */
async function loadArtImage(host, objectURLs, assetData) {
    const reference = host.avatarReference
        || host.storedAvatarReference
        || host.toExtReference(host.getData("avatar"))
        || host.getData("avatar")
        || "";
    const relative = host.referenceRelative(reference);
    if (relative) {
        const asset = await readAsset(host, `extension/${relative}`, objectURLs, assetData);
        if (asset) return asset.img;
    }
    const direct = host.referenceUrl(reference);
    if (!direct) return null;
    try {
        return await loadCardImage(direct);
    } catch (err) {
        console.warn("武将卡：立绘地址加载失败", direct, err);
        return null;
    }
}

/** 势力图标：先找引擎自带的 `image/card/group_<势力>.png`，再找自建势力在扩展里的图标 */
async function loadGroupIcon(host, group, objectURLs, assetData) {
    const id = String(group || "").trim();
    if (!id) return null;
    const candidates = [`image/card/group_${id}.png`];
    if (host.workspace) candidates.push(`extension/${host.workspace}/image/group/${id}.png`);
    for (const candidate of candidates) {
        const asset = await readAsset(host, candidate, objectURLs, assetData);
        if (asset) return asset.img;
    }
    return null;
}

/**
 * 收集卡面数据（全部现读草稿，不写回、不改草稿）
 * @param {object} host
 * @param {string[]} objectURLs
 * @param {Map<HTMLImageElement, {bytes:Uint8Array, mime:string}>} assetData
 */
async function collectCardData(host, objectURLs, assetData) {
    const id = String(host.getData("id") || "");
    const name = String(host.getData("name") || id || "未命名武将");
    const title = String(host.getData("title") || "");
    const doubleGroup = host.getData("doubleGroup") || [];
    const group = String((doubleGroup.length && doubleGroup[0]) || host.getData("group") || "");
    const groupName = group ? (host.textQuery("getTranslation", { text: group }) || group) : "";
    const hp = Number(host.getData("hp")) || 0;
    const maxHp = Number(host.getData("maxHp")) || hp;
    const skills = (host.getData("skills") || []).map(skillId => ({
        name: host.textQuery("skillTranslation", { text: skillId, attr: "name" }) || skillId,
        description: host.textQuery("skillTranslation", { text: skillId, attr: "info" }) || "",
    }));
    const [art, groupIcon, assets] = await Promise.all([
        loadArtImage(host, objectURLs, assetData),
        loadGroupIcon(host, group, objectURLs, assetData),
        loadCardAssets(host, objectURLs, assetData),
    ]);
    return {
        id, name, title, group, groupName,
        hp, maxHp,
        hujia: Number(host.getData("hujia")) || 0,
        isZhugong: Boolean(host.getData("isZhugong")),
        skills, art, groupIcon,
        pips: assets.pips,
        badge: assets.badge,
        assetData,
    };
}

/**
 * 卡面素材图：体力/护甲/主公（`PIP_ASSETS` + 扩展里的主公图标）+ 技能名底条（`BADGE_ASSET`）。
 * 缺哪张就少哪张：绘制端逐格/逐条回退到自绘，不会因为少一张图就整块消失。
 * @returns {Promise<{pips:Record<string, HTMLImageElement>, badge:HTMLImageElement|null}>}
 */
async function loadCardAssets(host, objectURLs, assetData) {
    const pips = {};
    const load = async (path) => {
        const asset = await readAsset(host, path, objectURLs, assetData);
        return asset ? asset.img : null;
    };
    await Promise.all(Object.entries(PIP_ASSETS).map(async ([key, path]) => {
        const image = await load(path);
        if (image) pips[key] = image;
    }));
    const root = extensionRoot();
    if (root) {
        const zhugong = await load(`${root}/module/editor/image/icon/zhugong.png`);
        if (zhugong) pips.zhugong = zhugong;
    }
    return { pips, badge: await load(BADGE_ASSET) };
}

/**
 * SVG 导出前把「只有地址、没有原始字节」的素材抓成字节（内嵌进 SVG，导出后才能离线打开）。
 * 正常路径（立绘/图标从磁盘读）本来就有字节，这里只兜底 in-game 地址。
 * @param {object} data
 */
async function ensureAssetBytes(data) {
    if (!(data.assetData instanceof Map)) data.assetData = new Map();
    const images = [data.art, data.groupIcon, data.badge, ...Object.values(data.pips || {})].filter(Boolean);
    await Promise.all(images.map(async img => {
        if (data.assetData.has(img)) return;
        const src = String(img.currentSrc || img.src || "");
        if (!src || src.startsWith("data:")) return;
        try {
            const response = await fetch(src, { cache: "no-cache" });
            if (!response.ok) return;
            const bytes = new Uint8Array(await response.arrayBuffer());
            if (!bytes.length) return;
            data.assetData.set(img, { bytes, mime: sniffImageMime(bytes, src) });
        } catch (err) {
            console.warn("武将卡：素材转内嵌失败（SVG 里会退成地址引用）", src, err);
        }
    }));
}

/** 读上次选的导出格式（读不到/脏值就是 PNG） */
function readExportFormat(host) {
    try {
        if (host && typeof host.configQuery === "function") {
            return normalizeFormat(host.configQuery("get", { member: EXPORT_FORMAT_CONFIG }));
        }
    } catch (err) {
        console.warn("武将卡：读取导出格式失败", err);
    }
    return DEFAULT_EXPORT_FORMAT;
}

/** 记住本次选的导出格式（写失败只影响下次默认值，不打断导出） */
function writeExportFormat(host, format) {
    try {
        if (host && typeof host.configQuery === "function") {
            host.configQuery("write", { member: EXPORT_FORMAT_CONFIG, value: normalizeFormat(format) });
        }
    } catch (err) {
        console.warn("武将卡：保存导出格式失败", err);
    }
}

/**
 * 「另存为」：桌面端走系统保存对话框 + fs 写盘；拿不到 remote 时退化为 `<a download>`。
 * （`window.require` 在桌面端可用，与设置页选择文件夹对话框同一套判定。）
 * @param {Blob} blob
 * @param {string} fileName
 * @param {"png"|"jpg"|"svg"} format 决定保存对话框的后缀与过滤器
 * @returns {Promise<string>} 落盘路径；退化为浏览器下载时返回 ""
 */
async function saveImageBlob(blob, fileName, format = DEFAULT_EXPORT_FORMAT) {
    const spec = EXPORT_FORMATS[normalizeFormat(format)];
    const req = typeof window.require === "function" ? window.require : null;
    if (!req) return "";
    const electronVersion = parseFloat((window.process && window.process.versions && window.process.versions.electron) || "0");
    let remote = null;
    try {
        remote = electronVersion >= 14 ? req("@electron/remote") : (req("electron") || {}).remote;
    } catch (err) {
        remote = null;
    }
    if (remote && remote.dialog && typeof remote.dialog.showSaveDialog === "function") {
        const options = {
            title: "保存武将卡",
            defaultPath: fileName,
            filters: spec.filters,
        };
        const currentWindow = typeof remote.getCurrentWindow === "function" ? remote.getCurrentWindow() : null;
        const result = currentWindow
            ? await remote.dialog.showSaveDialog(currentWindow, options)
            : await remote.dialog.showSaveDialog(options);
        if (!result || result.canceled || !result.filePath) return "";
        const fs = req("fs");
        if (!fs) throw new Error("拿不到 Node fs，无法写盘");
        //fs.writeFile 收 TypedArray，不必构造 Buffer
        const bytes = new Uint8Array(await blob.arrayBuffer());
        if (fs.promises && fs.promises.writeFile) await fs.promises.writeFile(result.filePath, bytes);
        else fs.writeFileSync(result.filePath, bytes);
        return result.filePath;
    }
    //网页端 / 没启用 remote：浏览器式下载
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return "";
}

/**
 * 「生成卡牌」入口：渲染当前草稿为卡面并弹出预览浮层
 * （导出格式：PNG / JPG / SVG；复制固定走 PNG 位图 —— 剪贴板只可靠支持 image/png）
 * @param {object} host `<character-editor>` 组件实例（见文件头的宿主契约）
 */
export async function openCharacterCardPreview(host) {
    const objectURLs = [];
    const assetData = new Map();
    const wrapper = document.createElement("div");
    wrapper.innerHTML = PREVIEW_TEMPLATE.trim();
    const overlay = wrapper.firstElementChild;
    const canvas = overlay.querySelector("canvas");
    const message = overlay.querySelector(".card-message");
    const formatSelect = overlay.querySelector(".card-format");
    let format = readExportFormat(host);
    formatSelect.value = format;
    const setMessage = (text, isError = false) => {
        message.textContent = text || "";
        message.classList.toggle("card-error", Boolean(isError));
    };
    const close = () => {
        objectURLs.splice(0).forEach(url => URL.revokeObjectURL(url));
        overlay.remove();
    };
    host.shadowRoot.appendChild(overlay);
    overlay.querySelector(".card-close").addEventListener("pointerup", close);
    overlay.addEventListener("pointerup", e => {
        //点浮层空白处（不是卡片/按钮）关闭
        if (e.composedPath()[0] === overlay) close();
    });

    setMessage("正在渲染…");
    let data;
    try {
        data = await collectCardData(host, objectURLs, assetData);
        renderCharacterCard(canvas, data);
    } catch (err) {
        console.warn("武将卡：渲染失败", err);
        setMessage(`渲染失败：${err && err.message ? err.message : err}`, true);
        return;
    }
    //「没立绘」的提示优先——那是用户的真实待办，别被格式说明顶掉
    const baseMessage = data.art ? "" : "未设置立绘：已用势力配色底纹占位";
    const showFormatHint = () => {
        setMessage([baseMessage, EXPORT_FORMATS[format].hint].filter(Boolean).join("　·　"));
    };
    showFormatHint();

    formatSelect.addEventListener("change", () => {
        format = normalizeFormat(formatSelect.value);
        writeExportFormat(host, format);
        showFormatHint();
    });

    overlay.querySelector(".card-copy").addEventListener("pointerup", async () => {
        try {
            const blob = await canvasToPngBlob(canvas);
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
            setMessage(format === "png" ? "已复制到剪贴板" : "已复制到剪贴板（剪贴板里固定是 PNG 位图）");
        } catch (err) {
            console.warn("武将卡：复制失败", err);
            setMessage(`复制失败：${err && err.message ? err.message : err}`, true);
        }
    });
    overlay.querySelector(".card-save").addEventListener("pointerup", async () => {
        const spec = EXPORT_FORMATS[format];
        try {
            setMessage(`正在导出 ${spec.label}…`);
            const blob = await createExportBlob(format, canvas, async () => {
                //SVG 需要素材的真实字节（导出后文件能离线打开），先补齐再绘制
                await ensureAssetBytes(data);
                return renderCharacterCardSvg(data);
            });
            const saved = await saveImageBlob(blob, `${data.id || data.name || "武将卡"}.${spec.ext}`, format);
            const size = formatBytes(blob.size);
            setMessage(saved ? `已保存到 ${saved}（${size}）` : `已触发浏览器下载（${size}）`);
        } catch (err) {
            console.warn("武将卡：保存失败", err);
            setMessage(`保存失败：${err && err.message ? err.message : err}`, true);
        }
    });
}
