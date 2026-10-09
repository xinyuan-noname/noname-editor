"use script";
import { HTMLNonameFocusUIElement } from "./component-base.mjs";
import url from "./url.mjs";
import "./component-dialog.mjs";
import {
    AUTO_MIRROR,
    UPDATE_STATE,
    chooseAndInstallVersion,
    describeLocal,
    describeProgress,
    formatTimestamp,
    installUpdate,
    mirrorOptions,
    readCache,
    readLocal,
    readUpdateConfig,
    reportInstall,
    runCheck,
    stateLabel,
    writeUpdateConfig
} from "./update/panel.mjs";
import { githubUrl } from "./update/mirrors.mjs";
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
    workspaceDieAudio: "extension-die-audio",
    workspaceSkillSource: "extension-skill-source"
};
/**
 * 工作区默认资源目录（相对扩展根）：新建工作区时一并在磁盘上建立，并写进
 * `extensionFileConfig.<工作区>`。键名与原「扩展设置」弹窗一致。
 */
const WORKSPACE_DEFAULT_DIRS = {
    "extension-character-image": "image/character",
    "extension-card-image": "image/card",
    "extension-skill-audio": "audio/skill",
    "extension-die-audio": "audio/die",
    "extension-skill-source": "src/shya"
};
/**
 * 老扩展可能已经在用的目录：存在就沿用，不硬塞默认目录
 */
