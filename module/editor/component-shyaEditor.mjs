"use script";
import { lib, game, ui, get, ai, _status } from "../../../../noname.js";
import { HTMLNonameFocusUIElement } from "./component-base.mjs";
import { getVisibleTagGroups, TAG_VISIBLE_LIMIT } from "./shya/tags.mjs";

const EXAMPLE_SOURCE = [
    "// 示例：给「你」写一个受伤后回血的触发技",
    "// 宿主声明与宏库见 shya/host/*.shya",
    "declare Player { hp: number  maxHp: number  recover(n: number): void }",
    "@trigger {",
    "   #skill:mySkill",
    "   #trigger:\"phaseEnd\"",
    "   #content:{",
    "       player draw(2)",
    "   }",
    "}"
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
            const result = compiler.compile(this.sourceArea ? this.sourceArea.value : "");
            this.generatedCode = result && result.ok ? result.code : "";
            const list = (result && result.diagnostics) || [];
            if (!list.length) {
                this.setDiagnostics(`<span class="ok">编译通过 ✓${result && result.ok ? "" : "（但未产出代码）"}</span>`);
            } else {
                this.setDiagnostics(list.map(d => {
                    const cls = d.severity === "error" ? "err" : d.severity === "warning" ? "warn" : "";
                    const sev = d.severity === "error" ? "错误" : d.severity === "warning" ? "警告" : "提示";
                    return `<span class="${cls}">${d.line}:${d.col} ${sev} [${this.escape(d.code)}] ${this.escape(d.message)}</span>`;
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
        const value = this.sourceArea.value;
        this.sourceArea.value = value.slice(0, start) + text + value.slice(end);
        this.sourceArea.selectionStart = this.sourceArea.selectionEnd = start + text.length;
        this.sourceArea.focus();
        this.setDiagnostics(`<span class="ok">已插入 ${this.chosenTags.size} 个标签</span>`);
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
