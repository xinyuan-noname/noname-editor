"use script";
import "./component.mjs";
import "./component-setting.mjs";
import { UniqueChoiceManager, DragManager, toggleMultiClass } from "./encapsulated.mjs";

/**
 * @typedef {import("./nonameEditor.mjs").NonameEditor NonameEditor}
 */
export class NonameEditorView {
    /**
     * @type {HTMLDivElement}
     */
    mainPage;

    /**
     * @type {NonameEditor}
     */
    serveFor;
    /**
     * @type {UniqueChoiceManager}
     */
    navsController;
    /**
     * @type {HTMLDivElement}
     */
    get minimizeControl() {
        return this.mainPage.querySelector(".xy-ED-minimizeControl");
    }
    /**
     * @type {HTMLDivElement}
     */
    get operationPage() {
        return this.mainPage.querySelector(".xy-ED-operationPage");
    }
    /**
     * @type {HTMLDivElement}
     */
    get h_minimize() {
        return this.mainPage.querySelector(".xy-ED-control-minize");
    }
    /**
     * @type {HTMLDivElement}
    */
    get h_close() {
        return this.mainPage.querySelector(".xy-ED-control-close");
    }
    /**
     * @type {HTMLDivElement}
    */
    get viewArea() {
        return this.mainPage.querySelector(".xy-ED-viewArea");
    }
    /**
     * @type {HTMLDivElement}
    */
    get sideBar() {
        return this.mainPage.querySelector(".xy-ED-viewArea>sideBar");
    }
    /**
     * @type {HTMLDivElement}
    */
    get mainArea() {
        return this.mainPage.querySelector(".xy-ED-mainArea");
    }
    /**
     * @type {HTMLHRElement}
    */
    get resizeLine() {
        return this.mainPage.querySelector(".xy-ED-viewArea>.xy-ED-sideBar>hr");
    }
    /**
     * @type {HTMLElement}
    */
    get nav() {
        return this.mainPage.querySelector(".xy-ED-viewArea>.xy-ED-sideBar>nav");
    }
    get navSearch() {
        return this.nav.querySelector(".xy-ED-nav-search")
    }
    get navSkill() {
        return this.nav.querySelector(".xy-ED-nav-skill")
    }
    get navCharacter() {
        return this.nav.querySelector(".xy-ED-nav-character")
    }
    get navSetting() {
        return this.nav.querySelector(".xy-ED-nav-setting")
    }
    get navCard() {
        return this.nav.querySelector(".xy-ED-nav-card")
    }
    /**
     * @type {NodeListOf<HTMLElement>}
    */
    get navs() {
        return this.mainPage.querySelectorAll(".xy-ED-viewArea>.xy-ED-sideBar>nav>*");
    }
    /**
     * @type {HTMLElement}
    */
    get sideBarContent() {
        return this.mainPage.querySelector(".xy-ED-sideBar>.xy-ED-sideBar-content");
    }
    /**
     * @type {HTMLElement}
     */
    get sideBarSetting() {
        return this.sideBarContent.querySelector(".xy-ED-sideBar-setting")
    }
    /**
     * @type {HTMLElement}
     */
    get sideBarCharacter() {
        return this.sideBarContent.querySelector(".xy-ED-sideBar-character")
    }
    /**
     * @type {HTMLElement}
     */
    get sideBarCard() {
        return this.sideBarContent.querySelector(".xy-ED-sideBar-card")
    }
    /**
     * @type {HTMLElement}
     */
    get sideBarSearch() {
        return this.sideBarContent.querySelector(".xy-ED-sideBar-search")
    }
    get sideBarSkill() {
        return this.sideBarContent.querySelector(".xy-ED-sideBar-skill")
    }
    /**
     * @type {NodeListOf<HTMLElement>}
    */
    get sideBarContents() {
        return this.mainPage.querySelectorAll(".xy-ED-sideBar>.xy-ED-sideBar-content>*");
    }
    /**
     * @type {NodeListOf<HTMLElement>}
     */
    get expanables() {
        return this.viewArea.querySelectorAll("[class^=xy-ED-expandable]");
    }
    constructor() {
        const mainPage = document.createElement("div");
        mainPage.classList.add("xy-ED-nonameEditor")
        this.mainPage = mainPage;
    }
    /**
     * @param {HTMLElement} parentNode 
     */
    /**
     * 标题旁显示当前工作区（= 扩展名）
     */
    syncTitleWorkspace() {
        const node = this.operationPage.querySelector(".xy-ED-title-workspace");
        if (!node) return;
        const workspace = this.serveFor.data.getConfig("x19D6_editor.settings.workspace") || "";
        node.textContent = workspace ? ` ｜ ${workspace}` : " ｜ 未选择工作区";
        node.classList.toggle("xy-ED-title-workspace-empty", !workspace);
    }
    /**
     * 工作区（= 扩展）切换：刷新标题与草稿列表，并让已打开的武将编辑器跟上
     */
    listenWorkspaceChange() {
        this.operationPage.addEventListener("workspaceChange", () => {
            this.syncTitleWorkspace();
            this.loadSideBarCharacter();
            this.mainPanes.forEach(pane => pane.syncWorkspace?.());
        });
    }
    init(parentNode) {
        const mainPage = this.mainPage;
        //$: mainPage , html/index.html//
mainPage.innerHTML=`
<div class="xy-ED-minimizeControl" draggable>魂</div>
<div class="xy-ED-operationPage">
    <header>
        <div class="xy-ED-header-left">
            <div class="xy-ED-title">魂氏编辑器<span class="xy-ED-title-workspace"></span></div>
        </div>
        <div class="xy-ED-header-right">
            <div class="xy-ED-control-minize"></div>
            <div class="xy-ED-control-close"></div>
        </div>
    </header>
    <div class="xy-ED-viewArea">
        <div class="xy-ED-mainArea">
            <div class="xy-ED-mainTabs xy-ED-hidden"></div>
            <div class="xy-ED-mainEmpty">未打开任何编辑器<br>从左侧「武将」或「技」页打开</div>
        </div>
        <div class="xy-ED-sideBar">
            <hr>
            <div class="xy-ED-sideBar-content">
                <div class="xy-ED-sideBar-setting" data-by="setting"><setting-panel></setting-panel></div>
                <div class="xy-ED-sideBar-skill" data-by="skill"></div>
                <div class="xy-ED-sideBar-character" data-by="character">
                    <div class="xy-ED-nocharacterCard">
                        <div>暂未创建过武将!</div>
                        <button>点击创建</button>
                    </div>
                    <div class="xy-ED-characte-show">
                        <header><span class="xy-ED-characte-count"></span><span class="xy-ED-refresh-button" title="刷新已保存武将列表">⟳ 刷新</span></header>
                        <ul></ul>
                    </div>
                </div>
                <div class="xy-ED-sideBar-card" data-by="card"></div>
                <div class="xy-ED-sideBar-search" data-by="search">
                    <div class="xy-ED-input-container">
                        <div>
                            <input spellcheck="false">
                            <span class="xy-ED-input-clear"></span>
                            <span class="xy-ED-input-search"></span>
                        </div>
                        <div class="xy-ED-search-mode-controller">
                            <span data-search-mode="skill" data-placeholder="这里输入以搜索技能">技能</span>
                            <span data-search-mode="character" data-placeholder="输入武将的姓名、分包、技能名以搜索">武将</span>
                            <span data-search-mode="bwikiSkin" data-placeholder="请输入武将名以搜索" tilte="来自bwiki">bwiki皮肤</span>
                        </div>
                    </div>
                    <hr>
                    <div class="xy-ED-search-concerning">
                        <div class="xy-ED-searchResult">
                            <header>
                                <div class="xy-ED-expandable-expanded" data-for=search-result></div>
                                <div>搜索结果</div>
                            </header>
                            <section data-by=search-result></section>
                        </div>
                    </div>
                </div>
            </div>
            <nav>
                <div class="xy-ED-nav-setting" data-for="setting" draggable="true"></div>
                <div class="xy-ED-nav-skill" data-for="skill" draggable="true"></div>
                <div class="xy-ED-nav-character" data-for="character" draggable="true"></div>
                <div class="xy-ED-nav-card" data-for="card" draggable="true"></div>
                <div class="xy-ED-nav-search" data-for="search" draggable="true"></div>
            </nav>
        </div>
    </div>
</div>`
//#: mainPage , html/index.html//
        parentNode.appendChild(mainPage);
        this.listenPageClose();
        this.listenPageMinize();
        //
        this.listenSideBarResize();
        //
        this.listenMainAreaChange()
        //
        this.listenSideBarCharacter();
        this.listenSideBarSkill();
        this.listenSideBarSearch();
        //
        this.listenNavsReOrder();
        this.listenNavChoose();
        //
        this.listenSearchEvent()
        //
        this.listenExpanable();
        this.restoreShellState();
        this.syncTitleWorkspace();
        this.listenWorkspaceChange();
        this.listenStopPropagation()
    }
    //
    listenPageClose() {
        this.h_close.addEventListener("pointerup", () => {
            this.mainPage.remove();
        })
    }
    listenPageMinize() {
        const { h_minimize, minimizeControl, operationPage, mainPage } = this;
        const dragManager = new DragManager(mainPage, minimizeControl)
            .beDraggable();
        const nodeMap = new WeakMap([
            [h_minimize, operationPage],
            [minimizeControl, minimizeControl]
        ])
        new UniqueChoiceManager(h_minimize, minimizeControl)
            .forClassByNodeMap(nodeMap, "xy-ED-hidden")
            .listenAllNodes("pointerup", () => !dragManager.dragStatus.isDragging)
            .choose(minimizeControl);
    }
    //
    /**
     * 标签栏元素（html/index.html 里 mainArea 的第一个子元素）
     * @type {HTMLElement|null}
     */
    get mainTabs() {
        return this.mainArea.querySelector(":scope>.xy-ED-mainTabs");
    }
    /**
     * 主区里的编辑器面板（排除标签栏与空态提示）
     * @type {HTMLElement[]}
     */
    get mainPanes() {
        return Array.from(this.mainArea.children).filter(node =>
            !node.classList.contains("xy-ED-mainTabs") && !node.classList.contains("xy-ED-mainEmpty"));
    }
    /**
     * 当前可见的武将编辑器（标签页形式下，往技能栏放技能要落到看得见的那个）
     * @type {HTMLElement|null}
     */
    get activeCharacterEditor() {
        const list = this.mainPanes.filter(node => node.tagName === "CHARACTER-EDITOR");
        return list.find(node => !node.classList.contains("xy-ED-pane-hidden")) || list[list.length - 1] || null;
    }
    /**
     * 主区改成「标签栏 + 单面板」：同一时刻只有一个编辑器可见（占满宽度），
     * 面板之间用标签切换、✕ 关闭。原先的多栏网格会把武将编辑器挤到半宽变形。
     */
    listenMainAreaChange() {
        const observer = new MutationObserver(() => this.syncMainTabs());
        observer.observe(this.mainArea, { attributes: false, childList: true, subtree: false });
        //组件内改了 id/名字 → 冒泡 tabTitleChange → 只刷那一个标签
        this.mainArea.addEventListener("tabTitleChange", e => this.updateMainTab(e.target));
        //「使用」是把 requestUseSkill 派发到武将编辑器的技能区上：若它此刻在别的标签页后面，
        //用户会以为点了没反应，这里顺手把它的标签切到前台
        this.mainArea.addEventListener("requestUseSkill", e => {
            const pane = e.target;
            if (pane && pane.tagName === "CHARACTER-EDITOR") this.activateMainPane(pane);
        });
        this.syncMainTabs();
    }
    /**
     * 同步标签栏与面板可见性：给每个面板补/删标签，并保证有且只有一个面板可见。
     * @param {HTMLElement} [activate] 需要切过去的面板（新建面板时自动激活最后加入的那个）
     */
    syncMainTabs(activate) {
        const tabs = this.mainTabs;
        if (!tabs) return;
        const panes = this.mainPanes;
        tabs.classList.toggle("xy-ED-hidden", panes.length === 0);
        //1. 清掉已经没有面板的标签
        Array.from(tabs.children).forEach(tab => {
            if (!panes.includes(tab.paneNode)) tab.remove();
        });
        //2. 给还没有标签的面板补上
        panes.forEach(pane => {
            let tab = Array.from(tabs.children).find(node => node.paneNode === pane);
            if (!tab) {
                tab = document.createElement("div");
                tab.className = "xy-ED-mainTab";
                tab.paneNode = pane;
                const title = document.createElement("span");
                const close = document.createElement("span");
                close.className = "xy-ED-mainTab-close";
                close.textContent = "✕";
                close.title = "关闭";
                tab.append(title, close);
                tab.addEventListener("pointerdown", e => {
                    if (e.target === close) return;
                    this.activateMainPane(pane);
                });
                close.addEventListener("pointerdown", e => {
                    e.stopPropagation();
                    pane.remove();
                });
                tabs.appendChild(tab);
            }
            this.updateMainTab(pane, tab);
        });
        //3. 决定可见面板：切换目标 > 原本可见的 > 最新加入的
        const visible = panes.find(pane => !pane.classList.contains("xy-ED-pane-hidden"));
        const next = activate && panes.includes(activate) ? activate : (visible || panes[panes.length - 1]);
        panes.forEach(pane => pane.classList.toggle("xy-ED-pane-hidden", pane !== next));
        Array.from(tabs.children).forEach(tab => tab.classList.toggle("xy-ED-mainTab-chosen", tab.paneNode === next));
        //4. 空态提示
        const empty = this.mainArea.querySelector(":scope>.xy-ED-mainEmpty");
        if (empty) empty.classList.toggle("xy-ED-hidden", panes.length > 0);
    }
    /**
     * 切换到某个面板（同时高亮对应标签）
     * @param {HTMLElement} pane
     */
    activateMainPane(pane) {
        if (!pane || !this.mainPanes.includes(pane)) return;
        this.syncMainTabs(pane);
    }
    /**
     * 刷新一个标签的标题：面板可自定义 getTabTitle()（武将：id / 技能：id），否则退回标签名
     * @param {HTMLElement} pane
     * @param {HTMLElement} [tab]
     */
    updateMainTab(pane, tab = Array.from(this.mainTabs ? this.mainTabs.children : []).find(node => node.paneNode === pane)) {
        if (!pane || !tab) return;
        const title = tab.firstElementChild;
        if (!title) return;
        const fallback = pane.tagName ? pane.tagName.toLowerCase() : "面板";
        const text = typeof pane.getTabTitle === "function" ? pane.getTabTitle() : fallback;
        title.textContent = text || fallback;
        tab.title = `${title.textContent}｜点击切换，点 ✕ 关闭`;
    }
    //
    listenSideBarResize() {
        const { viewArea, resizeLine } = this;
        const resizeStatus = {
            isResizing: false,
            frame: null
        }
        viewArea.addEventListener("pointerdown", e => {
            if (e.target !== resizeLine) return;
            resizeStatus.isResizing = true;
        })
        viewArea.addEventListener("pointermove", e => {
            if (!resizeStatus.isResizing) return;
            if (this.frame) cancelAnimationFrame(this.frame);
            this.frame = requestAnimationFrame(() => {
                let r = e.clientX / devicePixelRatio / viewArea.clientWidth;
                viewArea.style.setProperty("--xy-ED-WidthRatio", (1 - r) / r);
                this.frame = null;
            })
        });
        viewArea.addEventListener("pointerup", () => {
            if (!resizeStatus.isResizing) return;
            resizeStatus.isResizing = false;
        });

        //收手后记录宽度比（供基本设置查看与重置）
        viewArea.addEventListener("pointerup", () => {
            const ratio = viewArea.style.getPropertyValue("--xy-ED-WidthRatio");
            if (ratio) this.saveShellState("widthRatio", Number(ratio));
        });
    }
    /**
     * @param {string} [characterId] 传入则挂载时自动载入该武将的草稿
     * @returns {HTMLElement}
     */
    createCharacterEditor(characterId) {
        const characterEditor = document.createElement("character-editor");
        //必须在挂载前设置：组件的 connectedCallback 会按 character-id 载入草稿
        if (characterId) characterEditor.setAttribute("character-id", characterId);
        this.mainArea.appendChild(characterEditor);
        return characterEditor;
    }
    /**
     * 渲染「历史武将」：数据源是已持久化的草稿 x19D6_editor.characters
     * @returns {number} 已保存的武将数量
     */
    /**
     * 渲染「历史武将」：数据源是已持久化的草稿 x19D6_editor.characters。
     * 使用既有组件 <character-info-card>（component-infoCard.mjs 定义），
     * 而不是自己拼列表项——它自带武将名/包/分包/体力/技能等展示与「使用/删除」操作条。
     * @returns {number} 已保存的武将数量
     */
    /**
     * 渲染「历史武将」：数据源是已持久化的草稿 x19D6_editor.characters。
     * 使用既有组件 <character-info-card>（component-infoCard.mjs 定义）。
     * @returns {number} 已保存的武将数量
     */
    loadSideBarCharacter() {
        const sideBarCharacter = this.sideBarCharacter;
        if (!sideBarCharacter) return 0;
        const records = this.serveFor.data.getConfig("x19D6_editor.characters");
        //工作区过滤：只列本工作区的草稿；未归属（旧数据）照常显示，避免旧草稿消失
        const workspace = this.serveFor.data.getConfig("x19D6_editor.settings.workspace") || "";
        const ids = records && typeof records === "object" ? Object.keys(records).filter(id => !workspace || !records[id]?.extension || records[id].extension === workspace) : [];
        const emptyCard = sideBarCharacter.querySelector(".xy-ED-nocharacterCard");
        const showBox = sideBarCharacter.querySelector(".xy-ED-characte-show");
        const counter = showBox.querySelector(".xy-ED-characte-count");
        const ul = showBox.querySelector("ul");
        ul.replaceChildren();
        ids.forEach(id => {
            const data = records[id] || {};
            const card = document.createElement("character-info-card");
            card.setAttribute("character-id", id);
            //removable 开启「删除」，usable 开启「使用」（点击后发 useCardData 事件）
            card.setAttribute("removable", "true");
            card.setAttribute("usable", "true");
            card.characterInfo = {
                id,
                name: data.name || id,
                packageName: data.packageId || data.extension,
                characterSortName: data.characterSortName || data.characterSort,
                sex: data.sex,
                group: data.group,
                hp: data.hp,
                maxHp: data.maxHp,
                hujia: data.hujia,
                clans: Array.isArray(data.clans) ? data.clans.join("、") : data.clans,
                skillList: Array.isArray(data.skills) ? data.skills : [],
                dieAudios: []
            };
            if (data.savedAt) card.title = `最后保存：${new Date(data.savedAt).toLocaleString()}`;
            ul.appendChild(card);
        });
        if (counter) counter.textContent = ids.length ? `已保存 ${ids.length} 位（使用→编辑，删除→丢弃）` : "";
        if (emptyCard) emptyCard.classList.toggle("xy-ED-hidden", ids.length > 0);
        if (showBox) showBox.classList.toggle("xy-ED-hidden", ids.length === 0);
        return ids.length;
    }
    listenSideBarCharacter() {
        const { sideBarCharacter } = this;
        const noneCharacterCardButton = sideBarCharacter.querySelector("button");
        noneCharacterCardButton.addEventListener("pointerup", () => {
            this.createCharacterEditor();
        });
        //每次点开「武将」页都刷新一次列表
        this.navCharacter.addEventListener("pointerup", () => this.loadSideBarCharacter());
        //手动刷新键
        const refreshButton = sideBarCharacter.querySelector(".xy-ED-refresh-button");
        if (refreshButton) refreshButton.addEventListener("pointerup", () => this.loadSideBarCharacter());
        //与编辑区同步：武将编辑页被打开/关闭（增删子元素）时自动刷新列表，
        //否则关闭编辑页后侧栏会与实际草稿不同步
        if (!this.characterListObserver) {
            this.characterListObserver = new MutationObserver(() => this.loadSideBarCharacter());
            this.characterListObserver.observe(this.mainArea, { childList: true });
        }
        const ul = sideBarCharacter.querySelector("ul");
        //点击卡片操作条上的「使用」：继续编辑该草稿
        ul.addEventListener("useCardData", e => {
            const node = e.detail && e.detail.from;
            const id = node && node.getAttribute && node.getAttribute("character-id");
            if (!id) return;
            const opened = this.mainArea.querySelector(`character-editor[character-id="${CSS.escape(id)}"]`);
            if (opened) {
                //已经开着的草稿：切到它的标签页（主区改标签页后，直接 return 会表现为点了没反应）
                this.activateMainPane(opened);
                return;
            }
            this.createCharacterEditor(id);
        });
        //点击卡片操作条上的「删除」：丢弃该草稿（写回配置持久化）
        ul.addEventListener("removeCard", e => {
            const node = e.detail && e.detail.from;
            const id = node && node.getAttribute && node.getAttribute("character-id");
            if (!id) return;
            const records = this.serveFor.data.getConfig("x19D6_editor.characters");
            if (!records || !(id in records)) return;
            delete records[id];
            this.serveFor.data.writeConfig("x19D6_editor.characters", records);
            this.loadSideBarCharacter();
        });
        this.loadSideBarCharacter();
    }
    //
    /**
     * @typedef {{
     *      noDelete:boolean,
     *      highlight:string[],
     *      useFor:HTMLElement
     * }}  searchResultItemConfig
     */
    /**
     * @param {{id:string}} searchResult 
     * @param {searchResultItemConfig} config
     * @returns 
     */
    createSearchSkillListItem(searchResult, config = {}) {
        if (typeof searchResult !== "object") throw new Error("SearchResult must be a object");
        const skillCard = document.createElement("skill-info-card");
        const { noDelete, highlight, useFor } = config;
        skillCard.setAttribute("skill-id", searchResult.id);
        skillCard.skillInfo = searchResult;
        if (!noDelete) skillCard.setAttribute("removable", true);
        skillCard.setAttribute("usable", true);
        skillCard.setAttribute("markwords", highlight.join(" "));
        if (useFor) {
            skillCard.useForNode = useFor;
            skillCard.setAttribute("useFor", useFor.id);
        }
        return skillCard;
    }
    /**
     * @param {{id:string}} searchResult 
     * @param {searchResultItemConfig} config 
     * @returns 
     */
    createSearchCharacterListItem(searchResult, config = {}) {
        if (typeof searchResult !== "object") throw new Error("SearchResult must be a object");
        const characterCard = document.createElement("character-info-card");
        const { noDelete, highlight, useFor } = config;
        characterCard.setAttribute("character-id", searchResult.id);
        characterCard.characterInfo = searchResult;
        if (!noDelete) characterCard.setAttribute("removable", true);
        characterCard.setAttribute("skill-usable", true);
        characterCard.setAttribute("usable", true);
        characterCard.setAttribute("markwords", highlight.join(" "));
        if (useFor) {
            characterCard.useForNode = useFor;
            characterCard.setAttribute("useFor", useFor.id);
        }
        return characterCard;
    }
    createSearchBwikiSinkListItem(searchResult, config) {
        if (typeof searchResult !== "object") throw new Error("SearchResult must be a object");
        const skinCard = document.createElement("skin-info-card");
        const { noDelete, useFor } = config;
        const { link, ...skinInfo } = searchResult;
        skinCard.skinInfo = skinInfo;
        skinCard.setAttribute("src", link);
        if (!noDelete) skinCard.setAttribute("removable", true);
        if (useFor) {
            skinCard.useForNode = useFor;
            skinCard.setAttribute("useFor", useFor.id);
        }
        return skinCard;
    }
    /**
     * 外壳状态（侧栏宽度比 / 导航顺序 / 上次所在页）的读写
     */
    saveShellState(member, value) {
        return this.serveFor.data.writeConfig(`x19D6_editor.ui.${member}`, value);
    }
    restoreShellState() {
        const data = this.serveFor.data;
        const ratio = data.getConfig("x19D6_editor.ui.widthRatio");
        if (ratio) this.viewArea.style.setProperty("--xy-ED-WidthRatio", String(ratio));
        const order = data.getConfig("x19D6_editor.ui.navOrder");
        if (Array.isArray(order) && order.length) {
            order.forEach(forKey => {
                const node = this.nav.querySelector(`[data-for="${forKey}"]`);
                if (node) this.nav.appendChild(node);
            });
        }
        const lastNav = data.getConfig("x19D6_editor.ui.lastNav");
        const remember = data.getConfig("x19D6_editor.settings.rememberPage");
        if (lastNav && remember !== false) this.toggleNav(lastNav);
    }
    listenSideBarSkill() {
        //技能编辑入口：走 openSkillEditor 的「新/旧」偏好分流，不要直接调旧版
        //（偏好存在 x19D6_editor.settings.skillEditorVersion，首次弹一次，之后在设置页改）
        this.navSkill.addEventListener("pointerup", () => {
            if (typeof game.x19D6_openSkillEditor === "function") game.x19D6_openSkillEditor();
        });
    }
    listenSideBarSearch() {
        const { sideBarSearch } = this;
        const input = sideBarSearch.querySelector("input");
        const clearIcon = sideBarSearch.querySelector(".xy-ED-input-clear");
        const searchIcon = sideBarSearch.querySelector(".xy-ED-input-search");
        const searchModeControllerButtons = sideBarSearch.querySelectorAll("[data-search-mode]");
        const searchConcerning = sideBarSearch.querySelector(".xy-ED-search-concerning");
        const searchConcerningSections = Array.from(searchConcerning.querySelectorAll(":scope>div>section"));
        const [resultSection] = searchConcerningSections;
        let type = "skill";
        const getSearchRequest = () => {
            const request = { keyWords: [], filter: [] };
            if (!input.value.length) return request;
            input.value.split(" ").forEach((word, index) => {
                if (!word.length) return;
                else if (index >= 1 && word.startsWith("-") && word.length > 1) {
                    const slicedWord = word.slice(1);
                    if (!request.filter.includes(slicedWord)) request.filter.push(slicedWord);
                } else {
                    if (!request.keyWords.includes(word)) request.keyWords.push(word);
                }
            })
            return request;
        }
        input.addEventListener("change", async e => {
            const { keyWords, filter } = getSearchRequest();
            this.search(keyWords, type, { filter });
        });
        searchIcon.addEventListener("pointerdown", async e => {
            const { keyWords, filter } = getSearchRequest();
            this.search(keyWords, type, { filter });
        });
        clearIcon.addEventListener("pointerdown", () => (input.value = ""));
        new UniqueChoiceManager(...searchModeControllerButtons)
            .setCallback((last, now, funMap) => {
                funMap.forClass("xy-ED-chosen");
                type = now.dataset.searchMode;
            })
            .listenSiblings("pointerdown")
            .choose(searchModeControllerButtons[0])
        //
        /** ⬅️：技能→往当前武将编辑器里放一份副本；武将→打开该武将草稿 */
        const useCard = node => {
            const characterId = node?.getAttribute?.("character-id");
            if (characterId) {
                const opened = this.mainArea.querySelector(`character-editor[character-id="${CSS.escape(characterId)}"]`);
                if (opened) this.activateMainPane(opened);
                else this.createCharacterEditor(characterId);
                return;
            }
            const skillId = node?.getAttribute?.("skill-id");
            if (!skillId) return;
            //带 usefor 的结果卡片由组件自己的 requestUseSkill 处理（那条路径是「把卡片移进技能栏」）；
            //但目标编辑器已关闭时，那条路径只会把卡片挪进一个看不见的编辑器（卡片凭空消失），这时由这里接管
            if (node.hasAttribute("usefor") && node.useForNode?.isConnected) return;
            //技能可能已被删除（历史草稿引用的技能）
            if (!this.serveFor.data.checkSkillTags(skillId, [])) return;
            //落到「当前看得见的那个」武将编辑器；一个都没有就新建（否则这个箭头点了看不出反应）
            const editor = this.activeCharacterEditor || this.createCharacterEditor();
            this.activateMainPane(editor);
            editor.addSkill(skillId);
        };
        //搜索结果卡片的 ⬅️ 交给 useCard（🗑️ 只是把该条从搜索结果里移除，卡片自己处理）
        resultSection.addEventListener("useCardData", e => useCard(e.detail?.from));
        const config = {
            childList: true,
            attributes: true,
            subtree: true,
            attributeFilter: ['class']
        }
        const observer = new MutationObserver(() => {
            requestAnimationFrame(() => {
                searchConcerningSections.forEach(ul => {
                    ul.parentElement.style.setProperty("--xy-ED-flex-index", getComputedStyle(ul).display === "none" ? 0 : 1);
                })
            })
        })
        searchConcerningSections.forEach(ul => {
            observer.observe(ul, config);
        })
    }
    //
    listenNavsReOrder() {
        let draggingNode = null;
        this.navs.forEach(node => {
            node.addEventListener("dragstart", e => (draggingNode = e.target));
            node.addEventListener("dragover", e => {
                e.preventDefault()
                const navArray = Array.from(this.navs)
                let i = navArray.indexOf(draggingNode),
                    j = navArray.indexOf(e.target);
                i < j ?
                    this.nav.insertBefore(e.target, draggingNode) : this.nav.insertBefore(draggingNode, e.target);
            });
        })
    }
    listenNavChoose() {
        const navsArray = Array.from(this.navs).map(node => [node, new Map([
            [node, ["xy-ED-nav-chosen"]],
            [this.sideBarContent.querySelector(`[data-by=${node.dataset.for}]`), ["xy-ED-shown-flex"]]
        ])]);
        const navClassMap = new WeakMap(navsArray);
        this.navsController = new UniqueChoiceManager(...this.navs)
            .listenSiblings("pointerup")
            .forClassByNodeClassMap(navClassMap)
            .setCallback((last, now, funMap) => {
                //注意：setCallback 是覆盖 this.callback 而不是追加，
                //必须用它的 funMap 参数把上一步的类切换重新执行一次，否则切换导航不会生效
                funMap.forClassByNodeClassMap(navClassMap);
                if (now && now.dataset && now.dataset.for) this.saveShellState("lastNav", now.dataset.for);
            })
    }
    //
    listenSearchEvent() {
        const viewArea = this.viewArea;
        viewArea.addEventListener("searchSkill", (e) => {
            const { from, keyWords, filter, toggleNav } = e.detail;
            if (toggleNav === true) {
                this.toggleNav("search");
                this.search(keyWords, "skill", { requestFrom: from, filter });
            }
        })
        viewArea.addEventListener("searchCharacter", (e) => {
            const { from, keyWords, filter, toggleNav } = e.detail;
            if (toggleNav === true) {
                this.toggleNav("search");
                this.search(keyWords, "character", { requestFrom: from, filter });
            }
        })
    }
    //
    listenExpanable() {
        this.expanables.forEach(node => {
            const linkedNodes = this.operationPage.querySelectorAll(`[data-by= ${node.dataset.for}]`)
            const manager = toggleMultiClass(node, "xy-ED-expandable-expanded", "xy-ED-expandable-collapsed");
            node.addEventListener("pointerdown", (e) => {
                linkedNodes.forEach(linkedNode => {
                    linkedNode.classList.toggle("xy-ED-hidden");
                })
                if (node.classList.contains("xy-ED-expandable-expanded")) {
                    manager.single("xy-ED-expandable-collapsed");
                } else if (node.classList.contains("xy-ED-expandable-collapsed")) {
                    manager.single("xy-ED-expandable-expanded");
                }
            })
        })
    }
    //
    listenStopPropagation() {
        //防止事件冒泡到window,触发各种稀奇古怪的事件
        this.viewArea.addEventListener("keydown", (e) => {
            e.stopPropagation()
        })
    }
    /**
     * @param {"search"|"card"|"setting"|"character"} navName 
     * @returns 
     */
    toggleNav(navName) {
        switch (navName) {
            case "search": this.navsController.choose(this.navSearch); break;
            case "card": this.navsController.choose(this.navCard); break;
            case "setting": this.navsController.choose(this.navSetting); break;
            case "character": this.navsController.choose(this.navCharacter); break;
            case "skill": this.navsController.choose(this.navSkill); break;
        }
        return this;
    }
    /**
     * 
     * @param {string[]} keyWords 
     * @param {"skill"|"character"} type 
     * @returns 
     */
    search(keyWords, type = "skill", { limit = 5, requestFrom, filter } = {}) {
        const resultSection = this.sideBarSearch.querySelector("[data-by=search-result]");
        resultSection.scrollTo({ top: 0 });
        resultSection.innerHTML = "";
        if (keyWords.every(word => word == "")) return;
        let intersectionObserver;
        const appendChildrenMethod = (() => {
            const config = { highlight: keyWords, useFor: requestFrom }
            switch (type) {
                case "skill": {
                    return (searchResults) => {
                        return searchResults.map(result => this.createSearchSkillListItem(result, config));
                    }
                }
                case "character": {
                    return (searchResults) => {
                        return searchResults.map(result => this.createSearchCharacterListItem(result, config));
                    }
                }
                case "bwikiSkin": {
                    return (searchResult) => {
                        return searchResult.map(result => this.createSearchBwikiSinkListItem(result, config))
                    }
                }
                default: return () => [];
            }
        })()
        const appendItem = async (searchResults) => {
            new Promise((resolve) => {
                resolve(appendChildrenMethod(searchResults));
            }).then((children) => {
                resultSection.append(...children);
                intersectionObserver?.disconnect?.()
                intersectionObserver = new IntersectionObserver((entries) => {
                    if (entries[0].intersectionRatio <= 0) return;
                    const newSearchResults = this.serveFor.data.continueSearch(type, limit);
                    if (newSearchResults.length) {
                        appendItem(newSearchResults);
                    } else {
                        intersectionObserver.disconnect();
                    }
                }, { root: resultSection });
                if (resultSection.lastElementChild) intersectionObserver.observe(resultSection.lastElementChild);
                else intersectionObserver.disconnect();
            })
        }
        new Promise(async (reslove) => {
            reslove(await this.serveFor.data.search(type, { keyWords, require: limit, filter }))
        }).then((searchResult) => {
            appendItem(searchResult);
        })
        return;
    }
}