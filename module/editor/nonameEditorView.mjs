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
        const ids = records && typeof records === "object" ? Object.keys(records) : [];
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
            if (this.mainArea.querySelector(`character-editor[character-id="${id}"]`)) return;
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
        //已收藏过的条目，重新搜索时 ❤️ 也要是点亮状态（去重的前提）
        if (!noLike) this.syncCardLikedState(skillCard);
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
        //已收藏过的条目，重新搜索时 ❤️ 也要是点亮状态（去重的前提）
        if (!noLike) this.syncCardLikedState(characterCard);
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
    /**
     * 收藏夹数据：技能 / 武将的卡片快照，持久化在 x19D6_editor.likes
     * @returns {{skills: object[], characters: object[]}}
     */
    readLikes() {
        const likes = this.serveFor.data.getConfig("x19D6_editor.likes") || {};
        return {
            skills: Array.isArray(likes.skills) ? likes.skills : [],
            characters: Array.isArray(likes.characters) ? likes.characters : []
        };
    }
    /**
     * @param {{skills: object[], characters: object[]}} likes
     */
    saveLikes(likes) {
        return this.serveFor.data.writeConfig("x19D6_editor.likes", likes);
    }
    /**
     * 重建一张收藏卡片。必须走工厂方法：卡片数据在访问器字段上（skillInfo / characterInfo），
     * cloneNode 的浅拷贝拿不到，只会渲染成空白条。
     * @param {"skills"|"characters"} kind
     * @param {object} info
     * @returns {HTMLElement}
     */
    createLikedCard(kind, info) {
        const card = kind === "skills"
            ? this.createSearchSkillListItem(info, { noLike: true, highlight: [] })
            : this.createSearchCharacterListItem(info, { noLike: true, highlight: [] });
        //收藏行没有 usefor 目标节点：⬅️ 的「可用」外观要外部标记，点击走 useCardData 由收藏列表自己处理
        card.markUsable(true);
        //武将收藏卡自己不带 ❤️，但内嵌的技能卡带：一并同步（markLiked 找不到 ❤️ 时安全返回 false）
        this.syncCardLikedState(card);
        return card;
    }
    /**
     * 把「已收藏」状态同步到卡片（武将卡连带内嵌技能卡）
     * @param {HTMLElement} card
     * @param {{skills: object[], characters: object[]}} [likes]
     * @returns {HTMLElement}
     */
    syncCardLikedState(card, likes = this.readLikes()) {
        card.syncLikedState?.((kind, id) => Boolean(id) && likes[kind].some(item => item?.id === id));
        return card;
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
        // ---------- 收藏夹（技能 / 武将）：启动还原 + 去重 + 落盘 ----------
        //数据源 x19D6_editor.likes = { skills: 技能快照[], characters: 武将快照[] }，数组顺序即展示顺序（最新在前）。
        //卡片数据存在访问器字段里（技能 skillInfo / 武将 characterInfo），所以收藏卡片一律用工厂方法重建，不能 cloneNode。
        const likes = this.readLikes();
        likes.skills = likes.skills.filter(item => item && item.id);
        likes.characters = likes.characters.filter(item => item && item.id);
        likes.skills.forEach(info => likedSection.append(this.createLikedCard("skills", info)));
        likes.characters.forEach(info => likedSection.append(this.createLikedCard("characters", info)));
        const kindOf = node => node?.tagName === "SKILL-INFO-CARD" ? "skills"
            : node?.tagName === "CHARACTER-INFO-CARD" ? "characters" : null;
        const idAttrOf = kind => kind === "skills" ? "skill-id" : "character-id";
        const infoOf = (node, kind) => kind === "skills" ? node.skillInfo : node.characterInfo;
        const findLikedCard = (kind, id) => Array.from(likedSection.children)
            .find(node => node.getAttribute(idAttrOf(kind)) === id);
        /** 收藏：已在收藏里就只把 ❤️ 点亮，不再加一张（去重） */
        const addLiked = node => {
            const kind = kindOf(node);
            const info = kind && infoOf(node, kind);
            if (!info?.id) return;
            node.markLiked?.(true);
            if (findLikedCard(kind, info.id)) return;
            likedSection.prepend(this.createLikedCard(kind, info));
            likes[kind].unshift(info);
            this.saveLikes(likes);
        };
        /** 取消收藏：删卡片 + 删配置 + 把搜索结果里同一条的 ❤️ 熄掉 */
        const dropLiked = (kind, id) => {
            if (!kind || !id) return;
            findLikedCard(kind, id)?.remove();
            const index = likes[kind].findIndex(item => item?.id === id);
            if (index >= 0) {
                likes[kind].splice(index, 1);
                this.saveLikes(likes);
            }
            Array.from(resultSection.children)
                .find(node => node.getAttribute(idAttrOf(kind)) === id)
                ?.markLiked?.(false);
        };
        const dropLikedFromNode = node => {
            const kind = kindOf(node);
            if (kind) dropLiked(kind, node.getAttribute(idAttrOf(kind)));
        };
        /** ⬅️：技能→往当前武将编辑器里放一份副本（收藏条目不消耗）；武将→打开该武将草稿 */
        const useCard = node => {
            const characterId = node?.getAttribute?.("character-id");
            if (characterId) {
                if (!this.mainArea.querySelector(`character-editor[character-id="${CSS.escape(characterId)}"]`)) {
                    this.createCharacterEditor(characterId);
                }
                return;
            }
            const skillId = node?.getAttribute?.("skill-id");
            if (!skillId) return;
            //带 usefor 的结果卡片由组件自己的 requestUseSkill 处理（那条路径是「把卡片移进技能栏」）；
            //但目标编辑器已关闭时，那条路径只会把卡片挪进一个看不见的编辑器（卡片凭空消失），这时由这里接管
            if (node.hasAttribute("usefor") && node.useForNode?.isConnected) return;
            //技能可能已被删除（上个版本收藏下来的）
            if (!this.serveFor.data.checkSkillTags(skillId, [])) return;
            const editor = this.mainArea.querySelector("character-editor") || this.createCharacterEditor();
            editor.addSkill(skillId);
        };
        //结果列表与收藏列表共用一套交互：武将卡内嵌的技能卡事件会冒泡到收藏列表，所以两边都要监听
        [resultSection, likedSection].forEach(section => {
            section.addEventListener("like", e => addLiked(e.detail?.from));
            section.addEventListener("likeCancel", e => dropLikedFromNode(e.detail?.from));
            section.addEventListener("useCardData", e => useCard(e.detail?.from));
        });
        //🗑️ 只在收藏列表里表示「取消收藏」（结果列表的 🗑️ 只是把该条从结果里移除）
        likedSection.addEventListener("removeCard", e => dropLikedFromNode(e.detail?.from));
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