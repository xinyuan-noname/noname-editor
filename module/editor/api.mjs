import { lib, game, ui, get, ai, _status } from "../../../../noname.js";
import loadEditor from "./index.mjs";


/**
 * 魂氏编辑器对外接口层。
 * 本文件是唯一对外暴露的入口：其他扩展只允许通过 game.x19D6_* 调用，
 * 不得直接引用 module/editor 下的任何内部模块或全局符号。
 */

/** @type {import("./nonameEditor.mjs").NonameEditor|null} */
let editor = null;
let inited = false;

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
function openSkillEditor(options = {}) {
    const instance = ensureMounted(options.parent);
    instance.view.toggleNav("skill");
    return instance.view.createSkillEditor();
}

/**
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
        const { createSkillEditor } = await import("./skill/editor.js");
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
    game.x19D6_openCharacterEditor = openCharacterEditor;
    game.x19D6_createSkill = createSkill;
    game.x19D6_closeEditor = closeEditor;
    return game.x19D6_editor;
}

export { openEditor, openSkillEditor, openCharacterEditor, createSkill, closeEditor, getEditor };
