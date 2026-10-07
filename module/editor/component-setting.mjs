"use script";
import { HTMLNonameFocusUIElement } from "./component-base.mjs";
import url from "./url.mjs";
import "./component-dialog.mjs";
/**
 * 基本设置面板（侧边栏「设置」页）。
 * 所有设置项都写入 lib.config.x19D6_editor.settings.*，随引擎配置一起落到 IndexedDB。
 */
const PREFIX = "x19D6_editor.settings.";
const EXT_FILE_CONFIG_PREFIX = "x19D6_editor.extensionFileConfig.";
/**
 * 工作区资源目录：键名沿用原「扩展设置」弹窗，老配置继续可用
 */
const WORKSPACE_RESOURCE_INPUTS = {
    workspaceCharacterImage: "extension-character-image",
    workspaceCardImage: "extension-card-image",
    workspaceSkillAudio: "extension-skill-audio",
    workspaceDieAudio: "extension-die-audio"
};
/**
 * 新建工作区时写入的扩展骨架。
 * 必须是 game.import 形态：worker 的 getExtensionAllPackage 只解析老式扩展
 * （worker-ast.worker.js 里匹配 game.import）。
 * @param {string} name
 */
const buildExtensionSkeleton = name => `game.import("extension", function (lib, game, ui, get, ai, _status) {
\treturn {
\t\tname: "${name}",
\t\tcontent: function (config, pack) {
\t\t},
\t\tprecontent: function () {
\t\t},
\t\tconfig: {},
\t\thelp: {},
\t\tpackage: {
\t\t\tcharacter: { character: {}, translate: {} },
\t\t\tcard: { card: {}, translate: {}, list: [] },
\t\t\tskill: { skill: {}, translate: {} },
\t\t\tauthor: "",
\t\t\tversion: "1.0",
\t\t},
\t};
});
`;
/**
 * @param {string} name
 */
