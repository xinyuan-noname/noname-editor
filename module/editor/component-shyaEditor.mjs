"use script";
import { lib, game, ui, get, ai, _status } from "../../../../noname.js";
import { HTMLNonameFocusUIElement } from "./component-base.mjs";
import {
    TAG_PAGES,
    TAG_NUMBER_MIN,
    TAG_NUMBER_MAX,
    SPECIAL_TAG_PREFIXES,
    getSpecialGroups,
    linesFromTags,
    readTagRegion,
    writeTagRegion,
    clearTagRegion,
    tagsFromTagLines,
    inlineTagKeys,
    inlineTagSlots,
    tagSlotName
} from "./shya/tags.mjs";
import { SKILL_KINDS, getSkillKind } from "./shya/skillTemplates.mjs";

/** 技能类型宏库的 import：编译前自动注入，不写进文本框（见 prepareSource） */
const HOST_IMPORT_TYPE = 'import "./host/skill-type.shya"';
/** 技能内容宏库（摸/伤/回/判定/询问…，host/skill-content.shya）的 import：同上 */
const HOST_IMPORT_CONTENT = 'import "./host/skill-content.shya"';
/** [注入文本, 调用点是否已手写] —— 写过的那个不重复注入，诊断行号按实际注入行数回退 */
const HOST_IMPORTS = [
    [HOST_IMPORT_TYPE, /^\s*import\s+["'][^"']*host\/skill-type\.shya["']/m],
    [HOST_IMPORT_CONTENT, /^\s*import\s+["'][^"']*host\/skill-content\.shya["']/m]
];
const EXAMPLE_SOURCE = [
    "// 示例：给「你」写一个结束阶段回血的触发技",
    "// @skill_* 宏来自 shya/host/skill-type.shya；@draw/@recover/@judge_color 等内容宏来自 shya/host/skill-content.shya",
    "// 两个宏库的 import 编辑器都会自动注入（诊断行号已按注入行数回退），不用手写",
    "// 下面这行只导入宿主声明（Player / Card / GameEvent 的成员签名），可省略",
    'import "./host/index.shya"',
    "",
    "@skill_trigger {",
    "  #skill: my_skill",
    '  #translation: "回春"',
    '  #description: "结束阶段开始时，若你的体力值小于体力上限，你可以回复 1 点体力。"',
    '  #trigger: "phaseJieshuBegin"',
    "  #filter:",
    "    return player hp < player maxHp",
    "  #content:",
    "    @recover {",
    "      #who: player",
    "      #num: 1",
    "    }",
    "}",
    ""
].join("\n");

/**
 * shya 技能编辑器组件。
 * 界面来自 html/shyaEditor.html（经 preprocessing 注入到下方标记之间），
 * 样式来自 style/shyaEditor.css（载入本组件 shadowRoot，不污染全局）。
 */
