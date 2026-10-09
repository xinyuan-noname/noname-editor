"use script";
import { lib, game, ui, get, ai, _status } from "../../../../noname.js";
import { HTMLNonameFocusUIElement } from "./component-base.mjs";
import {
    TAG_PAGES,
    TAG_NUMBER_MIN,
    TAG_NUMBER_MAX,
    SPECIAL_TAG_PREFIXES,
    SPECIAL_TAG_GROUPS,
    getSpecialGroups,
    tagPagesForKind,
    specialGroupForTag,
    linesFromTags,
    readTagRegion,
    writeTagRegion,
    clearTagRegion,
    replaceInlineSlot,
    tagsFromTagLines,
    tagNumbersFromSource,
    tagFromSlotLine,
    inlineTagKeys,
    inlineTagSlots,
    tagSlotName,
    INLINE_REPLACEABLE_SLOTS
} from "./shya/tags.mjs";
import { SKILL_KINDS, getSkillKind } from "./shya/skillTemplates.mjs";
import { injectSkillRegistration } from "./ai/skills.mjs";
import { getSkillRecord, setSkillRecord } from "./persist/skillLibrary.mjs";

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
    /** 标签面板当前页（TAG_PAGES 的 key；换种类后归零，由面板退回第一页） */
    activeTagPage = "";
    /** 「每回合限n次 / 每n轮限一次」里的 n（芯片旁的 − / + 调） */
    tagNumbers = { usable: 1, round: 1 };
    /** 齿轮弹出的小面板，与它「点别处收起」的监听 */
    specialPopup = null;
    specialPopupCloser = null;
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
</section>`
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
        //（次数没有底部输入框：usable / round 的 − / + 就画在对应芯片旁边）
        const tagInsert = q(".tag-insert");
        const tagClear = q(".tag-clear");
        if (tagInsert) tagInsert.addEventListener("pointerup", () => this.writeTags());
        if (tagClear) tagClear.addEventListener("pointerup", () => this.clearTags());
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
     * 生成：与旧编辑器「生成」同义——在游戏上下文里求值，局内立即生效。
     *
     * ⚠️ 编译产物是**模块级常量**（`const <id> = { … }`），直接求值什么也不会注册，
     * 要先过 ai/skills.mjs 的注入层（接到 lib.skill / lib.translate）。
     * 生成成功的同时记进技能库：保存武将时会连技能定义一起落盘。
     */
    generate() {
        if (!this.generatedCode) {
            this.setDiagnostics('<span class="warn">请先成功编译一次</span>');
            return;
        }
        const id = this.currentSkillId();
        //安全线：与游戏或其它扩展已有的技能重名就拒绝，绝不覆盖别人的技能（与 AI 区域同款）
        if (id && lib.skill[id] && !getSkillRecord(this, id)) {
            this.setDiagnostics(`<span class="err">技能 id「${this.escape(id)}」在游戏或其它扩展里已经存在，换个 id 再生成</span>`);
            return;
        }
        const injected = injectSkillRegistration(this.generatedCode, id);
        if (!injected.ok) {
            this.setDiagnostics(`<span class="err">生成失败：${this.escape(injected.reason)}</span>`);
            return;
        }
        try {
            const run = new Function("_status", "lib", "game", "ui", "get", "ai", injected.code);
            run(_status, lib, game, ui, get, ai);
            const skill = lib.skill[id];
            if (!skill) throw new Error("注册后 lib.skill 里仍然没有这个技能");
            setSkillRecord(this, id, {
                source: this.sourceArea ? this.sourceArea.value : "",
                code: this.generatedCode,
                name: skill.translation || lib.translate[id] || "",
                description: skill.description || lib.translate[id + "_info"] || "",
                workspace: this.configQuery("get", { member: "x19D6_editor.settings.workspace" }) || ""
            });
            this.setDiagnostics(`<span class="ok">已生成并在本局生效 ✓（技能 id：${this.escape(id)}；武将编辑器的技能列表里就能选到它，保存武将时会一起落盘）</span>`);
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
     * 标签面板：页签（**按技能种类过滤**）+ 当前页 chips + 底部计数。
     * 值型标签（usable / round）自带 − / + 记数器；带特殊设置的标签（势力 / 技能动画 /
     * 宗族 / 主将·副将）自带 ⚙ —— 点开就是旧版「特殊设置」页那一组候选。
     * 冷色调：选中态用冷蓝，未选为半透明冷灰。
     */
    renderTagPanel() {
        this.renderTagPages();
        this.renderTagChips();
        this.renderTagCount();
    }
    /**
     * 面板判定用的技能种类：点过「技能种类」按钮就用它，否则按源码里的宏名推断
     * （宏名与种类 key 同名：@skill_trigger → trigger、@skill_raw → raw …）。
     * @returns {string}
     */
    panelKind() {
        if (this.currentKind) return this.currentKind;
        const matched = /@skill_([A-Za-z_]\w*)/.exec(this.sourceArea ? this.sourceArea.value : "");
        if (!matched) return "";
        return SKILL_KINDS.some(kind => kind.key === matched[1]) ? matched[1] : "";
    }
    /** 页签：按技能种类过滤（「选角色」只给主动技与自由技能，见 tags.mjs 的 TARGET_PAGE_KINDS） */
    renderTagPages() {
        const root = this.shadowRoot.querySelector(".tag-pages");
        if (!root) return;
        const pages = tagPagesForKind(this.panelKind());
        if (!pages.some(page => page.key === this.activeTagPage)) this.activeTagPage = pages.length ? pages[0].key : "";
        root.replaceChildren();
        pages.forEach(page => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "tag-page";
            button.dataset.tagPage = page.key;
            button.textContent = page.name;
            button.title = page.description || "";
            if (this.activeTagPage === page.key) button.classList.add("chosen");
            button.addEventListener("pointerup", () => {
                this.activeTagPage = page.key;
                this.renderTagPanel();
            });
            root.appendChild(button);
        });
    }
    /** 当前页的 chips（当前页被种类过滤掉时退回第一页） */
    renderTagChips() {
        const root = this.shadowRoot.querySelector(".tag-groups");
        if (!root) return;
        this.closeSpecialPopup();
        root.replaceChildren();
        const pages = tagPagesForKind(this.panelKind());
        const page = pages.find(item => item.key === this.activeTagPage) || pages[0];
        if (page) root.appendChild(this.createTagGroup(page));
    }
    /**
     * 画一个标签组（组名 + chips）
     * @param {{name:string,description?:string,tags:Array<{key:string,name:string,hint?:string,counter?:string}>}} group
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
        group.tags.forEach(tag => list.appendChild(this.createTagItem(tag)));
        box.appendChild(list);
        return box;
    }
    /**
     * 一个标签 = 芯片 + 可能的 − / + 记数器（值型标签）+ ⚙（带特殊设置的标签）
     * @param {{key:string,name:string,hint?:string,counter?:string}} tag
     */
    createTagItem(tag) {
        const item = document.createElement("span");
        item.className = "tag-item";
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "tag-chip";
        chip.dataset.tagKey = tag.key;
        chip.textContent = tag.name;
        chip.title = tag.hint || tag.name;
        if (this.chosenTags.has(tag.key)) chip.classList.add("chosen");
        chip.addEventListener("pointerup", () => this.toggleTag(tag.key));
        item.appendChild(chip);
        if (tag.counter) item.appendChild(this.createTagStepper(tag));
        if (specialGroupForTag(tag.key)) {
            item.appendChild(this.createTagGear(tag.key));
            const value = this.specialTagName(tag.key);
            if (value) {
                const badge = document.createElement("span");
                badge.className = "tag-value";
                badge.textContent = value;
                badge.title = `已设：${value}`;
                item.appendChild(badge);
            }
        }
        return item;
    }
    /** 值型标签的 − / + 记数器（点一下就把这个标签选上，次数直接进 tagNumbers） */
    createTagStepper(tag) {
        const which = tag.counter;
        const box = document.createElement("span");
        box.className = "tag-stepper";
        box.title = tag.hint || "";
        const minus = document.createElement("button");
        minus.type = "button";
        minus.className = "tag-step-btn";
        minus.dataset.tagStep = which;
        minus.dataset.stepDelta = "-1";
        minus.textContent = "−";
        minus.addEventListener("pointerup", () => this.setTagNumber(which, this.tagNumbers[which] - 1));
        const input = document.createElement("input");
        input.className = "tag-step-value";
        input.dataset.tagStepValue = which;
        input.type = "text";
        input.inputMode = "numeric";
        input.value = String(this.tagNumbers[which]);
        input.addEventListener("change", () => this.setTagNumber(which, input.value));
        const plus = document.createElement("button");
        plus.type = "button";
        plus.className = "tag-step-btn";
        plus.dataset.tagStep = which;
        plus.dataset.stepDelta = "1";
        plus.textContent = "＋";
        plus.addEventListener("pointerup", () => this.setTagNumber(which, this.tagNumbers[which] + 1));
        box.append(minus, input, plus);
        return box;
    }
    /** 带特殊设置的标签旁的齿轮：点开弹这一组的候选（势力 / 动画色 / 宗族 / 阴阳鱼） */
    createTagGear(tagKey) {
        const group = this.specialGroupOf(tagKey);
        const gear = document.createElement("button");
        gear.type = "button";
        gear.className = "tag-gear";
        gear.dataset.tagGear = tagKey;
        gear.textContent = "⚙";
        gear.title = group ? `${group.name}设置：${group.description || ""}` : "设置";
        if (group && group.tags.some(tag => this.chosenTags.has(tag.key))) gear.classList.add("chosen");
        gear.addEventListener("pointerup", event => {
            event.stopPropagation();
            this.openSpecialPopup(tagKey, gear);
        });
        return gear;
    }
    /** 这个标签对应的特殊设置组（没有齿轮返回 null） */
    specialGroupOf(tagKey) {
        if (!specialGroupForTag(tagKey)) return null;
        return getSpecialGroups(lib, [tagKey])[0] || null;
    }
    /** 这个标签当前选中的具体值（势力 / 动画色 / 宗族名），没有返回空串 */
    specialTagName(tagKey) {
        const group = this.specialGroupOf(tagKey);
        if (!group) return "";
        const chosen = group.tags.find(tag => this.chosenTags.has(tag.key));
        return chosen ? chosen.name : "";
    }
    /** 往选中集合里加一个标签：四类特殊前缀互斥 + 同一个槽只留一条（不渲染） */
    selectTag(key) {
        SPECIAL_TAG_PREFIXES.forEach(prefix => {
            if (!key.startsWith(prefix)) return;
            for (const chosen of [...this.chosenTags]) {
                if (chosen.startsWith(prefix)) this.chosenTags.delete(chosen);
            }
        });
        const slot = tagSlotName(key);
        if (slot) {
            for (const chosen of [...this.chosenTags]) {
                if (chosen !== key && tagSlotName(chosen) === slot) this.chosenTags.delete(chosen);
            }
        }
        this.chosenTags.add(key);
    }
    /**
     * 选中/取消一个标签（同槽只留一条；特殊设置四类前缀互斥）
     * @param {string} key 标签内部键
     */
    toggleTag(key) {
        if (this.chosenTags.has(key)) this.chosenTags.delete(key);
        else this.selectTag(key);
        this.renderTagPanel();
    }
    /** − / + 或手填改次数（1~20）：同时把这个值型标签选上——点加减号就是要用它 */
    setTagNumber(which, value) {
        this.tagNumbers[which] = this.clampTagNumber(value);
        if (!this.chosenTags.has(which)) this.selectTag(which);
        this.renderTagPanel();
    }
    /**
     * 齿轮弹的小面板：列这一组的候选值，选中即写进标签。
     * 候选与旧版「特殊设置」页同一批（getSpecialGroups），只是从整页收进了齿轮里。
     * @param {string} tagKey 带齿轮的标签键
     * @param {HTMLElement} anchor 齿轮节点（定位用）
     */
    openSpecialPopup(tagKey, anchor) {
        this.closeSpecialPopup();
        const group = this.specialGroupOf(tagKey);
        if (!group || !anchor) return;
        const popup = document.createElement("div");
        popup.className = "tag-popup";
        const title = document.createElement("div");
        title.className = "tag-popup-title";
        title.textContent = group.name;
        popup.appendChild(title);
        const list = document.createElement("div");
        list.className = "tag-popup-list";
        group.tags.forEach(tag => {
            const option = document.createElement("button");
            option.type = "button";
            option.className = "tag-popup-option";
            option.dataset.tagOption = tag.key;
            option.textContent = tag.name;
            option.title = tag.hint || tag.name;
            if (this.chosenTags.has(tag.key)) option.classList.add("chosen");
            option.addEventListener("pointerup", () => this.chooseSpecialTag(tagKey, tag.key));
            list.appendChild(option);
        });
        popup.appendChild(list);
        const clear = document.createElement("button");
        clear.type = "button";
        clear.className = "tag-popup-option clear";
        clear.textContent = "清除";
        clear.addEventListener("pointerup", () => this.clearSpecialTag(group));
        popup.appendChild(clear);
        //定位按齿轮在视口里的位置现算（面板是 shadowRoot + overflow:auto，fixed 才不会被裁）
        const rect = anchor.getBoundingClientRect();
        popup.style.left = `${Math.max(4, Math.min(rect.left, window.innerWidth - 220))}px`;
        popup.style.top = `${rect.bottom + 4}px`;
        this.shadowRoot.appendChild(popup);
        this.specialPopup = popup;
        this.specialPopupCloser = event => {
            if (popup.contains(event.target)) return;
            this.closeSpecialPopup();
        };
        this.shadowRoot.addEventListener("pointerdown", this.specialPopupCloser, true);
    }
    /** 收起齿轮小面板（幂等） */
    closeSpecialPopup() {
        if (this.specialPopupCloser) {
            this.shadowRoot.removeEventListener("pointerdown", this.specialPopupCloser, true);
            this.specialPopupCloser = null;
        }
        if (this.specialPopup) {
            this.specialPopup.remove();
            this.specialPopup = null;
        }
    }
    /** 齿轮面板里选一个具体值：特殊值 + 它的父标签一起选中（`#groupSkill: "wei"` 也意味着「势力技」） */
    chooseSpecialTag(tagKey, optionKey) {
        this.selectTag(optionKey);
        this.chosenTags.add(tagKey);
        this.closeSpecialPopup();
        this.renderTagPanel();
    }
    /** 齿轮面板里的「清除」：这一组的特殊值全部取消（父标签留着） */
    clearSpecialTag(group) {
        group.tags.forEach(tag => this.chosenTags.delete(tag.key));
        this.closeSpecialPopup();
        this.renderTagPanel();
    }
    /** 面板归零：换技能种类 / 「清空」都走这里（别像标签页那样把上一种的标签留着） */
    resetTagState() {
        this.chosenTags = new Set();
        this.tagNumbers = { usable: TAG_NUMBER_MIN, round: TAG_NUMBER_MIN };
        this.activeTagPage = "";
        this.closeSpecialPopup();
    }
    /** 底部「已选 N 项」 */
    renderTagCount() {
        const counter = this.shadowRoot.querySelector(".tag-count");
        if (!counter) return;
        const names = new Map();
        TAG_PAGES.forEach(page => page.tags.forEach(tag => names.set(tag.key, tag.name)));
        SPECIAL_TAG_GROUPS.forEach(item => {
            const group = this.specialGroupOf(item.tag);
            if (group) group.tags.forEach(tag => names.set(tag.key, tag.name));
        });
        const chosen = [...this.chosenTags].map(key => names.get(key) || key);
        counter.textContent = chosen.length ? `已选 ${chosen.length} 项：${chosen.join("、")}` : "已选 0 项";
    }
    /** 「每回合限n次 / 每n轮限一次」的 n 限制在 1~20（旧版 range 对话框同款） */
    clampTagNumber(value) {
        const num = Math.round(Number(value));
        if (!Number.isFinite(num)) return TAG_NUMBER_MIN;
        return Math.max(TAG_NUMBER_MIN, Math.min(TAG_NUMBER_MAX, num));
    }
    /** 组件被移除时把齿轮小面板一起收掉（它是挂在 shadowRoot 上的 fixed 节点） */
    disconnectedCallback() {
        this.closeSpecialPopup();
    }
    /** 技能 id：优先工具栏输入框，其次源码的 #skill 槽（特殊标签 mainVice-remove1 要写进 init 里） */
    currentSkillId() {
        const input = this.shadowRoot.querySelector(".skill-id");
        if (input && input.value.trim()) return input.value.trim();
        const matched = /#skill:\s*([A-Za-z_$][\w$]*)/.exec(this.sourceArea ? this.sourceArea.value : "");
        return matched ? matched[1] : "";
    }
    /**
     * 把已选标签写进源码：
     *   · 值型槽（usable / round / locked / …）在宏体里**手写过**时，就地改那一行——
     *     否则芯片旁 − / + 调出来的次数落不进源码（@skill_phaseUse 模板自带 #usable: 1 就是这种情况）；
     *   · 其余写进 //#tags-begin … //#tags-end 托管区（存在就整块替换）；
     *   · 宏体里已经手写过的其它槽不再重复写（同名槽编译器不报错、后者胜，但两条互相矛盾很坑）。
     */
    writeTags() {
        if (!this.sourceArea) return;
        if (!this.chosenTags.size) {
            this.setDiagnostics('<span class="warn">请先在上面选标签</span>');
            return;
        }
        const lines = linesFromTags(this.chosenTags, {
            skillId: this.currentSkillId(),
            main: this.chosenTags.has("mainSkill"),
            vice: this.chosenTags.has("viceSkill"),
            numbers: this.tagNumbers
        });
        const inlineSlots = inlineTagSlots(this.sourceArea.value);
        const regionLines = [];
        const inlineLines = new Map();
        let skipped = 0;
        for (const line of lines) {
            const slot = tagSlotName(tagFromSlotLine(line) || "");
            if (!slot || !inlineSlots.has(slot)) {
                regionLines.push(line);
                continue;
            }
            if (!INLINE_REPLACEABLE_SLOTS.includes(slot)) {
                skipped++;
                continue;
            }
            if (!inlineLines.has(slot)) inlineLines.set(slot, []);
            inlineLines.get(slot).push(line);
        }
        //宏体里手写的值型槽：就地改那一行（一次改一处，改完重新取文本，位置不会串）
        let replaced = 0;
        for (const [slot, slotLines] of inlineLines) {
            const result = replaceInlineSlot(this.sourceArea.value, slot, slotLines);
            if (!result.ok) {
                regionLines.push(...slotLines);
                continue;
            }
            if (this.sourceArea.value.slice(result.start, result.end) === result.text) continue;
            this.replaceRange(result.start, result.end, result.text);
            replaced++;
        }
        if (regionLines.length) {
            const result = writeTagRegion(this.sourceArea.value, regionLines);
            if (!result.ok) {
                this.setDiagnostics(`<span class="warn">${this.escape(result.reason)}</span>`);
                return;
            }
            this.replaceRange(result.start, result.end, result.text);
        } else {
            const removed = clearTagRegion(this.sourceArea.value);
            if (removed.ok) this.replaceRange(removed.start, removed.end, removed.text);
        }
        const done = [];
        if (regionLines.length) done.push(`托管区写入 ${regionLines.length} 行`);
        if (replaced) done.push(`就地改了 ${replaced} 处手写槽`);
        if (skipped) done.push(`跳过 ${skipped} 条宏体里已写过的标签`);
        this.setDiagnostics(`<span class="ok">${done.length ? done.join("，") : "已选的标签都已在源码里"}</span>`);
    }
    /** 清空：面板选择清掉（次数归 1），源码里的托管区也删掉（宏体里手写的标签槽不动） */
    clearTags() {
        this.resetTagState();
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
        //次数从**整段宏体**里扫（托管区行也在宏体内）：模板自带或手写的 #usable: 3 才读得回来
        this.tagNumbers = tagNumbersFromSource(this.sourceArea.value);
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
            button.title = `${kind.name}：${kind.hint || ""}\n点击即把该类模板写进源码（源码还是初始示例时整块替换，否则插到光标处）；换种类会清空标签勾选与 //#tags-begin…end 托管区`;
            if (this.currentKind === kind.key) button.classList.add("chosen");
            button.addEventListener("pointerup", () => this.chooseKind(kind.key));
            root.appendChild(button);
        });
    }
    /**
     * 选中某个技能种类：更新选中态、**把标签面板归零**，再写入该类模板。
     * 换种类 = 直接清除覆盖：上一种的标签勾选与源码里的托管区一起清掉，只留新模板自带的标签槽——
     * 不这样做，面板会像标签页一样把上一种的标签一直留着。
     * @param {string} key SKILL_KINDS 里的 key
     */
    chooseKind(key) {
        if (!getSkillKind(key)) return;
        const switched = this.currentKind !== key;
        const overwrite = this.canReplaceSource();
        this.currentKind = key;
        this.renderKindBar();
        if (switched) {
            this.resetTagState();
            //整块覆盖时托管区随旧源码一起去掉；插到光标处时才需要单独清掉它
            if (!overwrite) {
                const removed = this.sourceArea ? clearTagRegion(this.sourceArea.value) : { ok: false };
                if (removed.ok) this.replaceRange(removed.start, removed.end, removed.text);
            }
        }
        this.insertTemplate(key, { overwrite });
    }
    /** 源码没动过 / 是空的 / 还等于上一次写进去的模板 → 换种类时整块覆盖（否则只插到光标处） */
    canReplaceSource() {
        const node = this.sourceArea;
        if (!node) return false;
        return !this.sourceTouched || !node.value.trim() || node.value === this.lastTemplateText;
    }
    /**
     * 把某类技能的最简模板写进源码：源码为空或还是初始示例时整块替换，否则插到光标处
     * @param {string} key SKILL_KINDS 里的 key
     * @param {{ overwrite?: boolean }} [options] overwrite=true 强制整块覆盖（换种类时由 chooseKind 传）
     */
    insertTemplate(key, options = {}) {
        const kind = getSkillKind(key);
        if (!kind || !this.sourceArea) return;
        const text = kind.template;
        const node = this.sourceArea;
        //没动过 / 空 / 还是上一次写进去的模板（或调用方明确要求覆盖）→ 整块替换，点着换种类不会越堆越多
        if (options.overwrite === true || this.canReplaceSource()) {
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
