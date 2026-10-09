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
import { templateKinds, getSkillKind, hostImportEntries, DEFAULT_TEMPLATE_LANG } from "./shya/skillTemplates.mjs";
import { langOfSource, kindOfMacroName } from "./shya/slotLang.mjs";
import { checkSkillId } from "./shya/skillIdentity.mjs";
import { comboCandidates, comboChoiceMap, suggestComboId, isValidSkillId, buildComboSource, COMBO_MIN_CHILDREN } from "./shya/comboSkill.mjs";
import { injectSkillRegistration } from "./ai/skills.mjs";
import { createSkillDraft, getSkillDraft, readSkillDrafts, saveSkillDraft } from "./persist/skillLibrary.mjs";

// 宏库 import 的「已写过」判定与两份清单在 shya/skillTemplates.mjs:hostImportEntries()——
// 放模块里是为了让标签面板自检能把 prepareSource 抽出来跑（见 _x19D6_backup/tools）。
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
    /** 上一次成功编译出的 JS（源码一改就清空） */
    generatedCode = "";
    /** setSource 带进来的技能 id（编译产物出来之前先用它） */
    sourceSkillId = "";
    /** 草稿编号（`draft-<n>`；空 = 还没落库） */
    draftKeyValue = "";
    /** 自动保存的防抖计时器 */
    draftSaveTimer = null;
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
    /** 源码是否已被动过（没动过 = 空 / 初始示例 → 写模板与生成组合技都直接整块覆盖，不用确认） */
    sourceTouched = false;
    /** 上一次整块写进去的内容（种类模板 / 组合技源码）：源码还等于它就算「没动过」 */
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
        <span class="buttons">
            <button class="compile" type="button">编译</button>
            <button class="generate" type="button">生成</button>
            <button class="copy" type="button">复制代码</button>
            <button class="combine" type="button" title="把多个技能引用成一个组合技（原技能仍是独立技能，只被引用）">组合</button>
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
            //一动源码就记成「已编辑」：此后写模板 / 生成组合技都会先弹一次确认
            this.sourceArea.addEventListener("input", () => {
                this.sourceTouched = true;
                //源码改过 → 上一次的产物已经过期：清掉，免得「生成」把旧代码注册进 lib.skill。
                //（id 也从产物取，清了就自动退回源码里的槽）
                if (this.generatedCode) {
                    this.generatedCode = "";
                    const output = this.shadowRoot.querySelector(".output");
                    if (output) output.textContent = "";
                }
                this.triggerEvent("tabTitleChange");
                this.scheduleDraftSave();
            });
            //源码框内的按键增强（Tab 缩进、Enter 缩进、复制/删除行），详见 handleSourceKeydown
            this.sourceArea.addEventListener("keydown", e => this.handleSourceKeydown(e));
        }
        q(".compile").addEventListener("pointerup", () => this.compile());
        q(".generate").addEventListener("pointerup", () => this.generate());
        q(".copy").addEventListener("pointerup", () => this.copyCode());
        //「组合」：把多个技能草稿引用成一个组合技（原先的「组合技」种类模板已下线）
        const combineButton = q(".combine");
        if (combineButton) combineButton.addEventListener("pointerup", () => this.combineSkills());
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
        //草稿：视图在挂载前设好 draft-key，这里按它回填源码
        this.loadDraft();
        //标签面板按源码回填（模板/草稿里已有的标签槽一眼可见）
        this.syncTagsFromSource();
    }
    /**
     * 主区标签栏用的标题（技能：id）
     * @returns {string}
     */
    getTabTitle() {
        const id = this.currentSkillId();
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
            //技能 id 的冲突（与游戏本体/其它扩展重名、或与另一份草稿撞 id）：编译时就报，不必等到「生成」
            //只在编译成功时跑：语法错时再叠一条「没有 id」只会刷屏
            const conflicts = result && result.ok ? this.checkIdConflicts() : [];
            if (!list.length && !conflicts.length) {
                this.setDiagnostics(`<span class="ok">编译通过 ✓${result && result.ok ? `（技能 id：${this.escape(this.currentSkillId())}）` : "（但未产出代码）"}</span>`);
            } else {
                const rows = list.map(d => {
                    const cls = d.severity === "error" ? "err" : d.severity === "warning" ? "warn" : "";
                    const sev = d.severity === "error" ? "错误" : d.severity === "warning" ? "警告" : "提示";
                    const line = Math.max(1, d.line - prepared.injected);
                    return `<span class="${cls}">${line}:${d.col} ${sev} [${this.escape(d.code)}] ${this.escape(d.message)}</span>`;
                }).concat(conflicts.map(item => `<span class="err">${this.escape(item.message)}</span>`));
                this.setDiagnostics(rows.join("\n"));
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
        //安全线：与游戏本体 / 其它扩展重名、或与另一份草稿撞 id 都拒绝，绝不覆盖别人的技能（与 AI 区域同款）
        const conflicts = this.checkIdConflicts();
        if (conflicts.length) {
            this.setDiagnostics(conflicts.map(item => `<span class="err">${this.escape(item.message)}</span>`).join("\n"));
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
            this.writeDraft({
                id,
                source: this.sourceArea ? this.sourceArea.value : "",
                code: this.generatedCode,
                name: skill.translation || lib.translate[id] || "",
                description: skill.description || lib.translate[id + "_info"] || ""
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
        const source = this.sourceArea ? this.sourceArea.value : "";
        const matched = /@([^\s{(]+)/.exec(source);
        //宏名与种类 key 同名（@skill_trigger ↔ trigger）；中文库是 @触发技，靠 slotLang 反查
        return matched ? kindOfMacroName(matched[1]) : "";
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
        //关掉编辑器前把还没落盘的源码存掉（400ms 防抖可能还没到点）
        if (this.draftSaveTimer) {
            clearTimeout(this.draftSaveTimer);
            this.draftSaveTimer = null;
            this.saveDraft();
        }
    }
    /** 草稿编号：视图挂载前用 draft-key 属性传进来（与武将编辑器同一套） */
    get draftKey() {
        return this.draftKeyValue || this.getAttribute("draft-key") || "";
    }
    set draftKey(value) {
        this.draftKeyValue = value || "";
        if (value) this.setAttribute("draft-key", value);
        else this.removeAttribute("draft-key");
    }
    /** 当前工作区（草稿归属） */
    workspaceName() {
        return this.configQuery("get", { member: "x19D6_editor.settings.workspace" }) || "";
    }
    /** 按 draft-key 载入草稿源码（挂载时调用；没有草稿就保持示例源码） */
    loadDraft() {
        const key = this.getAttribute("draft-key") || "";
        if (!key) return false;
        const record = getSkillDraft(this, key);
        if (!record) return false;
        this.draftKeyValue = key;
        if (this.sourceArea && record.source) {
            this.sourceArea.value = record.source;
            this.sourceTouched = true;
            this.lastTemplateText = "";
        }
        this.syncTagsFromSource();
        this.triggerEvent("tabTitleChange");
        return true;
    }
    /**
     * 源码变动后 400ms 防抖存草稿（与武将编辑器的自动保存同一条节奏）。
     * 空草稿（没源码、没 id、没名字）不落库。
     */
    scheduleDraftSave() {
        if (this.draftSaveTimer) clearTimeout(this.draftSaveTimer);
        this.draftSaveTimer = setTimeout(() => {
            this.draftSaveTimer = null;
            this.saveDraft();
        }, 400);
    }
    /** 存草稿：把编号/源码/产物写进技能库；返回草稿编号（没落库时返回 ""） */
    saveDraft() {
        const source = this.sourceArea ? this.sourceArea.value : "";
        const id = this.currentSkillId();
        const patch = { source };
        if (id) patch.id = id;
        if (this.generatedCode) patch.code = this.generatedCode;
        if (!this.draftKey && !source.trim() && !id) return "";
        const saved = this.writeDraft(patch);
        return saved ? saved.draftKey : "";
    }
    /**
     * 把补丁写进当前草稿（还没有编号就新建一份并记下编号）。
     * 「生成」也走这里：id / 名称 / 描述 / 产物一次写全，侧栏列表立刻能看到。
     * @param {object} patch
     * @returns {{draftKey: string, record: object}|null}
     */
    writeDraft(patch) {
        const filled = { ...patch, workspace: this.workspaceName() };
        const saved = this.draftKey
            ? saveSkillDraft(this, this.draftKey, filled)
            : createSkillDraft(this, filled);
        if (saved) this.draftKey = saved.draftKey;
        //外壳据此刷新侧栏列表 + 防抖落盘
        this.triggerEvent("draftSaved");
        return saved;
    }
    /** 工作区换了：把草稿归属写到新工作区（与武将编辑器一致） */
    syncWorkspace() {
        if (!this.draftKey) return;
        saveSkillDraft(this, this.draftKey, { workspace: this.workspaceName() });
    }
    /**
     * 技能 id 的冲突检测（编译时显示、「生成」时拦人；判据在 shya/skillIdentity.mjs）。
     * 「自己这份草稿」用同一个 id 不算冲突（改完再编译的常态）。
     * @returns {Array<{code: string, severity: string, message: string}>}
     */
    checkIdConflicts() {
        return checkSkillId({
            id: this.currentSkillId(),
            draftKey: this.draftKey,
            skillTable: lib.skill,
            drafts: readSkillDrafts(this)
        });
    }
    /** 设置里的模板语言（默认中文；认不出源码语言时用它） */
    templateLang() {
        const saved = this.configQuery("get", { member: "x19D6_editor.settings.templateLang" });
        return saved === "en" ? "en" : DEFAULT_TEMPLATE_LANG;
    }
    /**
     * 这份源码用的是哪套插槽：源码认得出就按源码（改设置不会破坏已有草稿），
     * 空源码 / 认不出（比如只写了注释）才用设置里的默认语言。
     * @param {string} [source]
     * @returns {"cn"|"en"}
     */
    sourceLang(source = this.sourceArea ? this.sourceArea.value : "") {
        return langOfSource(source) || this.templateLang();
    }
    /**
     * 技能 id：**以编译产物为准**（产物恒为 `const <id> = { … }`，与模板语言无关），
     * 编译没过时退回源码里的 `#skill` / `#技能` 槽，再退回 setSource 带进来的 hint。
     * 输入框已按需求去掉——id 是「从代码里读出来的」，不是填出来的。
     * @returns {string}
     */
    currentSkillId() {
        const compiled = /(?:^|[\s;])(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\{/.exec(this.generatedCode || "");
        if (compiled) return compiled[1];
        const source = this.sourceArea ? this.sourceArea.value : "";
        const slot = /#(?:skill|技能)\s*:\s*([A-Za-z_$][\w$]*)/.exec(source);
        if (slot) return slot[1];
        return this.sourceSkillId || "";
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
        const lang = this.sourceLang();
        const lines = linesFromTags(this.chosenTags, {
            lang,
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
            const result = replaceInlineSlot(this.sourceArea.value, slot, slotLines, lang);
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
        templateKinds(this.sourceLang()).forEach(kind => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "kind-button";
            button.dataset.kind = kind.key;
            button.textContent = kind.name;
            button.title = `${kind.name}：${kind.hint || ""}\n点击即把该类模板整块写进源码（一个技能草稿只放一个技能；源码手改过时会先弹确认）；换种类会清空标签勾选`;
            if (this.currentKind === kind.key) button.classList.add("chosen");
            button.addEventListener("pointerup", () => this.chooseKind(kind.key));
            root.appendChild(button);
        });
    }
    /**
     * 选中某个技能种类：更新选中态、**把标签面板归零**，再把该类模板**整块**写进源码。
     * 一个技能草稿 = 一个技能文件：点种类不再往光标处插模板（那样一份草稿里会堆出好几个技能）；
     * 源码已被手改过时先弹确认（设置页「写入模板前确认」可关）；
     * 点**已经选中**的那个种类不做任何事（否则整块重写会把面板里已选好的标签一起清掉）。
     * 换种类 = 直接清除覆盖：上一种的标签勾选与源码里的托管区一起清掉，只留新模板自带的标签槽——
     * 不这样做，面板会像标签页一样把上一种的标签一直留着。
     * @param {string} key 技能种类的 key
     */
    async chooseKind(key) {
        const kind = getSkillKind(key, this.sourceLang());
        if (!kind) return;
        const switched = this.currentKind !== key;
        //点已经选中的那个种类 = 什么都不做（点同一个种类不该清掉面板里已选好的标签）
        if (!switched) {
            this.renderKindBar();
            return;
        }
        this.currentKind = key;
        this.renderKindBar();
        //换种类 = 直接清除覆盖：上一种的标签勾选归零（源码里的托管区随整块覆盖一起没了）
        this.resetTagState();
        this.insertTemplate(key);
    }
    /** 源码是不是「没被动过」：初始示例 / 空 / 上一次整块写进去的内容 */
    sourceIsPristine() {
        const node = this.sourceArea;
        if (!node) return true;
        return !this.sourceTouched || !node.value.trim() || node.value === this.lastTemplateText;
    }
    /**
     * 把某类技能的最简模板**整块**写进源码（一个技能草稿只放一个技能，不再插到光标处）。
     * @param {string} key 技能种类的 key
     */
    insertTemplate(key) {
        const kind = getSkillKind(key, this.sourceLang());
        if (!kind || !this.sourceArea) return;
        this.applySource(kind.template);
        this.setDiagnostics(`<span class="ok">已写入「${kind.name}」模板：${this.escape(kind.hint || "")}</span>`);
    }
    /**
     * 整块写入源码（种类模板 / 组合技共用）：光标回开头、视野回顶部，并按新源码回填标签面板与草稿标题。
     * @param {string} text
     */
    applySource(text) {
        const node = this.sourceArea;
        if (!node) return;
        this.replaceRange(0, node.value.length, text);
        node.setSelectionRange(0, 0);
        node.scrollTop = 0;
        this.lastTemplateText = text;
        this.triggerEvent("tabTitleChange");
        this.syncTagsFromSource();
        this.scheduleDraftSave();
    }
    /**
     * 弹一次 <noname-dialog> 并等结果。
     * ⚠️ 属性顺序必须是 payload → type → headline/message（type 分支当场读 payload，又会清空 headline/message）。
     * @param {{ type?: string, payload?: any, headline?: string, message?: string, single?: boolean }} config
     * @returns {Promise<any>}
     */
    async askDialog(config = {}) {
        const { type, payload, headline, message, single = false } = config;
        const dialog = document.createElement("noname-dialog");
        if (payload !== undefined && payload !== null) {
            dialog.setAttribute("payload", typeof payload === "string" ? payload : JSON.stringify(payload));
        }
        if (type) dialog.setAttribute("type", type);
        if (single) dialog.setAttribute("single", "true");
        if (headline) dialog.setAttribute("headline", headline);
        if (message) dialog.setAttribute("message", message);
        (ui.window || document.body).appendChild(dialog);
        try {
            return await dialog.wait();
        } catch (err) {
            return null;
        } finally {
            dialog.remove();
        }
    }
    /**
     * 工具栏「组合」：把**多个技能草稿**引用成一个组合技（原技能仍是独立草稿 / 独立文件，只被引用）。
     * 流程：多选技能 → 填 id / 名称 → 整块写进当前草稿；
     * 当前草稿已经有别的内容时**另开一份新草稿**并打开它（绝不覆盖别的技能）。
     */
    async combineSkills() {
        const drafts = readSkillDrafts(this);
        const candidates = comboCandidates({
            drafts,
            skillTable: lib.skill,
            workspace: this.workspaceName(),
            excludeId: this.currentSkillId()
        });
        if (candidates.length < COMBO_MIN_CHILDREN) {
            await this.askDialog({
                type: "alert",
                headline: "组合技",
                message: `至少要两份「有技能 id」的草稿才能组合（当前 ${candidates.length} 份，不含本草稿自己）。`
            });
            return;
        }
        const picked = await this.askDialog({
            type: "search-select",
            payload: comboChoiceMap(candidates),
            headline: "组合技：选择要引用的技能",
            message: `可多选（至少 ${COMBO_MIN_CHILDREN} 个）；带「未生成」的子技先单独生成一次，组合技才引用得到`
        });
        const children = (Array.isArray(picked) ? picked : []).filter(Boolean);
        if (!children.length) return;
        if (children.length < COMBO_MIN_CHILDREN) {
            await this.askDialog({ type: "alert", headline: "组合技", message: `至少要选 ${COMBO_MIN_CHILDREN} 个技能。` });
            return;
        }
        const usedIds = [
            ...Object.keys(lib.skill || {}),
            ...Object.values(drafts).map(record => (record && record.id) || "").filter(Boolean)
        ];
        const fields = await this.askDialog({
            type: "multi-input",
            payload: [
                { label: "组合技 id", value: suggestComboId(children, usedIds) },
                { label: "技能名称", value: "组合技" }
            ],
            headline: "组合技：命名"
        });
        if (!Array.isArray(fields)) return;
        const id = String(fields[0] || "").trim();
        const name = String(fields[1] || "").trim();
        if (!isValidSkillId(id)) {
            await this.askDialog({
                type: "alert",
                headline: "组合技",
                message: `技能 id 只能由字母、数字、下划线组成，且不能以数字开头：「${id}」不行。`
            });
            return;
        }
        //就地改写当前草稿时，同 id 的「自己」不算冲突；另开新草稿时就得按新草稿判
        const reuseCurrent = this.sourceIsPristine();
        const conflicts = checkSkillId({ id, draftKey: reuseCurrent ? this.draftKey : "", skillTable: lib.skill, drafts });
        if (conflicts.length) {
            await this.askDialog({
                type: "alert",
                headline: "组合技 id 冲突",
                message: conflicts.map(item => item.message).join("\n")
            });
            return;
        }
        const source = buildComboSource({ id, name, children, lang: this.sourceLang() });
        if (reuseCurrent) {
            this.currentKind = "";
            this.renderKindBar();
            this.resetTagState();
            this.applySource(source);
            this.setDiagnostics(`<span class="ok">已生成组合技「${this.escape(name || id)}」，引用：${this.escape(children.join("、"))}</span>`);
            this.saveDraft();
            return;
        }
        const saved = createSkillDraft(this, { id, name, source, workspace: this.workspaceName() });
        if (!saved) {
            await this.askDialog({ type: "alert", headline: "组合技", message: "新建技能草稿失败，请重试。" });
            return;
        }
        if (typeof game.x19D6_openShyaSkillEditor === "function") game.x19D6_openShyaSkillEditor({ draftKey: saved.draftKey });
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
        const missing = hostImportEntries(this.sourceLang(source))
            .filter(([, pattern]) => !pattern.test(source))
            .map(([text]) => text);
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
        //id 现在由「编译产物」决定，这里只留一个 hint（还没编译时给标题与生成用）
        const fromSource = (/#(?:skill|技能)\s*:\s*([A-Za-z_$][\w$]*)/.exec(String(code || "")) || [])[1] || "";
        this.sourceSkillId = skillId || fromSource || "";
        this.syncTagsFromSource();
        this.triggerEvent("tabTitleChange");
        //AI 区域塞进来的源码同样进草稿库（防抖 400ms）
        this.scheduleDraftSave();
        return this;
    }
}
customElements.define("shya-editor", HTMLNonameShyaEditorElement);
export { HTMLNonameShyaEditorElement };
