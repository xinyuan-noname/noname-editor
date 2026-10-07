import { lib, game, ui, get, ai, _status } from "../../../../noname.js";
import loadEditor from "./index.mjs";
import url from "./url.mjs";


/**
 * 魂氏编辑器对外接口层。
 * 本文件是唯一对外暴露的入口：其他扩展只允许通过 game.x19D6_* 调用，
 * 不得直接引用 module/editor 下的任何内部模块或全局符号。
 */

/** @type {import("./nonameEditor.mjs").NonameEditor|null} */
let editor = null;
let inited = false;
/** 技能编辑器内核的动态导入缓存（内核顶层读 lib.config.cards，必须等数据就绪后再载入） */
let skillCoreLoader = null;
let legacyStylesLoaded = false;

function loadSkillCore() {
    if (!skillCoreLoader) {
        //旧内核依赖两层「全局工具」（这正是本次崩溃的根因）：
        //  interact/ui.mjs     定义 ui.create.x19D6_back / ui.create.x19D6_button / ui.x19D6_* 等
        //  interact/dialog.mjs 定义 game.x19D6_create.* 等
        //二者必须在内核之前载入，否则内核第一行就会抛
        //  TypeError: ui.create.x19D6_back is not a function
        skillCoreLoader = (async () => {
            await import("./skill/interact/ui.mjs");
            await import("./skill/interact/dialog.mjs");
            return import("./skill/editor.mjs");
        })();
    }
    return skillCoreLoader;
}
/**
 * 旧版技能编辑器自带样式：全局加载到 document.head
 * （旧版不参与魂氏编辑器的 shadowRoot 样式体系，故不使用组件的 loadCss）
 */
function ensureLegacyStyles() {
    if (legacyStylesLoaded) return;
    legacyStylesLoaded = true;
    lib.init.css(`./${url}/skill/style`, "base");
    lib.init.css(`./${url}/skill/style`, "editor");
}
/**
 * 旧版技能编辑器：还原为悬挂在 ui.window 上的自成一体的浮层
 * @param {boolean} [readCache] 是否读取上次的编辑缓存
 */
async function openLegacySkillEditor(readCache = true) {
    ensureLegacyStyles();
    const { createSkillEditor } = await loadSkillCore();
    return createSkillEditor(readCache);
}

function getEditor() {
    if (!editor) editor = loadEditor();
    return editor;
}

/**
 * 确保编辑器已初始化并挂载到指定父元素
 * @param {HTMLElement} [parent] 默认 ui.window
 */
function ensureMounted(parent) {
    const instance = getEditor();
    const target = parent || ui.window;
    const page = instance.view.mainPage;
    if (!inited) {
        instance.init(target);
        inited = true;
    } else if (page.parentNode !== target) {
        target.appendChild(page);
    }
    return instance;
}

function closeEditor() {
    if (editor) editor.view.mainPage.remove();
}

/**
 * 打开编辑器
 * @param {{ page?: "setting"|"character"|"skill"|"search"|"card", parent?: HTMLElement }} [options]
 */
function openEditor(options = {}) {
    const instance = ensureMounted(options.parent);
    if (options.page) instance.view.toggleNav(options.page);
    return instance;
}

/**
 * 打开并切到技能编辑页，返回 <skill-editor> 组件
 * @param {{ parent?: HTMLElement, readCache?: boolean }} [options]
 */
/** 读取编辑器设置项 */
function readSetting(member, fallback) {
    const settings = lib.config.x19D6_editor && lib.config.x19D6_editor.settings;
    const value = settings ? settings[member] : undefined;
    return value === undefined || value === null ? fallback : value;
}
/** 写入编辑器设置项（落到 lib.config.x19D6_editor.settings.*，随引擎持久化） */
function writeSetting(member, value) {
    if (!lib.config.x19D6_editor) lib.config.x19D6_editor = {};
    if (!lib.config.x19D6_editor.settings) lib.config.x19D6_editor.settings = {};
    lib.config.x19D6_editor.settings[member] = value;
    return game.promises.saveConfigValue("x19D6_editor");
}
/**
 * 用哪个技能编辑器：首次弹一次并记住，之后到「基本设置 → 技能编辑器版本」里改
 * @returns {Promise<"shya"|"legacy">}
 */
async function resolveSkillEditorVersion() {
    const saved = readSetting("skillEditorVersion");
    if (saved === "shya" || saved === "legacy") return saved;
    const dialog = document.createElement("noname-dialog");
    dialog.setAttribute("headline", "选择技能编辑器");
    dialog.setAttribute("message", "检测到两种技能编辑器。请选择使用哪一种——此选择只询问一次，之后可在左侧「设置」页随时更改。");
    dialog.setAttribute("payload", JSON.stringify(["新版：用 shya 规则语言编写", "旧版：中文语句编辑器（原有）"]));
    dialog.setAttribute("type", "choose");
    (ui.window || document.body).appendChild(dialog);
    let picked = -1;
    try {
        picked = await dialog.wait();
    } finally {
        dialog.remove();
    }
    const version = picked === 1 ? "legacy" : "shya";
    writeSetting("skillEditorVersion", version);
    return version;
}
/**
 * 新版 shya 技能编辑器（接入中：组件与编译链路完成后替换此处）
 */
