"use script";
import { HTMLNonameFocusUIElement } from "./component-base.mjs";
import url from "./url.mjs";
/**
 * 基本设置面板（侧边栏「设置」页）。
 * 所有设置项都写入 lib.config.x19D6_editor.settings.*，随引擎配置一起落到 IndexedDB。
 */
const PREFIX = "x19D6_editor.settings.";
class HTMLNonameSettingPanelElement extends HTMLNonameFocusUIElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
        this.loadCss("setting", { root: this.shadowRoot, baseURL: `./${url}/style` });
        this.render();
    }
    read(member, fallback) {
        const value = this.configQuery("get", { member: PREFIX + member });
        return value === null || value === undefined ? fallback : value;
    }
    write(member, value) {
        return this.configQuery("write", { member: PREFIX + member, value });
    }
    get editorRoot() {
        return this.parentElement ? this.parentElement.closest(".xy-ED-nonameEditor") : null;
    }
    render() {
        const fontScale = Number(this.read("fontScale", 1));
        const animation = this.read("animation", true);
        const defaultParent = this.read("defaultParent", "ui.window");
        const rememberPage = this.read("rememberPage", true);
        const ratio = this.configQuery("get", { member: "x19D6_editor.ui.widthRatio" });
        this.shadowRoot.innerHTML = `
<div class="panel">
    <section>
        <h3>外观</h3>
        <label class="row"><span>字号缩放</span><input type="range" id="fontScale" min="0.7" max="1.5" step="0.05" value="${fontScale}"><b id="fontScaleValue">${fontScale.toFixed(2)}</b></label>
        <label class="row"><span>界面动画</span><input type="checkbox" id="animation" ${animation ? "checked" : ""}></label>
    </section>
    <section>
        <h3>布局</h3>
        <label class="row"><span>默认挂载父元素</span>
            <select id="defaultParent">
                <option value="ui.window">ui.window（游戏界面）</option>
                <option value="ui.background">ui.background（背景层）</option>
            </select>
        </label>
        <label class="row"><span>记住上次所在页</span><input type="checkbox" id="rememberPage" ${rememberPage ? "checked" : ""}></label>
        <div class="row"><span>当前侧栏宽度比</span><span class="muted" id="ratioText">${ratio === null ? "未记录" : Number(ratio).toFixed(3)}</span></div>
        <div class="row"><button id="resetRatio">重置侧栏宽度</button><button id="resetNav">重置导航顺序</button></div>
    </section>
    <section>
        <h3>数据</h3>
        <div class="row"><button id="exportAll">导出全部编辑器数据</button></div>
        <div class="row"><button id="clearCache">清除扩展扫描缓存</button></div>
        <div class="row muted">武将草稿、技能缓存、外观与布局设置都在此持久化。</div>
    </section>
</div>`;
        const root = this.editorRoot;
        const query = id => this.shadowRoot.getElementById(id);
        query("defaultParent").value = defaultParent;
        if (root) {
            root.style.setProperty("--xy-ED-font-scale", String(fontScale));
            if (!animation) root.classList.add("xy-ED-no-animation");
        }
        query("fontScale").addEventListener("input", e => {
            const value = Number(e.target.value);
            query("fontScaleValue").textContent = value.toFixed(2);
            if (root) root.style.setProperty("--xy-ED-font-scale", String(value));
            this.write("fontScale", value);
        });
        query("animation").addEventListener("change", e => {
            const value = e.target.checked;
            if (root) root.classList.toggle("xy-ED-no-animation", !value);
            this.write("animation", value);
        });
        query("defaultParent").addEventListener("change", e => this.write("defaultParent", e.target.value));
        query("rememberPage").addEventListener("change", e => this.write("rememberPage", e.target.checked));
        query("resetRatio").addEventListener("pointerup", () => {
            this.configQuery("write", { member: "x19D6_editor.ui.widthRatio", value: 0.5 });
            query("ratioText").textContent = "0.500";
            const editorRoot = this.editorRoot;
            if (editorRoot) editorRoot.querySelector(".xy-ED-viewArea")?.style.setProperty("--xy-ED-WidthRatio", "0.5");
        });
        query("resetNav").addEventListener("pointerup", () => {
            this.configQuery("write", { member: "x19D6_editor.ui.navOrder", value: null });
            const editorRoot = this.editorRoot;
            const nav = editorRoot?.querySelector(".xy-ED-viewArea>.xy-ED-sideBar>nav");
            if (nav) {
                ["setting", "character", "skill", "card", "search"].forEach(key => {
                    const node = nav.querySelector(`[data-for="${key}"]`);
                    if (node) nav.appendChild(node);
                });
            }
        });
        query("exportAll").addEventListener("pointerup", () => this.exportAllData());
        query("clearCache").addEventListener("pointerup", () => {
            if (!confirm("确定清除扩展扫描缓存？下次打开武将编辑时会重新扫描扩展目录。")) return;
            lib.config.x19D6_editor && (lib.config.x19D6_editor.extensionModuleConfig = null);
            this.configQuery("write", { member: "x19D6_editor.extensionModuleConfig", value: null });
            alert("已清除扩展扫描缓存。");
        });
    }
    /**
     * 导出全部 x19D6_editor 数据为 JSON 文件
     */
    exportAllData() {
        const data = {};
        for (const key of Object.keys(lib.config)) {
            if (key === "x19D6_editor" || key.startsWith("x19D6_editor_")) data[key] = lib.config[key];
        }
        const text = JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 4);
        const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `魂氏编辑器数据_${Date.now()}.json`;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 3000);
    }
}
customElements.define("setting-panel", HTMLNonameSettingPanelElement);
export { HTMLNonameSettingPanelElement };
