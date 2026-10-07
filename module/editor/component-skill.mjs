"use script";
import url from "./url.mjs";
import { HTMLNonameFocusUIElement } from "./component-base.mjs";

/**
 * 技能编辑器组件外壳。
 * 与 <character-editor> 同构：独立 shadowRoot、样式随组件加载、由外壳决定内联位置。
 * 内核（module/editor/skill/editor.js）原样复用，只把挂载父元素换成组件自己的 shadowRoot。
 */
class HTMLNonameSkillEditorElement extends HTMLNonameFocusUIElement {
    /**
     * 内核实例（原技能编辑器的 back 对象）
     * @type {HTMLElement|null}
     */
    skillEditor = null;
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
        const config = { root: this.shadowRoot, baseURL: `./${url}/skill/style` };
        this.loadCss("editor", config);
        this.loadCss("base", config);
        if (this.skillEditor) return;
        //动态导入：skill/editor.js 在模块顶层读取 lib.config.cards，必须等游戏数据就绪后再载入
        import("./skill/editor.js").then(module => {
            if (this.skillEditor) return;
            this.skillEditor = module.createSkillEditor(this.hasAttribute("read-cache"), this.shadowRoot);
        }).catch(err => console.error("技能编辑器内核载入失败", err));
    }
    disconnectedCallback() {
        super.disconnectedCallback?.();
        this.skillEditor = null;
    }
}
customElements.define("skill-editor", HTMLNonameSkillEditorElement);
export { HTMLNonameSkillEditorElement };