function openShyaSkillEditor() {
    const dialog = document.createElement("noname-dialog");
    dialog.setAttribute("headline", "新版技能编辑器");
    dialog.setAttribute("message", "新版（shya）编辑器正在接入中。可先在「设置 → 技能编辑器版本」切回旧版使用。");
    dialog.setAttribute("type", "alert");
    (ui.window || document.body).appendChild(dialog);
    dialog.wait().finally(() => dialog.remove());
    return null;
}
async function openSkillEditor(options = {}) {
    const version = await resolveSkillEditorVersion();
    if (version === "legacy") return openLegacySkillEditor(options.readCache !== false);
    return openShyaSkillEditor(options);
}/**
 * 打开并切到武将编辑页，返回 <character-editor> 组件
 * @param {{ parent?: HTMLElement, id?: string, data?: object }} [options]
 */
function openCharacterEditor(options = {}) {
    const instance = ensureMounted(options.parent);
    instance.view.toggleNav("character");
    const node = instance.view.createCharacterEditor(options.id);
    if (options.data && typeof node.applyData === "function") node.applyData(options.data);
    return node;
}

/**
 * 无头生成技能：不打开界面，直接把数据喂给技能编辑器内核，返回生成结果。
 * 供其他扩展（如《新将包》的技能牌/咏唱）以纯数据方式调用，避免操弄编辑器 DOM。
 * @param {{
 *   id?: string,
 *   kind?: string,
 *   mode?: "self"|"mt"|"mainCode",
 *   tags?: string[],
 *   filter?: string,
 *   content?: string,
 *   trigger?: string,
 *   filterTarget?: string,
 *   filterCard?: string
 * }} options
 * @returns {Promise<{ id: string, code: string, skill: object }>}
 */
async function createSkill(options = {}) {
    const host = document.createElement("div");
    //离屏渲染：内核需要真实布局才能完成整理与合成
    host.style.cssText = "position:absolute;left:-100000px;top:0;width:1000px;height:700px;";
    ui.window.appendChild(host);
    try {
        //动态导入，避免在卡牌数据就绪前初始化内核
        const { createSkillEditor } = await import("./skill/editor.mjs");
        const back = createSkillEditor(false, host);
        const { id, kind, mode, tags, filter, content, trigger, filterTarget, filterCard } = options;
        if (kind) back.skill.kind = kind;
        if (mode) back.skill.mode = mode;
        if (tags && tags.length) tags.forEach(tag => back.skill.type.includes(tag) || back.skill.type.push(tag));
        if (id) {
            back.ele.id.value = id;
            back.ele.id.submit();
        }
        back.organize();
        if (trigger && back.ele.trigger) {
            back.ele.trigger.value = trigger;
            back.ele.trigger.arrange();
            await back.ele.trigger.submit();
        }
        if (filter && back.ele.filter) {
            back.ele.filter.value = filter;
            back.ele.filter.arrange();
            back.ele.filter.submit();
        }
        if (content && back.ele.content) {
            back.ele.content.value = content;
            back.ele.content.arrange();
            back.ele.content.submit();
        }
        if (filterTarget && back.ele.filterTarget) {
            back.ele.filterTarget.value = filterTarget;
            back.ele.filterTarget.arrange();
            back.ele.filterTarget.submit();
        }
        if (filterCard && back.ele.filterCard) {
            back.ele.filterCard.value = filterCard;
            back.ele.filterCard.arrange();
            back.ele.filterCard.submit();
        }
        back.organize();
        return {
            id: back.getID(),
            code: back.target ? back.target.value : "",
            skill: back.skill
        };
    } finally {
        host.remove();
        if (game.x19D6_back === null || (game.x19D6_back && !game.x19D6_back.isConnected)) game.x19D6_back = null;
    }
}

/**
 * 安装对外接口（全部挂在 game 上，统一 x19D6_ 前缀）
 */
export function installApi() {
    game.x19D6_editor = getEditor();
    game.x19D6_isReady = () => true;
    game.x19D6_openEditor = openEditor;
    game.x19D6_openSkillEditor = openSkillEditor;
    game.x19D6_openLegacySkillEditor = openLegacySkillEditor;
    game.x19D6_openCharacterEditor = openCharacterEditor;
    game.x19D6_createSkill = createSkill;
    game.x19D6_closeEditor = closeEditor;
    return game.x19D6_editor;
}

export { openEditor, openSkillEditor, openShyaSkillEditor, resolveSkillEditorVersion, openLegacySkillEditor, openCharacterEditor, createSkill, closeEditor, getEditor };