const buildExtensionInfo = name => `{
    "name": "${name}",
    "author": "",
    "diskURL": "",
    "forumURL": "",
    "version": "1.0.0"
}
`;
class HTMLNonameSettingPanelElement extends HTMLNonameFocusUIElement {
    constructor() {
        super();
        const shadow = this.attachShadow({ mode: "open" });
        //$: shadow , html/setting.html//
shadow.innerHTML=`
<div class="panel">
    <section>
        <h3>工作区</h3>
        <label class="row"><span>当前工作区</span>
            <select id="workspace"></select>
        </label>
        <div class="row"><button id="workspaceNew">新建工作区</button><button id="workspaceRefresh">刷新列表</button></div>
        <div class="row muted" id="workspaceHint"></div>
        <label class="row"><span>武将立绘目录</span><input id="workspaceCharacterImage" list="workspaceFolderList" placeholder="image/character"></label>
        <label class="row"><span>卡牌图片目录</span><input id="workspaceCardImage" list="workspaceFolderList" placeholder="image/card"></label>
        <label class="row"><span>技能语音目录</span><input id="workspaceSkillAudio" list="workspaceFolderList" placeholder="audio/skill"></label>
        <label class="row"><span>阵亡语音目录</span><input id="workspaceDieAudio" list="workspaceFolderList" placeholder="audio/die"></label>
        <datalist id="workspaceFolderList"></datalist>
    </section>
    <section>
        <h3>外观</h3>
        <label class="row"><span>字号缩放</span><input type="range" id="fontScale" min="0.7" max="1.5" step="0.05"><b id="fontScaleValue"></b></label>
        <label class="row"><span>界面动画</span><input type="checkbox" id="animation"></label>
    </section>
    <section>
        <h3>布局</h3>
        <label class="row"><span>默认挂载父元素</span>
            <select id="defaultParent">
                <option value="ui.window">ui.window（游戏界面）</option>
                <option value="ui.background">ui.background（背景层）</option>
            </select>
        </label>
        <label class="row"><span>技能编辑器版本</span>
            <select id="skillEditorVersion">
                <option value="shya">新版（shya）</option>
                <option value="legacy">旧版（中文语句）</option>
            </select>
        </label>
        <label class="row"><span>记住上次所在页</span><input type="checkbox" id="rememberPage"></label>
        <div class="row"><span>当前侧栏宽度比</span><span class="muted" id="ratioText">未记录</span></div>
        <div class="row"><button id="resetRatio">重置侧栏宽度</button><button id="resetNav">重置导航顺序</button></div>
    </section>
    <section>
        <h3>数据</h3>
        <div class="row"><button id="exportAll">导出全部编辑器数据</button></div>
        <div class="row"><button id="clearCache">清除扩展扫描缓存</button></div>
        <div class="row muted">武将草稿、技能缓存、外观与布局设置都在此持久化。</div>
    </section>
</div>
`
//#: shadow , html/setting.html//
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
        const skillEditorVersion = this.read("skillEditorVersion", "shya");
        const ratio = this.configQuery("get", { member: "x19D6_editor.ui.widthRatio" });
        const root = this.editorRoot;
        const query = id => this.shadowRoot.getElementById(id);
        query("defaultParent").value = defaultParent;
        query("fontScale").value = fontScale;
        query("fontScaleValue").textContent = fontScale.toFixed(2);
        query("animation").checked = Boolean(animation);
        const versionSelect = query("skillEditorVersion");
        if (versionSelect) versionSelect.value = skillEditorVersion;
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
        if (versionSelect) versionSelect.addEventListener("change", e => this.write("skillEditorVersion", e.target.value));
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
        // ---------------- 工作区（= 扩展） ----------------
        query("workspace").addEventListener("change", e => this.setWorkspace(e.target.value));
        query("workspaceRefresh").addEventListener("pointerup", () => {
            this.renderWorkspace();
            this.refreshWorkspaceFiles(this.workspace);
        });
        query("workspaceNew").addEventListener("pointerup", () => this.promptNewWorkspace());
        for (const [id, key] of Object.entries(WORKSPACE_RESOURCE_INPUTS)) {
            query(id).addEventListener("change", e => {
                if (!this.workspace) return;
                this.writeExtensionFileConfig(this.workspace, { [key]: e.target.value.trim() });
            });
        }
        this.renderWorkspace();
        this.refreshWorkspaceFiles(this.workspace);
    }
    /* ---------------- 工作区（= 扩展） ---------------- */
    /**
     * 当前工作区名（= 扩展名）
     * @returns {string}
     */
    get workspace() {
        return this.read("workspace", "") || "";
    }
    /**
     * 已安装扩展列表（= lib.config.extensions）
     * @returns {string[]}
     */
    get extensionList() {
        return Array.from(this.infoQuery("extensionList") || []);
    }
    /**
     * @param {string} extensionName
     * @returns {object} 该扩展的资源目录配置
     */
    readExtensionFileConfig(extensionName) {
        if (!extensionName) return {};
        return this.configQuery("get", { member: EXT_FILE_CONFIG_PREFIX + extensionName }) || {};
    }
    /**
     * 合并写入某扩展的资源目录配置
     * @param {string} extensionName
     * @param {object} patch
     */
    writeExtensionFileConfig(extensionName, patch) {
        if (!extensionName) return;
        const value = { ...this.readExtensionFileConfig(extensionName), ...patch };
        return this.configQuery("write", { member: EXT_FILE_CONFIG_PREFIX + extensionName, value });
    }
    /**
     * 扩展目录里已有 image/character、audio/skill 这类约定目录时给出默认值
     * （规则沿用原「扩展设置」弹窗）
     * @param {string} extensionName
     * @param {string[]} folderList
     */
    suggestResourceDirs(extensionName, folderList = []) {
        const pick = candidates => candidates.find(dir => folderList.includes(dir)) || extensionName;
        return {
            "extension-character-image": pick([extensionName + "/image/character", extensionName + "/image"]),
            "extension-card-image": pick([extensionName + "/image/card", extensionName + "/image"]),
            "extension-skill-audio": pick([extensionName + "/audio/skill", extensionName + "/audio"]),
            "extension-die-audio": pick([extensionName + "/audio/die", extensionName + "/audio"])
        };
    }
    /**
     * 拉一次工作区目录树：填 datalist、补齐缺失的默认资源目录
     * @param {string} extensionName
     */
    async refreshWorkspaceFiles(extensionName) {
        const datalist = this.shadowRoot.getElementById("workspaceFolderList");
        if (datalist) datalist.innerHTML = "";
        if (!extensionName) return;
        const [folderList] = await this.fileQuery("getAllFolderAndFileList", { path: "extension/" + extensionName }) || [[], []];
        if (datalist) {
            datalist.innerHTML = [extensionName, ...folderList.map(folder => extensionName + "/" + folder)]
                .map(path => `<option value="${path}"></option>`).join("");
        }
        const config = this.readExtensionFileConfig(extensionName);
        const patch = {};
        for (const [key, suggestion] of Object.entries(this.suggestResourceDirs(extensionName, folderList))) {
            if (!config[key]) patch[key] = suggestion;
        }
        if (Object.keys(patch).length) this.writeExtensionFileConfig(extensionName, patch);
        this.renderWorkspace();
    }
    /**
     * 把当前工作区与它的资源目录回填到界面
     */
    renderWorkspace() {
        const query = id => this.shadowRoot.getElementById(id);
        const workspace = this.workspace;
        const names = this.extensionList;
        const select = query("workspace");
        if (select) {
            select.innerHTML = `<option value="">未选择工作区</option>` + names.map(name => `<option value="${name}">${name}</option>`).join("");
            select.value = names.includes(workspace) ? workspace : "";
        }
        const config = this.readExtensionFileConfig(workspace);
        for (const [id, key] of Object.entries(WORKSPACE_RESOURCE_INPUTS)) {
            const input = query(id);
            if (input) input.value = config[key] || "";
        }
        const hint = query("workspaceHint");
        if (hint) {
            hint.textContent = workspace
                ? `工作区「${workspace}」：武将草稿与资源目录都归它，新建的武将会写入该扩展。`
                : "工作区即扩展：先在上面选择或新建一个扩展，武将草稿列表会按它过滤。";
        }
    }
    /**
     * 切换工作区：写配置 + 通知外壳刷新标题与草稿列表
     * @param {string} extensionName
     */
    setWorkspace(extensionName) {
        this.write("workspace", extensionName || "");
        this.renderWorkspace();
        this.refreshWorkspaceFiles(extensionName || "");
        this.triggerEvent("workspaceChange", { workspace: extensionName || "" });
    }
    /**
     * 新建工作区：建目录 + 写扩展骨架 + 注册进引擎并启用
     * @param {string} inputName
     * @returns {Promise<boolean>}
     */
    async createWorkspace(inputName) {
        const name = String(inputName || "").trim();
        if (!name) return false;
        if (/[\\/:*?"<>|]/.test(name)) {
            alert('扩展名不能包含 \\ / : * ? " < > | 这些字符');
            return false;
        }
        const installed = this.extensionList.includes(name);
        await this.fileQuery("createDir", { path: "extension/" + name });
        const [, files] = await this.fileQuery("getAllFolderAndFileList", { path: "extension/" + name });
        //已有入口文件或本就在册的扩展不动它的文件，只补注册/启用
        if (!installed && !files.includes("extension.js")) {
            await this.fileQuery("writeTextFile", { path: `extension/${name}/extension.js`, content: buildExtensionSkeleton(name) });
            await this.fileQuery("writeTextFile", { path: `extension/${name}/info.json`, content: buildExtensionInfo(name) });
        }
        if (!lib.config.extensions.includes(name)) {
            lib.config.extensions.add(name);
            game.saveConfig("extensions", lib.config.extensions);
        }
        game.saveExtensionConfig(name, "enable", true);
        this.setWorkspace(name);
        alert(`工作区「${name}」已创建并注册。\n新扩展要重启游戏才会被加载，当前会话里还不会生效。`);
        return true;
    }
    /**
     * 弹输入框新建工作区
     * @returns {Promise<boolean>}
     */
    async promptNewWorkspace() {
        const dialog = document.createElement("noname-dialog");
        dialog.setAttribute("type", "prompt");
        dialog.setAttribute("headline", "新建工作区（= 新建扩展）");
        dialog.setAttribute("message", "扩展名同时是文件夹名；创建后需重启游戏才会加载。");
        dialog.setAttribute("placeholder", "例如：我的扩展");
        this.shadowRoot.append(dialog);
        const name = await dialog.wait();
        if (name === false || name === null || name === undefined) return false;
        return await this.createWorkspace(name);
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