class HTMLNonameShyaEditorElement extends HTMLNonameFocusUIElement {
    /** 编译器（首编译时惰性载入） */
    compiler = null;
    /** 上一次成功编译出的 JS */
    generatedCode = "";
    /** 已选标签（内部键） */
    chosenTags = new Set();
    /** 标签面板当前页（TAG_PAGES 的 key，或 "special"） */
    activeTagPage = "fadong";
    /** 「每回合限n次 / 每n轮限一次」里的 n */
    tagNumbers = { usable: 1, round: 1 };
    /** 当前选中的技能种类（SKILL_KINDS 的 key） */
    currentKind = "";
    /** 源码是否已被动过：没动过时插模板直接整块替换，避免与初始示例叠在一起 */
    sourceTouched = false;
    /** 上一次写入的模板原文：源码还等于它时再点别的种类直接替换，不会越堆越多 */
    lastTemplateText = "";
    sourceArea = null;
    constructor() {
        super();
        const shadow = this.attachShadow({ mode: "open" });
        //$: shadow , html/shyaEditor.html//
shadow.innerHTML=`
<section class="main">
    <div class="toolbar">
        <span class="title">shya 技能编辑器</span>
        <input class="skill-id" type="text" placeholder="技能 id（如 my_skill）" spellcheck="false">
        <span class="buttons">
            <button class="compile" type="button">编译</button>
            <button class="generate" type="button">生成</button>
            <button class="copy" type="button">复制代码</button>
        </span>
    </div>
    <div class="kind-bar">
        <span class="kind-label">技能种类</span>
        <div class="kind-buttons"></div>
        <span class="kind-hint" title="快捷键（只在源码框内生效）&#10;Tab 缩进 / Shift+Tab 反缩进&#10;Enter 保持上一行缩进（行尾是 { 或 : 时多缩进一级）&#10;Shift+Alt+↑ / Shift+Alt+↓ 复制当前行（或选区）&#10;Shift+Alt+D 删除当前行（或选区）">快捷键：Tab 缩进 · Shift+Tab 反缩进 · Enter 保持缩进 · Shift+Alt+↑/↓ 复制行 · Shift+Alt+D 删除行</span>
    </div>
    <div class="tools">
        <div class="tools-tabs">
            <button class="tool-tab chosen" type="button" data-tool="tag">标签</button>
        </div>
        <div class="tools-body">
            <div class="tool-panel" data-tool-panel="tag">
                <div class="tag-pages"></div>
                <div class="tag-groups"></div>
                <div class="tag-footer">
                    <span class="tag-count">已选 0 项</span>
                    <label class="tag-n" title="「每回合限n次 / 每n轮限一次」里的 n（1~20）">n <input class="tag-n-input" type="number" min="1" max="20" step="1" value="1"></label>
                    <button class="tag-insert" type="button">写入标签</button>
                    <button class="tag-clear" type="button">清空</button>
                </div>
            </div>
        </div>
    </div>
    <div class="body">
        <div class="pane">
            <div class="pane-title">shya 源码</div>
            <textarea class="source" spellcheck="false" wrap="off"></textarea>
        </div>
        <div class="pane">
            <div class="pane-title">产物 / 诊断</div>
            <pre class="diagnostics"></pre>
            <pre class="output"></pre>
        </div>
    </div>
</section>
`
//#: shadow , html/shyaEditor.html//
    }
    connectedCallback() {
        this.loadCss("shyaEditor", { root: this.shadowRoot });
        const q = sel => this.shadowRoot.querySelector(sel);
        this.sourceArea = q(".source");
        if (this.sourceArea && !this.sourceArea.value) this.sourceArea.value = EXAMPLE_SOURCE;
        if (this.sourceArea) {
            //一动源码就记成「已编辑」：此后插模板只插到光标处，不再整块替换
            this.sourceArea.addEventListener("input", () => { this.sourceTouched = true; });
            //源码框内的按键增强（Tab 缩进、Enter 缩进、复制/删除行），详见 handleSourceKeydown
            this.sourceArea.addEventListener("keydown", e => this.handleSourceKeydown(e));
        }
        const idInput = q(".skill-id");
        if (idInput) idInput.addEventListener("input", () => this.triggerEvent("tabTitleChange"));
        q(".compile").addEventListener("pointerup", () => this.compile());
        q(".generate").addEventListener("pointerup", () => this.generate());
        q(".copy").addEventListener("pointerup", () => this.copyCode());
        const closeButton = q(".close");
        if (closeButton) closeButton.addEventListener("pointerup", () => this.remove());
        //标签工具：选中标签后写进源码里的 //#tags-begin … //#tags-end 托管区
        const tagInsert = q(".tag-insert");
        const tagClear = q(".tag-clear");
        const tagNumber = q(".tag-n-input");
        if (tagInsert) tagInsert.addEventListener("pointerup", () => this.writeTags());
        if (tagClear) tagClear.addEventListener("pointerup", () => this.clearTags());
        if (tagNumber) tagNumber.addEventListener("change", () => {
            this.tagNumbers.usable = this.clampTagNumber(tagNumber.value);
            this.tagNumbers.round = this.tagNumbers.usable;
            this.renderTagCount();
        });
        //技能种类：一排按钮（形态照旧版编辑器的「技能种类」，不用下拉框）
        this.renderKindBar();
        //标签面板按源码回填（模板/草稿里已有的标签槽一眼可见）
        this.syncTagsFromSource();
    }
    /**
     * 主区标签栏用的标题（技能：id）
     * @returns {string}
     */
    getTabTitle() {
        const input = this.shadowRoot.querySelector(".skill-id");
        const id = input && input.value ? input.value.trim() : "";
        return id ? `技能：${id}` : "技能：未命名";
    }
    escape(text) {
        return String(text).replace(/[&<>]/g, ch => (ch === "&" ? "&amp;" : ch === "<" ? "&lt;" : "&gt;"));
    }
    setDiagnostics(html) {
        const node = this.shadowRoot.querySelector(".diagnostics");
        if (node) node.innerHTML = html;
    }
    async ensureCompiler() {
        if (!this.compiler) {
            const { loadCompiler } = await import("./shya/loader.mjs");
            this.compiler = await loadCompiler();
        }
        return this.compiler;
    }
    /**
     * 编译：调用 WASM 里的 shya_compile，渲染结构化诊断（行列/诊断码/消息）
     */
    async compile() {
        const output = this.shadowRoot.querySelector(".output");
        if (output) output.textContent = "";
        this.setDiagnostics("<span>正在编译…</span>");
        try {
            const compiler = await this.ensureCompiler();
            const prepared = this.prepareSource(this.sourceArea ? this.sourceArea.value : "");
            const result = compiler.compile(prepared.source);
            this.generatedCode = result && result.ok ? result.code : "";
            const list = (result && result.diagnostics) || [];
            if (!list.length) {
                this.setDiagnostics(`<span class="ok">编译通过 ✓${result && result.ok ? "" : "（但未产出代码）"}</span>`);
            } else {
                this.setDiagnostics(list.map(d => {
                    const cls = d.severity === "error" ? "err" : d.severity === "warning" ? "warn" : "";
                    const sev = d.severity === "error" ? "错误" : d.severity === "warning" ? "警告" : "提示";
                    const line = Math.max(1, d.line - prepared.injected);
                    return `<span class="${cls}">${line}:${d.col} ${sev} [${this.escape(d.code)}] ${this.escape(d.message)}</span>`;
                }).join("\n"));
            }
            if (output) output.textContent = this.generatedCode;
        } catch (err) {
            this.setDiagnostics(`<span class="err">编译器载入失败：${this.escape(err && err.message ? err.message : err)}</span>`);
        }
    }
    /**
     * 生成：与旧编辑器「生成」同义——在游戏上下文里求值，局内立即生效
     */
    generate() {
        if (!this.generatedCode) {
            this.setDiagnostics('<span class="warn">请先成功编译一次</span>');
            return;
        }
        try {
            const run = new Function("_status", "lib", "game", "ui", "get", "ai", this.generatedCode);
            run(_status, lib, game, ui, get, ai);
            const id = this.shadowRoot.querySelector(".skill-id");
            const name = id && id.value ? id.value : "";
            this.setDiagnostics(`<span class="ok">已生成并在本局生效 ✓${name ? "（技能 id：" + this.escape(name) + "）" : ""}</span>`);
        } catch (err) {
            this.setDiagnostics(`<span class="err">生成失败：${this.escape(err && err.message ? err.message : err)}</span>`);
        }
    }
    copyCode() {
        const code = this.generatedCode || (this.sourceArea ? this.sourceArea.value : "");
        if (!code) return;
        const area = document.createElement("textarea");
        area.value = code;
        document.body.appendChild(area);
        area.select();
        try {
            document.execCommand("copy");
            this.setDiagnostics('<span class="ok">已复制到剪贴板 ✓</span>');
        } catch (err) {
            this.setDiagnostics('<span class="err">复制失败，请手动选取</span>');
        } finally {
            area.remove();
        }
    }
    /**
     * 标签面板：页签（旧版「技能标签」九页 + 「特殊设置」）+ 当前页 chips + 底部计数
     * 冷色调：选中态用冷蓝，未选为半透明冷灰
     */
    renderTagPanel() {
        this.renderTagPages();
        this.renderTagChips();
        this.renderTagCount();
    }
    /** 页签：九页标签 + 特殊设置（形态对齐旧版「技能标签」页的类别按钮） */
    renderTagPages() {
        const root = this.shadowRoot.querySelector(".tag-pages");
        if (!root) return;
        const pages = [
            ...TAG_PAGES.map(page => ({ key: page.key, name: page.name, title: page.description })),
            { key: "special", name: "特殊设置", title: "势力 / 技能动画 / 宗族 / 主将·副将（按已选标签出现，与旧版一致）" }
        ];
        root.replaceChildren();
        pages.forEach(page => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "tag-page";
            button.dataset.tagPage = page.key;
            button.textContent = page.name;
            button.title = page.title || "";
            if (this.activeTagPage === page.key) button.classList.add("chosen");
            button.addEventListener("pointerup", () => {
                this.activeTagPage = page.key;
                this.renderTagPanel();
            });
            root.appendChild(button);
        });
    }
    /** 当前页的 chips；特殊设置页只列「已选标签命中 requires」的组（旧版行为） */
    renderTagChips() {
        const root = this.shadowRoot.querySelector(".tag-groups");
        if (!root) return;
        root.replaceChildren();
        if (this.activeTagPage === "special") {
            const groups = getSpecialGroups(lib, this.chosenTags);
            if (!groups.length) {
                const hint = document.createElement("div");
                hint.className = "tag-hint";
                hint.textContent = "先在其它页选「势力技 / 技能动画 / 宗族技 / 主将技·副将技」，这里才会出现对应的特殊标签（与旧版一致）";
                root.appendChild(hint);
                return;
            }
            groups.forEach(group => root.appendChild(this.createTagGroup(group)));
            return;
        }
        const page = TAG_PAGES.find(item => item.key === this.activeTagPage) || TAG_PAGES[0];
        root.appendChild(this.createTagGroup(page));
    }
    /**
     * 画一个标签组（组名 + chips）
     * @param {{name:string,description?:string,tags:Array<{key:string,name:string,hint?:string}>}} group
     */
    createTagGroup(group) {
        const box = document.createElement("div");
        box.className = "tag-group";
        const title = document.createElement("div");
        title.className = "tag-group-title";
        title.textContent = group.name;
        title.title = group.description || "";
        box.appendChild(title);
        const list = document.createElement("div");
        list.className = "tag-list";
        group.tags.forEach(tag => {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "tag-chip";
            chip.dataset.tagKey = tag.key;
            chip.textContent = tag.name;
            chip.title = tag.hint || tag.name;
            if (this.chosenTags.has(tag.key)) chip.classList.add("chosen");
            chip.addEventListener("pointerup", () => this.toggleTag(tag.key));
            list.appendChild(chip);
        });
        box.appendChild(list);
        return box;
    }
    /**
     * 选中/取消一个标签。特殊设置的四类前缀互斥（旧版 findPrefix：group- / animation- / clan- / mainVice-）
     * @param {string} key 标签内部键
     */
    toggleTag(key) {
        if (this.chosenTags.has(key)) {
            this.chosenTags.delete(key);
        } else {
            //特殊设置的四类前缀互斥（旧版 findPrefix：group- / animation- / clan- / mainVice-）
            SPECIAL_TAG_PREFIXES.forEach(prefix => {
                if (!key.startsWith(prefix)) return;
                for (const chosen of [...this.chosenTags]) {
                    if (chosen.startsWith(prefix)) this.chosenTags.delete(chosen);
                }
            });
            //同一个槽只留一条（usable-1 与 usable-n 是一个槽 usable）
            const slot = tagSlotName(key);
            if (slot) {
                for (const chosen of [...this.chosenTags]) {
                    if (chosen !== key && tagSlotName(chosen) === slot) this.chosenTags.delete(chosen);
                }
            }
            this.chosenTags.add(key);
        }
        this.renderTagPanel();
    }
    /** 底部「已选 N 项」 */
    renderTagCount() {
        const counter = this.shadowRoot.querySelector(".tag-count");
        if (!counter) return;
        const names = new Map();
        TAG_PAGES.forEach(page => page.tags.forEach(tag => names.set(tag.key, tag.name)));
        getSpecialGroups(lib, this.chosenTags).forEach(group => group.tags.forEach(tag => names.set(tag.key, tag.name)));
        const chosen = [...this.chosenTags].map(key => names.get(key) || key);
        counter.textContent = chosen.length ? `已选 ${chosen.length} 项：${chosen.join("、")}` : "已选 0 项";
    }
    /** 「每回合限n次 / 每n轮限一次」的 n 限制在 1~20（旧版 range 对话框同款） */
    clampTagNumber(value) {
        const num = Math.round(Number(value));
        if (!Number.isFinite(num)) return TAG_NUMBER_MIN;
        return Math.max(TAG_NUMBER_MIN, Math.min(TAG_NUMBER_MAX, num));
    }
    /** 技能 id：优先工具栏输入框，其次源码的 #skill 槽（特殊标签 mainVice-remove1 要写进 init 里） */
    currentSkillId() {
        const input = this.shadowRoot.querySelector(".skill-id");
        if (input && input.value.trim()) return input.value.trim();
        const matched = /#skill:\s*([A-Za-z_$][\w$]*)/.exec(this.sourceArea ? this.sourceArea.value : "");
        return matched ? matched[1] : "";
    }
    /**
     * 把已选标签写进源码：托管区存在就整块替换，不存在就插到 @skill_* 宏体开头。
     * 已经手写在宏体里（托管区外）的标签不再重复写（同名槽编译器不报错、后者胜，但两条互相矛盾很坑）。
     */
    writeTags() {
        if (!this.sourceArea) return;
        if (!this.chosenTags.size) {
            this.setDiagnostics('<span class="warn">请先在上面选标签</span>');
            return;
        }
        const inline = inlineTagKeys(this.sourceArea.value);
        const inlineSlots = inlineTagSlots(this.sourceArea.value);
        //宏体里已写过的标签/槽不再重复写（同名槽编译器不报错、后者胜，但两条互相矛盾很坑）
        const pending = [...this.chosenTags].filter(key => !inline.has(key) && !inlineSlots.has(tagSlotName(key)));
        const lines = linesFromTags(pending, {
            skillId: this.currentSkillId(),
            main: this.chosenTags.has("mainSkill"),
            vice: this.chosenTags.has("viceSkill"),
            numbers: this.tagNumbers
        });
        if (!lines.length) {
            const removed = clearTagRegion(this.sourceArea.value);
            if (removed.ok) this.replaceRange(removed.start, removed.end, removed.text);
            this.setDiagnostics(`<span class="ok">已选的 ${this.chosenTags.size} 项都写在宏体里（托管区外），无需重复写入</span>`);
            return;
        }
        const result = writeTagRegion(this.sourceArea.value, lines);
        if (!result.ok) {
            this.setDiagnostics(`<span class="warn">${this.escape(result.reason)}</span>`);
            return;
        }
        this.replaceRange(result.start, result.end, result.text);
        this.setDiagnostics(`<span class="ok">已写入 ${lines.length} 行标签（托管区 //#tags-begin … //#tags-end）</span>`);
    }
    /** 清空：面板选择清掉，源码里的托管区也删掉（宏体里手写的标签槽不动） */
    clearTags() {
        this.chosenTags.clear();
        if (this.sourceArea) {
            const result = clearTagRegion(this.sourceArea.value);
            if (result.ok) this.replaceRange(result.start, result.end, result.text);
        }
        this.renderTagPanel();
    }
    /** 源码 → 面板：把托管区与宏体里已有的标签槽回填成选中态（重开编辑器 / 载入草稿 / 换模板后调用） */
    syncTagsFromSource() {
        if (!this.sourceArea) return this;
        const region = readTagRegion(this.sourceArea.value);
        const parsed = tagsFromTagLines(region ? region.lines : []);
        inlineTagKeys(this.sourceArea.value).forEach(key => parsed.tags.add(key));
        this.chosenTags = parsed.tags;
        this.tagNumbers = parsed.numbers;
        const input = this.shadowRoot.querySelector(".tag-n-input");
        if (input) input.value = String(parsed.numbers.usable);
        this.renderTagPanel();
        return this;
    }
    /**
     * 渲染「技能种类」按钮组：一排按钮，点一个就把该类的模板写进源码。
     * 形态照旧版编辑器的技能种类（skill/editor.mjs:915-948 的 generateKindsButton），不用下拉框。
     */
    renderKindBar() {
        const root = this.shadowRoot.querySelector(".kind-buttons");
        if (!root) return;
        root.replaceChildren();
        SKILL_KINDS.forEach(kind => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "kind-button";
            button.dataset.kind = kind.key;
            button.textContent = kind.name;
            button.title = `${kind.name}：${kind.hint || ""}\n点击即把该类模板写进源码（源码还是初始示例时整块替换，否则插到光标处）`;
            if (this.currentKind === kind.key) button.classList.add("chosen");
            button.addEventListener("pointerup", () => this.chooseKind(kind.key));
            root.appendChild(button);
        });
    }
    /**
     * 选中某个技能种类：更新选中态，并写入该类模板
     * @param {string} key SKILL_KINDS 里的 key
     */
    chooseKind(key) {
        if (!getSkillKind(key)) return;
        this.currentKind = key;
        this.renderKindBar();
        this.insertTemplate(key);
    }
    /**
     * 把某类技能的最简模板写进源码：源码为空或还是初始示例时整块替换，否则插到光标处
     * @param {string} key SKILL_KINDS 里的 key
     */
    insertTemplate(key) {
        const kind = getSkillKind(key);
        if (!kind || !this.sourceArea) return;
        const text = kind.template;
        const node = this.sourceArea;
        //没动过 / 空 / 还是上一次写进去的模板 → 整块替换，点着换种类不会越堆越多
        if (!this.sourceTouched || !node.value.trim() || node.value === this.lastTemplateText) {
            this.replaceRange(0, node.value.length, text);
            //整块替换后光标回到开头、视野回顶部（否则停在模板末尾，看不到开头）
            node.setSelectionRange(0, 0);
            node.scrollTop = 0;
            this.lastTemplateText = text;
        } else {
            this.lastTemplateText = "";
            const start = node.selectionStart ?? node.value.length;
            const end = node.selectionEnd ?? start;
            this.replaceRange(start, end, text);
        }
        //技能 id 输入框空着就顺手填上模板里的 id（只影响标签栏标题）
        const idInput = this.shadowRoot.querySelector(".skill-id");
        if (idInput && !idInput.value) {
            const matched = /#skill:\s*([A-Za-z_$][\w$]*)/.exec(text);
            if (matched) {
                idInput.value = matched[1];
                this.triggerEvent("tabTitleChange");
            }
        }
        this.setDiagnostics(`<span class="ok">已写入「${kind.name}」模板：${this.escape(kind.hint || "")}</span>`);
        //换模板后按新源码回填标签面板（模板里本来就有的标签槽会亮起来）
        this.syncTagsFromSource();
    }
    // ================= 源码输入增强（同步旧版编辑器的合理快捷键） =================
    /**
     * 用 execCommand("insertText") 替换一段文本：浏览器原生编辑，Ctrl+Z 撤销栈仍然有效；
     * 不可用时退回直接改 value（会丢原生撤销栈）。
     * @param {number} start
     * @param {number} end
     * @param {string} text
     */
    replaceRange(start, end, text) {
        const node = this.sourceArea;
        if (!node) return;
        node.focus();
        node.setSelectionRange(start, end);
        let inserted = false;
        try {
            inserted = document.execCommand("insertText", false, text);
        } catch (err) {
            inserted = false;
        }
        if (!inserted) {
            const value = node.value;
            node.value = value.slice(0, start) + text + value.slice(end);
            node.setSelectionRange(start + text.length, start + text.length);
        }
        this.sourceTouched = true;
    }
    /**
     * 推断缩进单位：有行首制表符就用制表符，否则取最小的行首空格数（默认 2 空格，与宏库、模板一致）
     * @returns {string}
     */
    inferIndentUnit() {
        const value = this.sourceArea ? this.sourceArea.value : "";
        if (/^\t/m.test(value)) return "\t";
        let min = 0;
        for (const line of value.split("\n")) {
            const matched = /^( +)\S/.exec(line);
            if (!matched) continue;
            const count = matched[1].length;
            if (!min || count < min) min = count;
        }
        return " ".repeat(min > 0 && min <= 8 ? min : 2);
    }
    /**
     * 对选区覆盖的整行做逐行变换，并把选区按每行行首的增删映射回去
     * @param {number} start 选区起点
     * @param {number} end 选区终点
     * @param {(line: string, index: number) => { text: string, remove: number, add: number }} map
     *        逐行变换：remove / add 是该行行首被删掉 / 新增的字符数，用来映射选区
     * @returns {boolean} 是否发生了改动
     */
    transformLines(start, end, map) {
        const node = this.sourceArea;
        if (!node) return false;
        const value = node.value;
        //选区正好停在某行行首时，不要把那一行算进来
        const selEnd = end > start && value[end - 1] === "\n" ? end - 1 : end;
        const from = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
        const nextBreak = value.indexOf("\n", selEnd);
        const to = nextBreak < 0 ? value.length : nextBreak;
        const lines = value.slice(from, to).split("\n");
        const results = lines.map(map);
        if (results.every((item, index) => item.text === lines[index])) return false;
        const oldOffsets = [];
        const newOffsets = [];
        let oldCursor = 0;
        let newCursor = 0;
        for (let i = 0; i < results.length; i++) {
            oldOffsets.push(oldCursor);
            newOffsets.push(newCursor);
            oldCursor += lines[i].length + 1;
            newCursor += results[i].text.length + 1;
        }
        const newText = results.map(item => item.text).join("\n");
        const mapOffset = offset => {
            if (offset <= from) return offset;
            if (offset >= to) return offset + (newText.length - (to - from));
            let index = 0;
            while (index + 1 < oldOffsets.length && oldOffsets[index + 1] <= offset - from) index++;
            const inLine = offset - from - oldOffsets[index];
            const { remove, add } = results[index];
            return from + newOffsets[index] + Math.max(0, inLine - remove) + add;
        };
        const nextStart = mapOffset(start);
        const nextEnd = mapOffset(end);
        this.replaceRange(from, to, newText);
        node.setSelectionRange(nextStart, nextEnd);
        return true;
    }
    /**
     * 反缩进一行：先摘掉一个缩进单位，不够就摘到行首
     * @param {string} line
     * @param {string} unit
     * @returns {string}
     */
    outdentLine(line, unit) {
        if (line.startsWith(unit)) return line.slice(unit.length);
        const lead = /^[ \t]+/.exec(line);
        if (!lead) return line;
        const kept = lead[0].startsWith("\t") ? lead[0].length - 1 : Math.max(0, lead[0].length - unit.length);
        return " ".repeat(kept) + line.slice(lead[0].length);
    }
    /**
     * Tab / Shift+Tab：缩进 / 反缩进选区覆盖的整行（旧版编辑器的 Tab 缩进）
     * @param {boolean} outdent 是否反缩进
     */
    indentLines(outdent) {
        const node = this.sourceArea;
        if (!node) return;
        const unit = this.inferIndentUnit();
        const start = node.selectionStart ?? 0;
        const end = node.selectionEnd ?? start;
        this.transformLines(start, end, line => {
            if (outdent) {
                const text = this.outdentLine(line, unit);
                return { text, remove: line.length - text.length, add: 0 };
            }
            return { text: unit + line, remove: 0, add: unit.length };
        });
    }
    /**
     * Shift+Alt+↑ / Shift+Alt+↓：把选区覆盖的整行复制一份到上方 / 下方（旧版同款）
     * @param {"up"|"down"} direction
     */
    duplicateLines(direction) {
        const node = this.sourceArea;
        if (!node) return;
        const value = node.value;
        const start = node.selectionStart ?? 0;
        const end = node.selectionEnd ?? start;
        const selEnd = end > start && value[end - 1] === "\n" ? end - 1 : end;
        const from = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
        const nextBreak = value.indexOf("\n", selEnd);
        const to = nextBreak < 0 ? value.length : nextBreak;
        const block = value.slice(from, to);
        const shift = block.length + 1;
        if (direction === "up") {
            this.replaceRange(from, from, block + "\n");
            //复制体落在原位置，选区不动（旧版同款）
            node.setSelectionRange(start, end);
        } else {
            this.replaceRange(to, to, "\n" + block);
            node.setSelectionRange(start + shift, end + shift);
        }
    }
    /**
     * Shift+Alt+D：删除选区覆盖的整行（旧版同款）
     */
    deleteLines() {
        const node = this.sourceArea;
        if (!node) return;
        const value = node.value;
        const start = node.selectionStart ?? 0;
        const end = node.selectionEnd ?? start;
        const selEnd = end > start && value[end - 1] === "\n" ? end - 1 : end;
        const from = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
        const nextBreak = value.indexOf("\n", selEnd);
        const to = nextBreak < 0 ? value.length : nextBreak;
        //末行没有行尾换行符，就连行首那个换行一起删，别留空行
        const delFrom = to < value.length ? from : Math.max(0, from - 1);
        const delTo = to < value.length ? to + 1 : to;
        if (delFrom >= delTo) return;
        this.replaceRange(delFrom, delTo, "");
        node.setSelectionRange(delFrom, delFrom);
    }
    /**
     * 源码框按键（只在源码框内生效）：
     *   Tab / Shift+Tab      缩进 / 反缩进选中行（旧版编辑器的 Tab 缩进）
     *   Enter                保持上一行缩进，行尾是 { 或 : 时多缩进一级
     *   Shift+Alt+↑ / ↓      复制当前行（或选区）
     *   Shift+Alt+D          删除当前行（或选区）
     * 这些组合与引擎的全局键（F5 / Ctrl+R / Ctrl+S / Ctrl+J / Space / a / w）不冲突；
     * 且主区 viewArea 已在冒泡阶段截断 keydown，按键不会漏到引擎的 window.onkeydown。
     * 刻意没同步旧版的中文语句专属键（Shift+Alt+F 整理、Shift+Alt+S 句式对话框）。
     * @param {KeyboardEvent} event
     */
    handleSourceKeydown(event) {
        if (!event || typeof event.key !== "string") return;
        const node = this.sourceArea;
        if (!node) return;
        const alt = event.altKey;
        const shift = event.shiftKey;
        if (alt && shift && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
            event.preventDefault();
            this.duplicateLines(event.key === "ArrowUp" ? "up" : "down");
            return;
        }
        if (alt && shift && (event.key === "D" || event.key === "d")) {
            event.preventDefault();
            this.deleteLines();
            return;
        }
        if (event.key === "Tab") {
            event.preventDefault();
            this.indentLines(shift);
            return;
        }
        if (event.key === "Enter" && !shift && !event.ctrlKey && !event.metaKey && !alt) {
            //输入法组合中的回车交给输入法自己处理（Chromium 下 isComposing / keyCode 229）
            if (event.isComposing || event.keyCode === 229) return;
            const value = node.value;
            const start = node.selectionStart ?? 0;
            const end = node.selectionEnd ?? start;
            const from = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
            const lineBreak = value.indexOf("\n", from);
            const lineText = value.slice(from, lineBreak < 0 ? value.length : lineBreak);
            //缩进取整行的行首空白：光标停在行首、整行被选中时 head 是空串，只有读整行才拿得到缩进
            const indent = (/^[ \t]*/.exec(lineText) || [""])[0];
            const head = value.slice(from, start);
            //光标前的行尾是 { 或 : （宏块 / 插槽）就多缩进一级
            const opensBlock = /[{:]\s*$/.test(head);
            if (!indent && !opensBlock) return;
            const inserted = "\n" + indent + (opensBlock ? this.inferIndentUnit() : "");
            event.preventDefault();
            this.replaceRange(start, end, inserted);
            node.setSelectionRange(start + inserted.length, start + inserted.length);
        }
    }
    /**
     * 编译前注入宿主宏库的 import（类型宏库 + 内容宏库，都按需注入、不进文本框；
     * 诊断行号按实际注入行数回退）。
     * 用户源码里已经手写了同一个 import 时不重复注入（两个宏库各自判断）。
     * @param {string} source 用户源码
     * @returns {{ source: string, injected: number }} 注入后的源码与注入行数
     */
    prepareSource(source) {
        const missing = HOST_IMPORTS.filter(([, pattern]) => !pattern.test(source)).map(([text]) => text);
        if (!missing.length) return { source, injected: 0 };
        return { source: missing.join("\n") + "\n" + source, injected: missing.length };
    }
    /**
     * 外部塞一份源码进来（AI 区域「打开技能编辑器」用）。
     * 只写文本框与技能 id，产物与诊断清空——让用户自己按「编译」确认，不静默生效。
     * @param {string} code shya 源码
     * @param {string} [skillId] 技能 id；不传就从源码的 #skill 槽里取
     * @returns {this}
     */
    setSource(code, skillId = "") {
        if (typeof code === "string" && code.trim()) {
            if (!this.sourceArea) this.sourceArea = this.shadowRoot.querySelector(".source");
            if (this.sourceArea) this.sourceArea.value = code;
            this.sourceTouched = true;
            this.lastTemplateText = "";
            this.generatedCode = "";
            const output = this.shadowRoot.querySelector(".output");
            if (output) output.textContent = "";
            this.setDiagnostics('<span class="warn">已从 AI 区域载入源码：点「编译」检查，再点「生成」在局内生效</span>');
        }
        const id = skillId || (/^\s*#skill:\s*([A-Za-z_$][\w$]*)/m.exec(String(code || "")) || [])[1] || "";
        if (id) {
            const input = this.shadowRoot.querySelector(".skill-id");
            if (input) input.value = id;
        }
        this.syncTagsFromSource();
        this.triggerEvent("tabTitleChange");
        return this;
    }
}
customElements.define("shya-editor", HTMLNonameShyaEditorElement);
export { HTMLNonameShyaEditorElement };
