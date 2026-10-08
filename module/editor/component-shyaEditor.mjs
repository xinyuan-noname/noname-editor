"use script";
import { lib, game, ui, get, ai, _status } from "../../../../noname.js";
import { HTMLNonameFocusUIElement } from "./component-base.mjs";
import { getVisibleTagGroups, TAG_VISIBLE_LIMIT } from "./shya/tags.mjs";
import { SKILL_KINDS, getSkillKind } from "./shya/skillTemplates.mjs";

/** 技能类型宏库的 import：编译前自动注入，不写进文本框（见 prepareSource） */
const HOST_IMPORT = 'import "./host/skill-type.shya"';
const EXAMPLE_SOURCE = [
    "// 示例：给「你」写一个结束阶段回血的触发技",
    "// @skill_* 宏来自 shya/host/skill-type.shya —— 编辑器编译前会自动注入它的 import，不用手写",
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
    "    player recover(1)",
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
    /** 当前技能类型标记（决定显示哪些标签组） */
    skillTypes = [];
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
                <div class="tag-groups"></div>
                <div class="tag-footer">
                    <span class="tag-count">已选 0 项</span>
                    <button class="tag-insert" type="button">插入到光标处</button>
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
        //标签工具
        const tagInsert = q(".tag-insert");
        const tagClear = q(".tag-clear");
        if (tagInsert) tagInsert.addEventListener("pointerup", () => this.insertTags());
        if (tagClear) tagClear.addEventListener("pointerup", () => {
            this.chosenTags.clear();
            this.renderTagPanel();
        });
        //技能种类：一排按钮（形态照旧版编辑器的「技能种类」，不用下拉框）
        this.renderKindBar();
        this.renderTagPanel();
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
     * 渲染标签面板：按技能类型分组，点击切换选中
     * 冷色调：选中态用冷蓝，未选为半透明冷灰
     */
    renderTagPanel() {
        const root = this.shadowRoot.querySelector(".tag-groups");
        if (!root) return;
        const groups = getVisibleTagGroups(lib, this.skillTypes);
        root.replaceChildren();
        let index = 0;
        groups.forEach(group => {
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
                chip.title = tag.effect || tag.name;
                if (this.chosenTags.has(tag.key)) chip.classList.add("chosen");
                if (index >= TAG_VISIBLE_LIMIT) chip.classList.add("xy-ED-hidden");
                chip.addEventListener("pointerup", () => {
                    if (this.chosenTags.has(tag.key)) this.chosenTags.delete(tag.key);
                    else this.chosenTags.add(tag.key);
                    this.renderTagPanel();
                });
                list.appendChild(chip);
                index++;
            });
            box.appendChild(list);
            root.appendChild(box);
        });
        const counter = this.shadowRoot.querySelector(".tag-count");
        if (counter) {
            const names = groups.flatMap(g => g.tags).filter(t => this.chosenTags.has(t.key)).map(t => t.name);
            counter.textContent = names.length ? `已选 ${names.length} 项：${names.join("、")}` : "已选 0 项";
        }
    }
    /**
     * 把已选标签的内部键插入源码光标处（宏的 #tags 槽）
     */
    insertTags() {
        if (!this.sourceArea) return;
        if (!this.chosenTags.size) {
            this.setDiagnostics('<span class="warn">请先选择标签</span>');
            return;
        }
        const text = Array.from(this.chosenTags).join(", ");
        const start = this.sourceArea.selectionStart ?? this.sourceArea.value.length;
        const end = this.sourceArea.selectionEnd ?? start;
        this.replaceRange(start, end, text);
        this.setDiagnostics(`<span class="ok">已插入 ${this.chosenTags.size} 个标签</span>`);
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
     * 编译前注入宿主宏库的 import（HOST_IMPORT 不进文本框，行号按注入行数回退）。
     * 用户源码里已经手写了同一个 import 时不重复注入。
     * @param {string} source 用户源码
     * @returns {{ source: string, injected: number }} 注入后的源码与注入行数
     */
    prepareSource(source) {
        if (/^\s*import\s+["'][^"']*host\/skill-type\.shya["']/m.test(source)) return { source, injected: 0 };
        return { source: HOST_IMPORT + "\n" + source, injected: 1 };
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
        this.triggerEvent("tabTitleChange");
        return this;
    }
    /**
     * 设置技能类型标记（决定标签组可见性），供外部或后续「基本设置」工具调用
     * @param {string[]} types
     */
    setSkillTypes(types) {
        this.skillTypes = Array.isArray(types) ? types : [];
        this.renderTagPanel();
    }
}
customElements.define("shya-editor", HTMLNonameShyaEditorElement);
export { HTMLNonameShyaEditorElement };