const WORKSPACE_LEGACY_DIRS = {
    "extension-character-image": ["image", "img"],
    "extension-card-image": ["image", "img"],
    "extension-skill-audio": ["audio"],
    "extension-die-audio": ["audio"]
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
        <div class="row"><button id="workspaceNew">新建工作区</button><button id="workspaceRefresh">刷新列表</button><button id="workspaceDirs">创建/更新目录</button><button id="workspaceOpen">打开资源管理器</button></div>
        <div class="row muted" id="workspaceHint"></div>
        <label class="row"><span>武将立绘目录</span>
            <span class="dir-field"><input id="workspaceCharacterImage" list="workspaceFolderList" placeholder="image/character"><button class="dir-pick" type="button" data-dir-for="workspaceCharacterImage" title="选择文件夹">…</button></span>
        </label>
        <label class="row"><span>卡牌图片目录</span>
            <span class="dir-field"><input id="workspaceCardImage" list="workspaceFolderList" placeholder="image/card"><button class="dir-pick" type="button" data-dir-for="workspaceCardImage" title="选择文件夹">…</button></span>
        </label>
        <label class="row"><span>技能语音目录</span>
            <span class="dir-field"><input id="workspaceSkillAudio" list="workspaceFolderList" placeholder="audio/skill"><button class="dir-pick" type="button" data-dir-for="workspaceSkillAudio" title="选择文件夹">…</button></span>
        </label>
        <label class="row"><span>阵亡语音目录</span>
            <span class="dir-field"><input id="workspaceDieAudio" list="workspaceFolderList" placeholder="audio/die"><button class="dir-pick" type="button" data-dir-for="workspaceDieAudio" title="选择文件夹">…</button></span>
        </label>
        <label class="row"><span>技能源码目录</span>
            <span class="dir-field"><input id="workspaceSkillSource" list="workspaceFolderList" placeholder="src/shya"><button class="dir-pick" type="button" data-dir-for="workspaceSkillSource" title="选择文件夹">…</button></span>
        </label>
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
        <label class="row"><span>技能模板语言</span>
            <select id="templateLang">
                <option value="cn">中文（插槽为中文名）</option>
                <option value="en">English（插槽为英文名）</option>
            </select>
        </label>
        <label class="row"><span>写入模板前确认</span><input type="checkbox" id="confirmTemplateOverwrite"></label>
        <label class="row"><span>记住上次所在页</span><input type="checkbox" id="rememberPage"></label>
        <div class="row"><span>当前侧栏宽度比</span><span class="muted" id="ratioText">未记录</span></div>
        <div class="row"><button id="resetRatio">重置侧栏宽度</button><button id="resetNav">重置导航顺序</button></div>
    </section>
    <section>
        <h3>版本与更新</h3>
        <div class="row"><span>当前版本</span><span class="muted" id="versionLocal">读取中…</span></div>
        <div class="row"><span>远端版本</span><span class="muted" id="versionRemote">尚未检查</span></div>
        <div class="row"><span>更新状态</span><span class="muted update-state" id="versionState">尚未检查</span></div>
        <label class="row"><span>镜像源</span><select id="updateMirror"></select></label>
        <label class="row"><span>打开编辑器时自动检查</span><input type="checkbox" id="updateAutoCheck"></label>
        <div class="row"><button id="updateCheck">检查更新</button><button id="updateInstall">一键更新</button><button id="updateVersions">选择版本</button></div>
        <div class="row"><button id="updateHome">项目主页</button><button id="updateReleases">下载页</button></div>
        <div class="row muted" id="updateHint">尚未检查；打开编辑器时会自动检查一次，也可以点「检查更新」。</div>
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
        const templateLang = this.read("templateLang", "cn");
        const confirmTemplateOverwrite = this.read("confirmTemplateOverwrite", true);
        const ratio = this.configQuery("get", { member: "x19D6_editor.ui.widthRatio" });
        const root = this.editorRoot;
        const query = id => this.shadowRoot.getElementById(id);
        query("defaultParent").value = defaultParent;
        query("fontScale").value = fontScale;
        query("fontScaleValue").textContent = fontScale.toFixed(2);
        query("animation").checked = Boolean(animation);
        const versionSelect = query("skillEditorVersion");
        if (versionSelect) versionSelect.value = skillEditorVersion;
        const templateSelect = query("templateLang");
        if (templateSelect) templateSelect.value = templateLang === "en" ? "en" : "cn";
        query("confirmTemplateOverwrite").checked = confirmTemplateOverwrite !== false;
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
        if (templateSelect) templateSelect.addEventListener("change", e => this.write("templateLang", e.target.value));
        query("confirmTemplateOverwrite").addEventListener("change", e => this.write("confirmTemplateOverwrite", e.target.checked));
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
        query("workspaceDirs").addEventListener("pointerup", async () => {
            if (!this.workspace) return alert("请先选择工作区。");
            await this.ensureWorkspaceDirs(this.workspace);
            this.refreshWorkspaceFiles(this.workspace);
        });
        query("workspaceOpen").addEventListener("pointerup", () => this.openWorkspaceInExplorer());
        for (const [id, key] of Object.entries(WORKSPACE_RESOURCE_INPUTS)) {
            query(id).addEventListener("change", async e => {
                if (!this.workspace) return;
                const path = e.target.value.trim();
                this.writeExtensionFileConfig(this.workspace, { [key]: path });
                //手填的目录也一并建出来，避免下载资源时目标目录不存在
                if (path) await this.fileQuery("createDir", { path: `extension/${path}` });
                this.refreshWorkspaceFiles(this.workspace);
            });
        }
        //每行右侧的「选」：弹目录选择器
        this.shadowRoot.querySelectorAll(".dir-pick").forEach(button => {
            button.addEventListener("pointerup", () => {
                const key = WORKSPACE_RESOURCE_INPUTS[button.dataset.dirFor];
                if (key) this.pickWorkspaceDir(key);
            });
        });
        this.renderWorkspace();
        this.refreshWorkspaceFiles(this.workspace);
        //版本与更新（版本行 / 镜像源 / 自动检查开关 / 检查与更新按钮）
        this.renderUpdateSection();
    }
    /* ---------------- 版本与更新 ---------------- */
    /**
     * 设置页「版本与更新」段：填充镜像下拉与开关，接上四个按钮，然后刷新版本信息
     */
    renderUpdateSection() {
        const query = id => this.shadowRoot.getElementById(id);
        const mirror = query("updateMirror");
        if (mirror) {
            mirror.innerHTML = "";
            mirrorOptions().forEach(({ id, label }) => {
                const option = document.createElement("option");
                option.value = id;
                option.textContent = label;
                mirror.appendChild(option);
            });
            const saved = readUpdateConfig("mirror", AUTO_MIRROR);
            mirror.value = saved;
            //配置里可能留着已经不存在的镜像 id：回落到「自动」
            if (mirror.value !== saved) {
                mirror.value = AUTO_MIRROR;
                writeUpdateConfig("mirror", AUTO_MIRROR);
            }
            mirror.addEventListener("change", e => {
                const picked = e.target.selectedOptions && e.target.selectedOptions[0];
                writeUpdateConfig("mirror", e.target.value);
                this.setUpdateHint(`镜像源已切换为「${picked ? picked.textContent : e.target.value}」，下次检查/更新生效。`);
            });
        }
        const auto = query("updateAutoCheck");
        if (auto) {
            auto.checked = Boolean(readUpdateConfig("autoCheck", true));
            auto.addEventListener("change", e => {
                writeUpdateConfig("autoCheck", e.target.checked);
                this.setUpdateHint(e.target.checked
                    ? "已开启：每次打开编辑器都会检查一次更新。"
                    : "已关闭自动检查，可随时点「检查更新」。");
            });
        }
        query("updateCheck")?.addEventListener?.("pointerup", () => this.checkUpdate());
        query("updateInstall")?.addEventListener?.("pointerup", () => this.installLatest());
        query("updateVersions")?.addEventListener?.("pointerup", () => this.pickUpdateVersion());
        query("updateHome")?.addEventListener?.("pointerup", () => this.openInBrowser(githubUrl.repoPage()));
        query("updateReleases")?.addEventListener?.("pointerup", () => this.openInBrowser(githubUrl.releasesPage()));
        this.refreshUpdateInfo();
    }
    /** @param {string} text */
    setUpdateHint(text) {
        const node = this.shadowRoot.getElementById("updateHint");
        if (node) node.textContent = text || "";
    }
    /**
     * 按「本地版本 + 上次检查缓存」刷新这三行
     */
    async refreshUpdateInfo() {
        try {
            const local = await readLocal();
            const node = this.shadowRoot.getElementById("versionLocal");
            if (node) node.textContent = describeLocal(local);
        } catch (err) {
            this.setUpdateHint(`读取本地版本失败：${(err && err.message) || err}`);
        }
        const cache = readCache();
        if (cache) this.renderUpdateState(cache);
        else this.setUpdateHint("尚未检查；打开编辑器时会自动检查一次，也可以点「检查更新」。");
    }
    /**
     * @param {{state?:string,reason?:string,remote?:object,release?:object,at?:string,mirrorLabel?:string,error?:string}|null} info
     */
    renderUpdateState(info) {
        const remoteNode = this.shadowRoot.getElementById("versionRemote");
        const stateNode = this.shadowRoot.getElementById("versionState");
        const remote = info && info.remote;
        const release = info && info.release;
        if (remoteNode) {
            let text = "无可用信息";
            if (remote && remote.sha) {
                text = `${remote.short || String(remote.sha).slice(0, 7)}${remote.date ? " · " + formatTimestamp(remote.date) : ""}${remote.message ? " · " + remote.message : ""}`;
            } else if (release && release.tag) {
                text = `发布版 ${release.tag}`;
            }
            remoteNode.textContent = text;
        }
        const label = stateLabel(info && info.state);
        if (stateNode) {
            stateNode.textContent = `${label.text}${info && info.reason ? "：" + info.reason : ""}`;
            stateNode.className = `update-state update-state-${label.tone}`;
        }
        const tips = [];
        if (info && info.at) tips.push(`上次检查 ${formatTimestamp(info.at)}`);
        if (info && info.mirrorLabel) tips.push(`镜像 ${info.mirrorLabel}`);
        if (info && info.error) tips.push(info.error);
        this.setUpdateHint(tips.join(" · ") || (info && info.reason) || "—");
    }
    /**
     * 手动检查更新
     * @returns {Promise<object|null>}
     */
    async checkUpdate() {
        this.setUpdateHint("检查中…");
        try {
            const result = await runCheck({
                onProgress: (stage, detail) => this.setUpdateHint(`${detail || stage}…`)
            });
            this.renderUpdateState(result);
            if (result.state === UPDATE_STATE.AVAILABLE) {
                this.setUpdateHint(`发现新版本：${(result.target && result.target.label) || ""}（点「一键更新」安装）`);
            }
            return result;
        } catch (err) {
            this.setUpdateHint(`检查失败：${(err && err.message) || err}`);
            return null;
        }
    }
    /**
     * 「一键更新」：有缓存目标就直接装，没有就先查一次
     */
    async installLatest() {
        const cache = readCache();
        let target = cache && cache.target ? cache.target : null;
        let release = cache && cache.release ? cache.release : null;
        if (!target) {
            const result = await this.checkUpdate();
            if (result && result.state === UPDATE_STATE.AVAILABLE) {
                target = result.target;
                release = result.release || null;
            }
        }
        if (!target) {
            this.setUpdateHint("当前没有可安装的新版本；想回退或安装指定版本请用「选择版本」。");
            return;
        }
        this.setUpdateHint("准备下载…");
        const summary = await installUpdate({
            target,
            release,
            onProgress: info => this.setUpdateHint(describeProgress(info))
        });
        await reportInstall(summary);
        if (summary.cancelled) this.setUpdateHint("已取消更新。");
        else if (summary.ok) this.setUpdateHint("更新完成，请重启游戏让新代码生效。");
        else this.setUpdateHint(`更新失败：${summary.error || "未知原因"}`);
        this.refreshUpdateInfo();
    }
    /**
     * 「选择版本」：列 Release 标签 + 最近提交，可用来回退
     */
    async pickUpdateVersion() {
        this.setUpdateHint("拉取版本列表…");
        const summary = await chooseAndInstallVersion({
            onProgress: info => this.setUpdateHint(describeProgress(info))
        });
        if (summary && summary.ok) this.setUpdateHint("安装完成，请重启游戏让新代码生效。");
        else if (summary && summary.cancelled) this.setUpdateHint("已取消。");
        else if (summary) this.setUpdateHint(`安装失败：${summary.error || "未知原因"}`);
        else this.setUpdateHint("未选择版本。");
        this.refreshUpdateInfo();
    }
    /**
     * 用系统默认浏览器打开外部链接（拿不到 electron.shell 就退 window.open）
     * @param {string} target
     */
    openInBrowser(target) {
        if (!target) return false;
        const req = typeof window.require === "function" ? window.require : null;
        if (req) {
            try {
                const electron = req("electron");
                if (electron && electron.shell && typeof electron.shell.openExternal === "function") {
                    electron.shell.openExternal(target);
                    return true;
                }
            } catch (err) { /* 退 window.open */ }
        }
        try {
            window.open(target, "_blank");
            return true;
        } catch (err) { /* 最后给路径让用户自己开 */ }
        alert(`请手动在浏览器里打开：\n${target}`);
        return false;
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
     * 资源根目录（桌面端 = `resources/app`）
     * @returns {string}
     */
    get assetRoot() {
        // 1) window.__dirname：noname 在桌面端把它规范成 resources/app
        if (typeof window.__dirname === "string" && window.__dirname) return this.normalizeRoot(window.__dirname);
        // 2) lib.assetURL：可能是 file:/// 前缀，也可能是空串
        if (typeof lib.assetURL === "string" && lib.assetURL) return this.normalizeRoot(lib.assetURL);
        // 3) 复刻 noname 自己的推导：cwd + resources/app
        if (lib.node && lib.node.path) return lib.node.path.join(lib.node.path.resolve(), "resources/app");
        return "";
    }
    /**
     * @param {string} value
     * @returns {string}
     */
    normalizeRoot(value) {
        return decodeURIComponent(String(value)).replace(/^file:\/*/i, "").replace(/[\\/]+$/, "");
    }
    /**
     * 工作区（扩展）目录的绝对路径
     * @param {string} [workspace]
     * @returns {string}
     */
    workspaceDir(workspace = this.workspace) {
        const root = this.assetRoot;
        return root ? `${root}/extension/${workspace}` : "";
    }
    /**
     * 调系统资源管理器打开目录：Electron `shell.openPath` → `child_process.exec explorer` → 提示路径
     * （引擎里没有现成的「打开目录」API，`explorer`/`shell.openPath` 在 noname 源码里零命中）
     * @param {string} target
     * @returns {boolean}
     */
    openInExplorer(target) {
        if (!target) return false;
        const winPath = target.replace(/\//g, "\\");
        const req = typeof window.require === "function" ? window.require : null;
        if (req) {
            try {
                const electron = req("electron");
                if (electron && electron.shell && typeof electron.shell.openPath === "function") {
                    electron.shell.openPath(winPath);
                    return true;
                }
            } catch (err) { /* 退回 child_process */ }
            try {
                req("child_process").exec(`explorer "${winPath}"`);
                return true;
            } catch (err) {
                console.warn("打开资源管理器失败", err);
            }
        }
        alert(`无法自动调起资源管理器，请手动打开这个目录：\n${winPath}`);
        return false;
    }
    /**
     * 打开当前工作区目录（目录不存在就先建出来）
     */
    async openWorkspaceInExplorer() {
        const workspace = this.workspace;
        if (!workspace) {
            alert("请先选择工作区。");
            return;
        }
        await this.ensureWorkspaceDirs(workspace);
        this.openInExplorer(this.workspaceDir(workspace));
    }


    /**
     * 保证工作区的四个资源目录在磁盘上存在，并把配置更新为它们。
     * 规则：配置已有自定义值（≠ 扩展根）→ 不动；否则优先沿用扩展里已存在的约定目录
     * （如 `image` / `audio`），都没有就**新建**默认目录。
     * 建目录失败不再静默：结果写进 `this.dirErrors`，由 renderWorkspace() 显示在提示行里。
     * @param {string} extensionName
     * @returns {Promise<{folderList: string[], config: object}>}
     */
    async ensureWorkspaceDirs(extensionName) {
        if (!extensionName) return { folderList: [], config: {} };
        let [folderList] = await this.fileQuery("getAllFolderAndFileList", { path: "extension/" + extensionName }) || [[], []];
        const config = this.readExtensionFileConfig(extensionName);
        const patch = {};
        const failed = [];
        for (const [key, defaultDir] of Object.entries(WORKSPACE_DEFAULT_DIRS)) {
            const current = config[key];
            if (current && current !== extensionName) continue;
            const existed = [defaultDir, ...(WORKSPACE_LEGACY_DIRS[key] || [])].find(dir => folderList.includes(dir));
            const target = existed || defaultDir;
            if (!existed) {
                try {
                    await this.fileQuery("createDir", { path: `extension/${extensionName}/${target}` });
                    folderList = [...folderList, target];
                } catch (err) {
                    failed.push(`${target}（${(err && err.message) || err}）`);
                }
            }
            patch[key] = extensionName + "/" + target;
        }
        this.dirErrors = failed;
        if (Object.keys(patch).length) this.writeExtensionFileConfig(extensionName, patch);
        return { folderList, config: this.readExtensionFileConfig(extensionName) };
    }
    /**
     * 弹输入框。**必须挂在 `ui.window`**：`<noname-dialog>` 的 `:host` 是 `position:absolute`，
     * 挂在侧栏组件的 shadowRoot 里会以窄侧栏为包含块、被面板的 overflow 裁掉。
     * @param {{headline?: string, message?: string, placeholder?: string}} config
     * @returns {Promise<string|boolean>} 输入串；取消为 `false`
     */
    async promptText(config = {}) {
        const dialog = document.createElement("noname-dialog");
        //type 分支开头会清空 headline/message，所以先设 type 再设文案
        dialog.setAttribute("type", "prompt");
        if (config.headline) dialog.setAttribute("headline", config.headline);
        if (config.message) dialog.setAttribute("message", config.message);
        if (config.placeholder) dialog.setAttribute("placeholder", config.placeholder);
        (ui.window || document.body).appendChild(dialog);
        try {
            return await dialog.wait();
        } finally {
            dialog.remove();
        }
    }

    /**
     * 系统「选择文件夹」对话框（Electron `dialog.showOpenDialog`）——界面就是 Windows 资源管理器那套。
     * Electron ≥14 走 `@electron/remote`，更老的走 `electron.remote`（noname 自己在 `init/node.js:29` 也是这么分支的）。
     * @param {string} [defaultPath] 打开时定位到的目录（绝对路径）
     * @returns {Promise<string|null>} 选中的绝对路径；取消或环境不支持时为 null
     */
    async openNativeFolderDialog(defaultPath) {
        const req = typeof window.require === "function" ? window.require : null;
        if (!req) return null;
        const electronVersion = parseFloat((window.process && window.process.versions && window.process.versions.electron) || "0");
        let remote = null;
        try {
            remote = electronVersion >= 14 ? req("@electron/remote") : (req("electron") || {}).remote;
        } catch (err) {
            remote = null;
        }
        if (!remote || !remote.dialog || typeof remote.dialog.showOpenDialog !== "function") return null;
        if (!this.workspaceDir()) return null;
        const options = {
            title: "选择文件夹",
            defaultPath: defaultPath || this.workspaceDir(),
            properties: ["openDirectory", "createDirectory"]
        };
        // 挂到游戏窗口上：全屏时对话框才不会跑到窗口后面
        const currentWindow = typeof remote.getCurrentWindow === "function" ? remote.getCurrentWindow() : null;
        const result = currentWindow
            ? await remote.dialog.showOpenDialog(currentWindow, options)
            : await remote.dialog.showOpenDialog(options);
        if (!result || result.canceled || !result.filePaths || !result.filePaths.length) return null;
        return result.filePaths[0];
    }
    /**
     * 把绝对路径换算成 `extensionFileConfig` 里存的相对路径
     * @param {string} absPath
     * @returns {string} 不在该工作区内返回 ""；正好是工作区根时返回工作区名
     */
    toWorkspaceRelative(absPath) {
        const workspace = this.workspace;
        if (!workspace) return "";
        const root = this.workspaceDir(workspace).replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
        const target = String(absPath || "").replace(/\\/g, "/").replace(/\/+$/, "");
        const lower = target.toLowerCase();
        if (lower === root) return workspace;
        if (!lower.startsWith(root + "/")) return "";
        return `${workspace}/${target.slice(root.length + 1)}`;
    }
    /**
     * 每行「…」：直接弹系统文件夹选择框（资源管理器界面），选完写进该行并建出目录。
     * 原生对话框拿不到时（网页端 / 没启用 remote）退化为：直接在资源管理器里打开该工作区目录。
     * @param {string} key extensionFileConfig 的字段名
     */
    async pickWorkspaceDir(key) {
        const workspace = this.workspace;
        if (!workspace) {
            alert("请先选择工作区。");
            return;
        }
        const current = this.readExtensionFileConfig(workspace)[key] || "";
        const inner = current && current !== workspace ? current.replace(`${workspace}/`, "") : "";
        const picked = await this.openNativeFolderDialog(inner ? `${this.workspaceDir(workspace)}/${inner}` : this.workspaceDir(workspace));
        if (picked === null) {
            //退化：打开资源管理器，自己建/整理后回面板「刷新列表」
            this.openInExplorer(this.workspaceDir(workspace));
            return;
        }
        const value = this.toWorkspaceRelative(picked);
        if (!value) {
            alert(`请选择扩展目录内部的文件夹：\n${this.workspaceDir(workspace)}`);
            return;
        }
        await this.fileQuery("createDir", { path: `extension/${value}` });
        this.writeExtensionFileConfig(workspace, { [key]: value });
        this.refreshWorkspaceFiles(workspace);
    }

    /**
     * 拉一次工作区目录树：补齐（必要时新建）资源目录、填 datalist、回填界面
     * @param {string} extensionName
     */
    async refreshWorkspaceFiles(extensionName) {
        const datalist = this.shadowRoot.getElementById("workspaceFolderList");
        this.workspaceFolders = [];
        if (datalist) datalist.innerHTML = "";
        if (!extensionName) return this.renderWorkspace();
        await this.ensureWorkspaceDirs(extensionName);
        const [folderList] = await this.fileQuery("getAllFolderAndFileList", { path: "extension/" + extensionName }) || [[], []];
        this.workspaceFolders = [extensionName, ...folderList.map(folder => extensionName + "/" + folder)];
        if (datalist) datalist.innerHTML = this.workspaceFolders.map(path => `<option value="${path}"></option>`).join("");
        this.renderWorkspace();
    }
    /**
     * 把当前工作区与它的资源目录回填到界面
     */
    renderWorkspace() {
        const query = id => this.shadowRoot.getElementById(id);
        const names = this.extensionList;
        let workspace = this.workspace;
        //扩展被删/取消注册：清掉失效的工作区，别让编辑器继续指向一个不存在的扩展
        if (workspace && !names.includes(workspace)) {
            this.write("workspace", "");
            workspace = "";
        }
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
                ? `工作区「${workspace}」：武将草稿与资源目录都归它。\n扩展目录：${this.workspaceDir(workspace)}`
                : "工作区即扩展：先在上面选择或新建一个扩展，武将草稿列表会按它过滤。";
            if (workspace && this.dirErrors && this.dirErrors.length) {
                hint.textContent += `\n⚠ 目录创建失败：${this.dirErrors.join("、")}——可用「打开资源管理器」手动建。`;
            }
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
        //资源目录一并建立（image/character、image/card、audio/skill、audio/die）并写入配置
        await this.ensureWorkspaceDirs(name);
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
        const name = await this.promptText({
            headline: "新建工作区（= 新建扩展）",
            message: "扩展名同时是文件夹名；创建后会一并建立资源目录，但要重启游戏才会加载。",
            placeholder: "例如：我的扩展"
        });
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
