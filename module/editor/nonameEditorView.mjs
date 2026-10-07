"use script";
import "./component.mjs";
import "./component-skill.mjs";
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
    init(parentNode) {
        const mainPage = this.mainPage;
        //$: mainPage , html/index.html//
mainPage.innerHTML=`
<div class="xy-ED-minimizeControl" draggable>魂</div>
<div class="xy-ED-operationPage">
    <header>
        <div class="xy-ED-header-left">
            <div class="xy-ED-title">魂氏编辑器</div>
        </div>
        <div class="xy-ED-header-right">
            <div class="xy-ED-control-minize"></div>
            <div class="xy-ED-control-close"></div>
        </div>
    </header>
    <div class="xy-ED-viewArea">
        <div class="xy-ED-mainArea">
        </div>
        <div class="xy-ED-sideBar">
            <hr>
            <div class="xy-ED-sideBar-content">
                <div class="xy-ED-sideBar-setting" data-by="setting"><setting-panel></setting-panel></div>
                <div class="xy-ED-sideBar-character" data-by="character">
                    <div class="xy-ED-nocharacterCard">
                        <div>暂未创建过武将!</div>
                        <button>点击创建</button>
                    </div>
                    <div class="xy-ED-characte-show">
                        <header></header>
                        <ul></ul>
                    </div>
                </div>
                <div class="xy-ED-sideBar-card" data-by="card"></div>
                <div class="xy-ED-sideBar-skill" data-by="skill"></div>
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
                        <div class="xy-ED-searchLiked">
                            <header>
                                <div class="xy-ED-expandable-expanded" data-for=search-like></div>
                                <div>已收藏</div>
                            </header>
                            <section data-by=search-like></section>
                        </div>
                    </div>
                </div>
            </div>
            <nav>
                <div class="xy-ED-nav-setting" data-for="setting" draggable="true"></div>
                <div class="xy-ED-nav-character" data-for="character" draggable="true"></div>
                <div class="xy-ED-nav-card" data-for="card" draggable="true"></div>
                <div class="xy-ED-nav-skill" data-for="skill" draggable="true"></div>
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
    listenMainAreaChange() {
        const observer = new MutationObserver((mutationsList) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    this.mainArea.className = this.mainArea.className.replace(/xy-ED-grid-(one|two|three|four)item/, "");
                    switch (this.mainArea.children.length) {
                        case 1:
                            this.mainArea.classList.add('xy-ED-grid-oneitem');
                            break;
                        case 2:
                            this.mainArea.classList.add('xy-ED-grid-twoitem');
                            break;
                        case 3:
                            this.mainArea.classList.add('xy-ED-grid-threeitem');
                            break;
                        default:
                            this.mainArea.classList.add('xy-ED-grid-fouritem');
                            break;
                    }
                }
            }
        });
        observer.observe(this.mainArea, { attributes: false, childList: true, subtree: false });
    }
    //
    listenSideBarResize() {
        const { viewArea, resizeLine } = this;
        const resizeStatus = {
            isResizing: false,
            frame: null,
            left: 0,
            width: 0,
            pendingX: 0
        }
        const apply = () => {
            resizeStatus.frame = null;
            if (!resizeStatus.isResizing || !resizeStatus.width) return;
            // 全程只用起手时量到的几何信息，避免逐帧读取布局
            const minWidth = 160;
            let sidebarWidth = resizeStatus.width - resizeStatus.pendingX;
            const maxWidth = Math.max(minWidth, resizeStatus.width - minWidth);
            sidebarWidth = Math.min(Math.max(sidebarWidth, minWidth), maxWidth);
            const mainWidth = resizeStatus.width - sidebarWidth;
            if (mainWidth <= 0) return;
            viewArea.style.setProperty("--xy-ED-WidthRatio", String(sidebarWidth / mainWidth));
        };
        viewArea.addEventListener("pointerdown", e => {
            if (e.target !== resizeLine) return;
            const rect = viewArea.getBoundingClientRect();
            resizeStatus.isResizing = true;
            resizeStatus.left = rect.left;
            resizeStatus.width = rect.width;
            resizeStatus.pendingX = e.clientX - rect.left;
            resizeLine.setPointerCapture?.(e.pointerId);
            document.body.classList.add("xy-ED-col-resizing");
        });
        viewArea.addEventListener("pointermove", e => {
            if (!resizeStatus.isResizing) return;
            resizeStatus.pendingX = e.clientX - resizeStatus.left;
            if (!resizeStatus.frame) resizeStatus.frame = requestAnimationFrame(apply);
        });
        const finish = e => {
            if (!resizeStatus.isResizing) return;
            resizeStatus.isResizing = false;
            if (resizeStatus.frame) {
                cancelAnimationFrame(resizeStatus.frame);
                resizeStatus.frame = null;
            }
            document.body.classList.remove("xy-ED-col-resizing");
            const ratio = viewArea.style.getPropertyValue("--xy-ED-WidthRatio");
            if (ratio) this.saveShellState("widthRatio", Number(ratio));
            try {
                if (e && resizeLine.hasPointerCapture?.(e.pointerId)) resizeLine.releasePointerCapture(e.pointerId);
            } catch (err) { }
        };
        viewArea.addEventListener("pointerup", finish);
        viewArea.addEventListener("pointercancel", finish);
    }    //
    createSkillEditor() {
        let node = this.mainArea.querySelector("skill-editor");
        if (!node) {
            node = document.createElement("skill-editor");
            this.mainArea.appendChild(node);
        }
        return node;
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
    loadSideBarCharacter() {
        const sideBarCharacter = this.sideBarCharacter;
        if (!sideBarCharacter) return 0;
        const records = this.serveFor.data.getConfig("x19D6_editor.characters");
        const ids = records && typeof records === "object" ? Object.keys(records) : [];
        const emptyCard = sideBarCharacter.querySelector(".xy-ED-nocharacterCard");
        const showBox = sideBarCharacter.querySelector(".xy-ED-characte-show");
        const header = showBox.querySelector("header");
        const ul = showBox.querySelector("ul");
        ul.innerHTML = "";
        ids.forEach(id => {
            const data = records[id] || {};
            const li = document.createElement("li");
            li.dataset.characterId = id;
            li.innerHTML = `<b>${data.name || id}</b><span>${id}</span>`;
            if (data.savedAt) li.title = `最后保存：${new Date(data.savedAt).toLocaleString()}`;
            ul.appendChild(li);
        });
        header.innerHTML = ids.length ? `已保存 ${ids.length} 位武将（点击继续编辑）` : "";
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
        //每次点开「武将」页都刷新一次列表，保证刚保存的草稿立刻可见
        this.navCharacter.addEventListener("pointerup", () => this.loadSideBarCharacter());
        sideBarCharacter.querySelector("ul").addEventListener("pointerup", e => {
            const item = e.target.closest("li[data-character-id]");
            if (!item) return;
            //已在编辑中的同一份草稿不重复打开
            const opened = this.mainArea.querySelector(`character-editor[character-id="${item.dataset.characterId}"]`);
            if (opened) return;
            this.createCharacterEditor(item.dataset.characterId);
        });
        this.loadSideBarCharacter();
    }
    //
    /**
     * @typedef {{
     *      noLike:boolean,
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
        const { noLike, noDelete, highlight, useFor } = config;
        skillCard.setAttribute("skill-id", searchResult.id);
        skillCard.skillInfo = searchResult;
        if (!noLike) skillCard.setAttribute("likable", true);
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
        const { noLike, noDelete, highlight, useFor } = config;
        characterCard.setAttribute("character-id", searchResult.id);
        characterCard.characterInfo = searchResult;
        if (!noLike) characterCard.setAttribute("likable", true);
        if (!noDelete) characterCard.setAttribute("removable", true);
        characterCard.setAttribute("skill-likable", true);
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
        this.navSkill.addEventListener("pointerup", () => this.createSkillEditor());
    }
    listenSideBarSearch() {
        const { sideBarSearch } = this;
        const input = sideBarSearch.querySelector("input");
        const clearIcon = sideBarSearch.querySelector(".xy-ED-input-clear");
        const searchIcon = sideBarSearch.querySelector(".xy-ED-input-search");
        const searchModeControllerButtons = sideBarSearch.querySelectorAll("[data-search-mode]");
        const searchConcerning = sideBarSearch.querySelector(".xy-ED-search-concerning");
        const searchConcerningSections = Array.from(searchConcerning.querySelectorAll(":scope>div>section"));
        const [resultSection, likedSection] = searchConcerningSections;
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
        resultSection.addEventListener("like", e => {
            const node = e.detail?.from;
            if (node?.tagName === "SKILL-INFO-CARD") {
                const appendNode = node.cloneNode();
                appendNode.setAttribute("likable", false);
                appendNode.setAttribute("removable", true);
                likedSection.prepend(appendNode);
            } else if (node.tagName === "") {
            }
        });
        resultSection.addEventListener("likeCancel", e => {
            const node = e.detail?.from;
            if (node?.tagName === "SKILL-INFO-CARD") {
                likedSection.querySelector(`[skill-id="${node.getAttribute("skill-id")}"]`)?.remove();
            } else if (node.tagName === "") {

            }
        });
        likedSection.addEventListener("removeCard", e => {
            const node = e.detail?.from;
            if (node?.tagName === "SKILL-INFO-CARD") {
                resultSection.querySelector(`[skill-id="${node.getAttribute("skill-id")}"]`)?.triggerInteractEvent("like");
            }
        });
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
        const nav = this.nav;
        let draggingNode = null;
        let frame = null;
        let pointX = 0, pointY = 0;
        const applyReorder = () => {
            frame = null;
            if (!draggingNode) return;
            const hit = document.elementFromPoint(pointX, pointY);
            const sibling = hit && hit.closest ? hit.closest("[class^=xy-ED-nav]") : null;
            if (!sibling || sibling === draggingNode || sibling.parentNode !== nav) return;
            const list = Array.from(nav.children);
            const from = list.indexOf(draggingNode);
            const to = list.indexOf(sibling);
            if (from < 0 || to < 0 || from === to) return;
            nav.insertBefore(draggingNode, from < to ? sibling.nextSibling : sibling);
        };
        this.navs.forEach(node => {
            // 关掉原生 HTML5 拖拽：dragover 有节流，改用指针事件 + rAF 更跟手
            node.draggable = false;
            node.addEventListener("pointerdown", e => {
                if (typeof e.button === "number" && e.button !== 0) return;
                draggingNode = node;
                pointX = e.clientX;
                pointY = e.clientY;
                node.setPointerCapture?.(e.pointerId);
                if (!frame) frame = requestAnimationFrame(applyReorder);
            });
            node.addEventListener("pointermove", e => {
                if (draggingNode !== node) return;
                pointX = e.clientX;
                pointY = e.clientY;
                if (!frame) frame = requestAnimationFrame(applyReorder);
            });
            const finish = e => {
                if (draggingNode !== node) return;
                draggingNode = null;
                if (frame) {
                    cancelAnimationFrame(frame);
                    frame = null;
                }
                try {
                    if (e && node.hasPointerCapture?.(e.pointerId)) node.releasePointerCapture(e.pointerId);
                } catch (err) { }
                this.saveShellState("navOrder", Array.from(this.navs).map(item => item.dataset.for));
            };
            node.addEventListener("pointerup", finish);
            node.addEventListener("pointercancel", finish);
        });
    }    listenNavChoose() {
        const navsArray = Array.from(this.navs).map(node => [node, new Map([
            [node, ["xy-ED-nav-chosen"]],
            [this.sideBarContent.querySelector(`[data-by=${node.dataset.for}]`), ["xy-ED-shown-flex"]]
        ])]);
        this.navsController = new UniqueChoiceManager(...this.navs)
            .listenSiblings("pointerup")
            .forClassByNodeClassMap(new WeakMap(navsArray))
            .setCallback((last, now) => {
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