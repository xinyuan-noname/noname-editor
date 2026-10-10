import { preventEnter, toggleMultiClass } from "./encapsulated.mjs";
import { HTMLNonameFocusUIElement } from "./component-base.mjs";
import "./component-infoCard.mjs";
import "./component-dialog.mjs";
import { openCharacterCardPreview } from "./characterCard.mjs";
export class HTMLNonameCharacterEditorElement extends HTMLNonameFocusUIElement {
    /**
     * 草稿自动保存的防抖定时器
     */
    #saveTimer = null;
    /**
     * 「正在回填草稿数据」标记：`applyData` 期间不排自动保存。
     * ⚠️ 少了它就会**真丢数据**：载入时只要有一个字段没被回填（技能就踩过这个坑），
     * `changeData` 结尾的 400ms 防抖保存就会按**空**的交互层重建整条记录，把草稿里的字段永久抹掉。
     */
    #applyingData = false;
    /**
     * 立绘的权威引用（`ext:<工作区相对路径>`）。
     * ⚠️ 不能只看 DOM：`getAllData()` 原来是从 `data-avatar` 反推 `trashBin`，只要有一次
     * 「DOM 里没有立绘」的保存（同一份草稿开了两个编辑器实例、裁剪后只剩 `blob:` URL…），
     * 记录里的引用就被抹成空数组——文件还在磁盘上，重新打开却再也显示不出来（用户实测）。
     */
    avatarReference = "";
    /** 载入草稿时读到的立绘引用：保存时兜底，避免把记录里已有的引用写没 */
    storedAvatarReference = "";
    /** 只有用户显式「重置」立绘，才允许把记录里的引用一并清掉 */
    avatarCleared = false;
    /** 载入草稿时记录里原有的 `trashBin`（保存时把非立绘标记原样写回） */
    loadedTrashBin = [];
    characterAttributes = [
        "extension", "packageId", "characterSort", "characterSortName",
        "avatar",
        "dieAudios", "dieAudioText",
        "name", "pinyin",
        "id",
        "sex",
        "group", "doubleGroup",
        "clans",
        "hp", "maxHp", "hujia",
        "skills",
        "perfectPair",
        "isZhugong",
        "title",
        "hasHiddenSkill",
        "isAiForbidden",
        "isBoss",
        "isChessBoss",
        "isUnseen",
        "isJiangeBoss", "isJiangeMech",
        "isFellowInStoneMode", "isSpecialInStoneMode", "isHiddenInStoneMode",
        "intro"
    ];
    constructor() {
        super();
        const shadow = this.attachShadow({ mode: "open" });
        //$: shadow , html/character-editor.html//
shadow.innerHTML=`
<section class="main">
    <div class="content">
        <div class="left">
            <div class="data-setting" data-extension="" data-package-id="" data-character-sort="" data-character-sort-name="">
                <section class="flex--between">
                    <span>所属分包</span>
                </section>
                <section class="sort-view flex-center small-font">
                    <span title="扩展包" class="extension-name link-arrow pointer"></span>
                    <span title="武将包" class="package-id link-arrow pointer"></span>
                    <span title="分包" class="character-sort pointer"></span>
                </section>
            </div>
            <div class="data-setting flex-column" data-avatar="">
                <section>
                    <div>武将原画</div>
                    <div class="height-set" data-height-set="high">高</div>
                    <div class="height-set" data-height-set="mid">中</div>
                    <div class="height-set" data-height-set="short">矮</div>
                </section>
                <div class="avatar-view">
                    <div class="img-container">
                        <img draggable="false">
                        <section class="cutter">
                            <div class="cutter-view"></div>
                            <span class="control-point lt"></span>
                            <span class="control-point lb"></span>
                            <span class="control-point rt"></span>
                            <span class="control-point rb"></span>
                        </section>
                        <section class="curtain"></section>
                    </div>
                    <div class="img-loading"></div>
                </div>
                <div class="tool-bar">
                    <span class="reset" title="重置">⟲</span>
                    <span class="cut" title="裁剪">✂</span>
                </div>
            </div>
            <div class="data-setting flex-column" data-die-audios="" data-die-audio-text="">
                <header>
                    <div>阵亡语音</div>
                    <div class="add text-shadow-free pointer">添加</div>
                </header>
                <section data-by="dieAudios"></section>
            </div>
        </div>
        <div class="right">
            <div class="data-setting" data-name="" data-pinyin="">
                <span>
                    <span>姓名</span>
                    <span class="expandable-expanded" data-for="name"></span>
                    <span></span>
                </span>
                <ruby data-by="name">
                    <div contenteditable="true" spellcheck="false"></div>
                    <rp>(</rp>
                    <rt contenteditable="true" spellcheck="false"></rt>
                    <rp>)</rp>
                </ruby>
            </div>
            <div class="data-setting" data-id="">
                <span>
                    <span>武将标识符(id)</span>
                    <span class="expandable-expanded" data-for="id"></span>
                    <span></span>
                </span>
                <ruby data-by="id">
                    <div contenteditable="true" spellcheck="false"></div>
                    <button>使用拼音</button>
                </ruby>
            </div>
            <div class="data-setting" data-sex="">
                <span>
                    <span>性别</span>
                    <span class="expandable-expanded" data-for="sex"></span>
                    <span></span>
                </span>
                <ul data-by="sex">
                    <li data-sex-option="male" style="--url:url(/image/card/sex_male.png);">男性</li>
                    <li data-sex-option="female" style="--url:url(/image/card/sex_female.png)">女性</li>
                    <li data-sex-option="double" style="--url:url(/image/card/sex_double.png)">双性</li>
                    <li data-sex-option="none" style="--url:url(/image/card/sex_none.png)">无性</li>
                    <li data-sex-option="male-castrated" style="--url:url(/image/card/sex_male_castrated.png)">太监</li>
                </ul>
            </div>
            <div class="data-setting" data-group="" data-double-group="">
                <span>
                    <span>势力</span>
                    <span class="expandable-expanded" data-for="group"></span>
                    <span></span>
                </span>
                <section data-by="group" class="flex-column">
                    <span class="checkbox" data-group-double value="double">选择多势力</span>
                    <ul>
                        <li data-group-option="wei"
                            style="--url:url(/image/card/group_wei.png);--group-text-shadow:rgb(78 117 140) 0 0 2px, rgb(78 117 140) 0 0 2px, rgb(78 117 140) 0 0 2px, rgb(78 117 140) 0 0 2px, black 0 0 1px">
                            魏</li>
                        <li data-group-option="shu"
                            style="--url:url(/image/card/group_shu.png);--group-text-shadow:rgb(128 59 2) 0 0 2px, rgb(128 59 2) 0 0 2px, rgb(128 59 2) 0 0 2px, rgb(128 59 2) 0 0 2px, black 0 0 1px">
                            蜀</li>
                        <li data-group-option="wu"
                            style="--url:url(/image/card/group_wu.png);--group-text-shadow:rgb(57 123 4) 0 0 2px, rgb(57 123 4) 0 0 2px, rgb(57 123 4) 0 0 2px, rgb(57 123 4) 0 0 2px, black 0 0 1px">
                            吴</li>
                        <li data-group-option="qun"
                            style="--url:url(/image/card/group_qun.png);--group-text-shadow:rgb(164 164 164) 0 0 2px, rgb(164 164 164) 0 0 2px, rgb(164 164 164) 0 0 2px, rgb(164 164 164) 0 0 2px, black 0 0 1px">
                            群</li>
                        <li data-group-option="jin"
                            style="--url:url(/image/card/group_jin.png);--group-text-shadow:rgb(100 74 139) 0 0 2px, rgb(100 74 139) 0 0 2px, rgb(100 74 139) 0 0 2px, rgb(100 74 139) 0 0 2px, black 0 0 1px">
                            晋</li>
                        <li data-group-option="shen"
                            style="--url:url(/image/card/group_shen.png);--group-text-shadow:rgb(243 171 27) 0 0 2px, rgb(243 171 27) 0 0 2px, rgb(243 171 27) 0 0 2px, rgb(243 171 27) 0 0 2px, black 0 0 1px">
                            神</li>
                    </ul>
                    <span>
                        <span class="expandable-collapsed" data-for="more-group">更多势力</span>
                    </span>
                    <ul class="hidden" data-by="more-group">
                        <li data-group-option="western"
                            style="--url:url(/image/card/group_western.png);--group-text-shadow:rgb(100 74 139) 0 0 2px, rgb(100 74 139) 0 0 2px, rgb(100 74 139) 0 0 2px, rgb(100 74 139) 0 0 2px, black 0 0 1px">
                            西</li>
                        <li data-group-option="key"
                            style="--url:url(/image/card/group_key.png);--group-text-shadow:rgb(203 177 255) 0 0 2px, rgb(203 177 255) 0 0 2px, rgb(203 177 255) 0 0 2px, rgb(203 177 255) 0 0 2px, black 0 0 1px">
                            键</li>
                        <li data-diy>新增</li>
                    </ul>
                </section>
            </div>
            <div class="data-setting" data-clans="">
                <span>
                    <span>宗族</span>
                    <span class="expandable-collapsed" data-for="clans"></span>
                    <span></span>
                </span>
                <section data-by="clans" class="hidden flex-column">
                    <ul>
                        <li data-clan-option="陈留吴氏" style="--url:url(../image/clan/陈留吴氏.png)">陈留吴氏</li>
                        <li data-clan-option="颍川荀氏" style="--url:url(../image/clan/颍川荀氏.png)">颍川荀氏</li>
                        <li data-clan-option="颍川韩氏" style="--url:url(../image/clan/颍川韩氏.png)">颍川韩氏</li>
                        <li data-clan-option="太原王氏" style="--url:url(../image/clan/太原王氏.png)">太原王氏</li>
                        <li data-clan-option="颍川钟氏" style="--url:url(../image/clan/颍川钟氏.png)">颍川钟氏</li>
                    </ul>
                    <span>
                        <span class="expandable-collapsed" data-for="more-clans">更多宗族</span>
                    </span>
                    <ul class="hidden" data-by="more-clans">
                        <li data-diy>添加宗族</li>
                    </ul>
                </section>
            </div>
            <div class="data-setting" data-hp="4" data-max-hp="4" data-hujia="0">
                <span>
                    <span>体力&护甲</span>
                    <span class="expandable-expanded" data-for="hp"></span>
                    <span></span>
                </span>
                <div data-by="hp">
                    <div class="hp-operation">
                        <div>
                            <span>体力</span>
                            <span contenteditable="true">4</span>
                            <span>/</span>
                            <span contenteditable="true">4</span>
                        </div>
                        <div class="hp-more-show hidden">
                            <div class="flex-column text-shadow-free">
                                <span data-hp-adjust-mode="hp" class="pointer">体力值</span>
                                <span data-hp-adjust-mode="maxHp" class="pointer">体力上限</span>
                            </div>
                        </div>
                        <div class="hp-show">
                            <div class="hpContainer healthy">
                                <div class="hp lost"></div>
                                <div class="hp lost"></div>
                                <div class="hp lost"></div>
                                <div class="hp lost"></div>
                            </div>
                        </div>
                        <div class="hp-adjust">
                            <div>
                                <div class="hp-plus">+</div>
                                <hr>
                                <div class="hp-minus">-</div>
                            </div>
                            <span contenteditable="true">1</span>
                        </div>
                    </div>
                    <div class="hujia-operation">
                        <div>
                            <span>护甲</span>
                            <span contenteditable="true">0</span>
                        </div>
                        <div class="hujiaContainer">
                            <div class="hujia lost"></div>
                            <div class="hujia lost"></div>
                            <div class="hujia lost"></div>
                            <div class="hujia lost"></div>
                            <div class="hujia lost"></div>
                            <div class="hujia reset"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="data-setting" data-skills="" id="noname-skill-editor-skills-setting">
                <span>
                    <span>技能</span>
                    <span class="expandable-expanded" data-for="skills"></span>
                    <span></span>
                </span>
                <div data-by="skills" class="flex-column">
                    <ruby class="flex-center">
                        <div contenteditable="true" spellcheck="false"></div>
                        <span class="search"></span>
                    </ruby>
                    <p class="note">搜索技能，将侧边栏技能拖入该区域，或选择技能卡片中的⬅️以添加技能</p>
                    <section>
                        <header>
                            <span>技能列表：</span>
                            <span class="expandable-expanded" data-for="skill-list"></span>
                        </header>
                        <ul data-by="skill-list"></ul>
                    </section>
                </div>
            </div>
            <div class="data-setting" data-more>
                <span>
                    <span>杂项</span>
                    <span class="expandable-collapsed" data-for="more"></span>
                    <span></span>
                </span>
                <section data-by="more" class="hidden flex-column">
                    <ul>
                        <li class="checkbox" data-more-option="isZhugong">
                            <p>常备主公</p>
                            <span></span>
                        </li>
                        <li class="checkbox" data-more-option="hasHiddenSkill">
                            <p>登场隐匿</p>
                            <span></span>
                        </li>
                        <li class="checkbox" data-more-option="isAiForbidden">
                            <p>人机禁用</p>
                            <span></span>
                        </li>
                        <li class="checkbox" data-more-option="isBoss" title="挑战模式下BOSS">
                            <p>设为BOSS</p>
                            <span></span>
                        </li>
                    </ul>
                    <span>
                        <span class="expandable-collapsed" data-for="more-more">更多选项</span>
                    </span>
                    <ul data-by="more-more" class="hidden">
                        <li class="checkbox" data-more-option="isUnseen" title="该武将在武将包中不可见">
                            <p>隐藏武将</p>
                            <span></span>
                        </li>
                        <li class="checkbox" data-more-option="isChessBoss" title="战旗模式下的BOSS">
                            <p>战旗BOSS</p>
                            <span></span>
                        </li>
                        <li class="checkbox" data-more-option="isJiangeBoss" title="剑阁模式下的BOSS">
                            <p>剑阁BOSS</p>
                            <span></span>
                        </li>
                        <li class="checkbox" data-more-option="isJiangeMech" title="剑阁模式下的机械">
                            <p>剑阁机械</p>
                            <span></span>
                        </li>
                        <li class="checkbox" data-more-option="isFellowInStoneMode" tilte="炉石模式下的随从">
                            <p>炉石随从</p>
                            <span></span>
                        </li>
                        <li class="checkbox" data-more-option="isSpecialInStoneMode" tilte="炉石模式下的特殊随从（可以使用装备和法术）">
                            <p>炉石特殊随从</p>
                            <span></span>
                        </li>
                        <li class="checkbox" data-more-option="isHiddenInStoneMode" tilte="炉石模式下的隐藏武将">
                            <p>炉石隐藏武将</p>
                            <span></span>
                        </li>
                    </ul>
                </section>
            </div>
            <div class="data-setting" data-intro>
                <span>
                    <span>武将介绍</span>
                    <span class="expandable-collapsed" data-for="intro"></span>
                    <span></span>
                </span>
                <section data-by="intro" class="hidden">
                    <p class="use-default text-shadow-free flex-column" data-default-intro="暂无武将介绍"></p>
                    <footer class="tool-bar">
                        <button class="edit">编辑</button>
                        <button class="edit-default">基于默认介绍编辑</button>
                    </footer>
                </section>
            </div>
            <div class="data-setting" data-title>
                <span>
                    <span>武将称号</span>
                    <span class="expandable-collapsed" data-for="data-title"></span>
                    <span></span>
                </span>
                <section data-by="data-title" class="hidden">
                    <div class="title-input" contenteditable="true" spellcheck="false"></div>
                </section>
            </div>
            <div class="data-setting" data-perfect-pair="" id="noname-skill-editor-perfect-pair-setting">
                <span>
                    <span>珠联璧合</span>
                    <span class="expandable-collapsed" data-for="data-perfect-pair"></span>
                    <span></span>
                </span>
                <section data-by="data-perfect-pair" class="hidden">
                    <ruby class="flex-center">
                        <div class="flex-center-center" contenteditable="true" spellcheck="false"></div>
                        <span class="search"></span>
                    </ruby>
                    <p class="note">搜索武将，将侧边栏武将拖入该区域，或选择武将卡片中的⬅️以添加武将</p>
                    <section>
                        <ul data-by="character-list"></ul>
                    </section>
                </section>
            </div>
        </div>
    </div>
    <div class="code">
    </div>
</section>
<section class="menu">
    <div class="menu-icon">🔧</div>
    <div class="gen-code">生成代码</div>
    <div class="return-setting">返回设置</div>
    <div class="gen-card" title="一键转化为武将卡">生成卡牌</div>
</section>`
//#: shadow , html/character-editor.html//
        this.storeFragment("code", "<section class='code-section'><div class='title'><span class='copy'>复制</span></div><pre><code></code></pre></section>");
    }
    connectedCallback() {
        this.loadCss("character-editor", { root: this.shadowRoot });
        this.#listenMenu();
        //
        this.#listenExtension();
        this.#listenAvatar();
        this.#listenDieAudios();
        this.#listenName();
        this.#listenId();
        this.#listenSex();
        this.#listenGroup();
        this.#listenClans();
        this.#listenHp();
        this.#listenSkills();
        this.#listenPerfectPair();
        this.#listenMore();
        this.#listenIntro();
        this.#listenTitle();
        //
        this.#listenExpanable();
        //扩展跟随设置页的当前工作区
        this.syncWorkspace();
        //按草稿编号载入（新建的编辑器没有 draft-key，不载入）
        if (this.draftKey) this.loadDraft(this.draftKey);
    }
    disconnectedCallback() {
        this.flushDraft();
        this.clearURLRecords();
    }
    //open系列语句 用于弹出对话框交互
    openAlertDialog(message, headline) {
        const dialog = document.createElement("noname-dialog");
        dialog.setAttribute("type", "alert");
        if (message) dialog.setAttribute("message", message);
        if (headline) dialog.setAttribute("headline", headline);
        this.shadowRoot.appendChild(dialog);
        return {
            dialog: dialog,
            processing: dialog.wait()
        }
    }
    openConfirmDialog(message, headline) {
        const dialog = document.createElement("noname-dialog");
        dialog.setAttribute("type", "confirm");
        if (message) dialog.setAttribute("message", message);
        if (headline) dialog.setAttribute("headline", headline);
        this.shadowRoot.appendChild(dialog);
        return {
            dialog: dialog,
            processing: dialog.wait()
        }
    }
    openCharacterIdDialog() {
        const dialog = document.createElement("noname-dialog");
        dialog.setAttribute("type", "id-character");
        this.shadowRoot.append(dialog);
        return {
            dialog: dialog,
            processing: dialog.wait()
        }
    }
    openPackageSelectDialog(extensionName) {
        const moduleConfig = this.configQuery("get", {
            member: `x19D6_editor.extensionModuleConfig.${extensionName}.packageInfo`,
        })
        const options = {};
        if (moduleConfig) {
            moduleConfig.extension.forEach(extension => {
                options[extension.packageId] = extension.packageId;
            })
            moduleConfig.character.forEach(character => {
                const translation = this.textQuery("characterPackageTranslation", { text: character.packageId });
                if (options[translation]) delete options[translation];
                options[character.packageId] = translation;
            })
        }
        //编辑器里新建的包（x19D6_editor.workspaceMeta）也要能选
        const meta = this.configQuery("get", { member: `x19D6_editor.workspaceMeta.${this.workspace}` });
        if (meta && meta.packages) {
            Object.entries(meta.packages).forEach(([packageId, packageName]) => (options[packageId] = packageName));
        }
        const dialog = document.createElement("noname-dialog");
        dialog.type = "select";
        dialog.options = options;
        dialog.headline = "请选择一个武将包"
        dialog.message = "武将包";
        this.shadowRoot.append(dialog);
        return {
            dialog,
            processing: dialog.wait().then(result => {
                if (result) {
                    if (result !== this.getData(result)) {
                        this.changeData("packageId", result);
                        this.style.setProperty("--data-package-id", `"${this.textQuery("characterPackageTranslation", { text: result })}"`);
                        this.changeData("characterSort", "");
                        this.changeData("characterSortName", "");
                        this.style.removeProperty("--data-character-sort");
                    }
                }
                return result;
            })
        }
    }
    openCharacterSortDialog(packageId) {
        let options = {};
        if (packageId) {
            options = this.infoQuery("characterSortList", { packageId });
            this.forEachTempStore("characterSort", store => {
                if (packageId === store.source && store.en) options[store.en] = store.cn;
            })
        }
        const dialog = document.createElement("noname-dialog");
        dialog.type = "select-append";
        dialog.options = options;
        dialog.labelContent = {
            select: "所选分包",
            "id-input": "分包英文名(id)",
            "name-input": "分包中文名"
        }
        dialog.headline = "请选择一个分包";
        dialog.appendCheck = (id, name) => {
            if (!id || !name) return false;
            let storeHaven;
            this.forEachTempStore("characterSort", store => {
                if (store.en === id) {
                    storeHaven = true;
                    return false;
                }
            })
            if (storeHaven) return false;
            return this.checkQuery("characterSortId", { packageId, id });
        }
        dialog.appendCallback = (id, name) => {
            this.appendTempStore("characterSort", {
                en: id,
                cn: name,
                source: packageId
            })
        }
        this.shadowRoot.append(dialog);
        return {
            dialog,
            processing: dialog.wait().then(result => {
                if (result) {
                    let translation;
                    this.forEachTempStore("characterSort", store => {
                        if (packageId === store.source && store.en === result) translation = store.cn;
                    })
                    if (!translation) translation = this.textQuery("getTranslation", { text: result })
                    this.changeData("characterSort", result);
                    this.changeData("characterSortName", translation);
                    this.style.setProperty("--data-character-sort", `"${translation}"`);
                }
                return result;
            })
        }
    }
    //
    async downloadExtensionAsset() {
        const avatar = this.getData("avatar");
        const dieAudios = this.getData("dieAudios");
        const id = this.getData("id");
        //资源目录挂在工作区（= 扩展）上，不再从武将的 extension 字段取
        const extensionName = this.workspace || this.getData("extension");
        const config = this.configQuery("get", {
            member: `x19D6_editor.extensionFileConfig.${extensionName}`
        });
        const promises = [];
        if (dieAudios.length) {
            const path = `/extension/${config["extension-die-audio"]}`
            promises.push(this.fileQuery("download", { url: dieAudios[0], path, name: id }).then(url => {
                this.reloadDieAudios(url)
            }));
        }
        if (avatar) {
            const path = `/extension/${config["extension-character-image"]}`;
            promises.push(this.fileQuery("download", { url: avatar, path, name: id }).then((url) => {
                this.reloadAvatar(url, true);
            }));
        }
        return Promise.all(promises);
    }
    async modifyFiles(modificationInfo) {
        for (const path in modificationInfo) {
            const { content } = modificationInfo[path];
            await this.fileQuery("writeTextFile", { path, content });
        }
    }
    async writeModuleConfig(extensionName) {
        const module = await this.codeQuery("getExtensionAllPackage", [extensionName]);
        this.configQuery("write", {
            member: `x19D6_editor.extensionModuleConfig.${extensionName}`,
            value: module
        });
    }
    updateCodePreviewArea(codeList) {
        const codeArea = this.shadowRoot.querySelector(".code");
        codeArea.replaceChildren();
        for (const codeInfo of codeList) {
            const { codeString, title } = codeInfo;
            const fragment = this.getStoredFragment("code");
            const copy = fragment.querySelector(".copy");
            const code = fragment.querySelector("code");
            codeArea.append(fragment);
            code.textContent = codeString;
            this.highlightCode(code);
            copy.addEventListener("pointerup", () => {
                navigator.clipboard.writeText(codeString).then(() => {
                    copy.classList.add("copied-ok");
                    setTimeout(() => { copy.classList.remove("copied-ok") }, 1000)
                }).catch(() => {
                    copy.classList.add("copied-error");
                    setTimeout(() => { copy.classList.remove("copied-error") }, 1000)
                });
            })
        }
    }
    #listenMenu() {
        const main = this.shadowRoot.querySelector(".main");
        const menu = this.shadowRoot.querySelector(".menu");
        //
        const genCodeButton = menu.querySelector(".gen-code");
        //一键转化为武将卡：把当前草稿画成一张武将牌（绘制与浮层都在 characterCard.mjs）
        const genCardButton = menu.querySelector(".gen-card");
        genCardButton.addEventListener("pointerup", () => openCharacterCardPreview(this));
        const returnSettingButton = menu.querySelector(".return-setting");
        genCodeButton.addEventListener("pointerup", async () => {
            if (!this.getData("id")) {
                const { dialog, processing } = this.openCharacterIdDialog();
                dialog.setAttribute("headline", "暂未设置武将id，请设置之！")
                const result = await processing;
                if (result === false) return;
                await this.loadId(result);
            }
            main.classList.add("turn-over");
            this.updateCodePreviewArea(await this.genCode());
        });
        returnSettingButton.addEventListener("pointerup", () => {
            main.classList.remove("turn-over");
        })
    }
    /**
     * 工作区 = 扩展：扩展不在武将上单独设置，显示与归属都跟随设置页的当前工作区
     * @returns {string}
     */
    get workspace() {
        return this.configQuery("get", { member: "x19D6_editor.settings.workspace" }) || "";
    }
    /**
     * 把「扩展」同步成当前工作区（显示 + 内部数据）
     * @param {string} [workspace]
     * @returns {string}
     */
    syncWorkspace(workspace = this.workspace) {
        this.changeData("extension", workspace);
        this.style.setProperty("--data-extension-name", workspace ? `"${workspace}"` : "");
        return workspace;
    }
    #listenExtension() {
        const extensionDataArea = this.getDataAreaDom("extension");
        const extensionNameBtn = extensionDataArea.querySelector(".extension-name");
        const packageIdBtn = extensionDataArea.querySelector(".package-id");
        const characterSortBtn = extensionDataArea.querySelector(".character-sort");
        //扩展不再是武将字段（由设置页的工作区决定），这里只显示
        const requireWorkspace = () => {
            if (this.workspace) return true;
            alert("尚未选择工作区：请到左侧「设置 → 工作区」选择或新建一个扩展。");
            return false;
        };
        const setPackageName = async () => {
            if (!requireWorkspace()) return false;
            const extensionName = this.workspace;
            if (!this.configQuery("get", { member: `x19D6_editor.extensionModuleConfig.${extensionName}` })) {
                await this.writeModuleConfig(extensionName);
            }
            const { processing } = this.openPackageSelectDialog(extensionName);
            return await processing;
        };
        const setCharacterSort = async () => {
            if (!this.getData("packageId")) {
                if (await setPackageName() === false) return;
            }
            const packageId = this.getData("packageId")
            this.openCharacterSortDialog(packageId);
        }
        extensionNameBtn.addEventListener("pointerup", () => {
            alert(this.workspace
                ? `当前工作区：${this.workspace}\n扩展由设置页的工作区决定，不再按武将单独设置。`
                : "尚未选择工作区：请到左侧「设置 → 工作区」选择或新建一个扩展。");
        });
        packageIdBtn.addEventListener("pointerup", setPackageName);
        characterSortBtn.addEventListener("pointerup", setCharacterSort);
    }
    /**
     * 工作区里某个资源目录（`extensionFileConfig.<工作区>` 的键），没有配置时按约定兜底
     * @param {string} key
     * @returns {string} 形如 `奇迹之旅/audio/die`
     */
    assetDir(key) {
        const workspace = this.workspace;
        const defaults = {
            "extension-character-image": "image/character",
            "extension-card-image": "image/card",
            "extension-skill-audio": "audio/skill",
            "extension-die-audio": "audio/die"
        };
        const config = this.configQuery("get", { member: `x19D6_editor.extensionFileConfig.${workspace}` }) || {};
        return config[key] || `${workspace}/${defaults[key] || key}`;
    }
    /**
     * 把本地选中的媒体文件**落盘**进当前工作区扩展，返回草稿里要记的引用（`ext:<工作区相对路径>`）
     * @param {File} file
     * @param {string} key extensionFileConfig 的键
     * @param {string} [suffix] 同名多份时区分（阵亡语音按引擎约定是 `<武将id>1.mp3`）
     * @returns {Promise<string>} 失败返回 ""
     */
    async saveLocalAsset(file, key, suffix = "") {
        const workspace = this.workspace;
        if (!workspace) {
            alert("请先在设置页选择工作区。");
            return "";
        }
        const base = this.getData("id") || this.draftKey || "未命名";
        const ext = (file && file.name && file.name.split(".").pop()) || "mp3";
        const relative = `${this.assetDir(key)}/${base}${suffix}.${ext}`;
        try {
            await this.fileQuery("writeFile", { path: `extension/${relative}`, data: file });
        } catch (err) {
            console.warn("媒体落盘失败", relative, err);
            alert(`媒体落盘失败：${relative}\n${(err && err.message) || err}`);
            return "";
        }
        //同名不同后缀的旧文件要清掉：换格式（png→jpg）后会留下孤儿，
        //`findAvatarOnDisk()` 那种「按 id 找图」的兜底就可能挑到上一次的旧图
        await this.removeSiblingAssets(relative);
        return `ext:${relative}`;
    }
    /**
     * 删掉同目录下「主文件名相同、后缀不同」的旧素材（`<id>.png` 与 `<id>.jpg` 只能留一个）
     * @param {string} relative 工作区相对路径（含文件名）
     * @returns {Promise<number>} 删掉的个数
     */
    async removeSiblingAssets(relative) {
        const parts = String(relative || "").split("/");
        const name = parts.pop() || "";
        const dir = parts.join("/");
        const base = name.replace(/\.[^.]+$/, "");
        if (!dir || !base) return 0;
        try {
            const [, files] = await this.fileQuery("readFolder", { path: `extension/${dir}` });
            const targets = (Array.isArray(files) ? files : []).filter(item => item !== name && item.replace(/\.[^.]+$/, "") === base);
            for (const item of targets) await this.fileQuery("removeFile", { path: `extension/${dir}/${item}` });
            return targets.length;
        } catch (err) {
            console.warn("清理同名旧素材失败", relative, err);
            return 0;
        }
    }
    /**
     * 把 `ext:` / `/extension/` / `extension/` 形式的引用还原成工作区相对路径
     * @param {string} reference
     * @returns {string}
     */
    assetRelative(reference) {
        //显示地址会带 `?t=` 缓存串（见 displayAvatarUrl），这里是「引用 → 真路径」，先剥掉
        const text = this.stripUrlQuery(reference);
        if (!text || /^(blob|data|https?):/i.test(text)) return "";
        return text.startsWith("ext:") ? text.slice(4) : text.replace(/^\/?extension\//, "");
    }
    /**
     * 删除媒体文件（同生共死：条目删除 / 改名换姓 / 草稿删除都走它）
     * @param {string} reference
     * @returns {Promise<boolean>}
     */
    async removeAssetFile(reference) {
        const relative = this.assetRelative(reference);
        if (!relative) return false;
        return this.fileQuery("removeFile", { path: `extension/${relative}` });
    }
    /**
     * 武将 id 改名时，把名下已落盘的媒体文件改成新名字（写新 → 删旧 → 更新草稿引用）
     * @param {string} oldId
     * @param {string} newId
     */
    async renameAssets(oldId, newId) {
        if (!oldId || !newId || oldId === newId) return;
        const avatar = this.getData("avatar");
        if (avatar) {
            const relative = this.assetRelative(avatar);
            if (relative.includes(oldId)) {
                const renamed = await this.moveAssetFile(relative, oldId, newId);
                if (renamed) {
                    const reference = `ext:${renamed}`;
                    this.avatarReference = reference;
                    this.storedAvatarReference = reference;
                    const url = `/extension/${renamed}`;
                    const img = this.getDataAreaDom("avatar").querySelector(".avatar-view img");
                    if (img) img.src = url;
                    this.changeData("avatar", url);
                }
            }
        }
        const dieAudios = this.getData("dieAudios");
        if (!dieAudios.length) return;
        const references = [];
        let changed = false;
        for (const reference of dieAudios) {
            const relative = this.assetRelative(reference);
            if (!relative.includes(oldId)) {
                references.push(reference);
                continue;
            }
            const renamed = await this.moveAssetFile(relative, oldId, newId);
            references.push(renamed ? `ext:${renamed}` : reference);
            changed = changed || Boolean(renamed);
        }
        if (!changed) return;
        this.changeData("dieAudios", references.join(" "));
        const card = this.getDataAreaDom("dieAudios").querySelector("audio-info-card");
        if (card) card.setAttribute("src", references[references.length - 1]);
    }
    /**
     * 复制文件到新名字并删掉旧的
     * @param {string} relative
     * @param {string} oldId
     * @param {string} newId
     * @returns {Promise<string>} 新相对路径；失败返回 ""
     */
    async moveAssetFile(relative, oldId, newId) {
        const parts = relative.split("/");
        const renamedName = parts.pop().split(oldId).join(newId);
        const renamed = [...parts, renamedName].join("/");
        try {
            const data = await this.fileQuery("readBinaryFile", { path: `extension/${relative}` });
            await this.fileQuery("writeFile", { path: `extension/${renamed}`, data });
            await this.fileQuery("removeFile", { path: `extension/${relative}` });
            return renamed;
        } catch (err) {
            console.warn("媒体改名失败（旧文件保留）", relative, err);
            return "";
        }
    }
    reloadAvatar(url, exported) {
        const avatarDataArea = this.getDataAreaDom("avatar");
        const avatar = avatarDataArea.querySelector('.avatar-view');
        const img = avatarDataArea.querySelector(".avatar-view img");
        if (exported) this.removeLastestURLRecord("avatar");
        this.recordURL("avatar", url);
        //清掉上一次恢复时挂的 onerror 兜底：否则新图加载失败会被旧路径顶掉
        img.onerror = null;
        //同名文件换图后地址不变 → 显示地址补 `?t=`，否则浏览器吃缓存、画面还是旧图
        //进 CSS 变量前再兜一次「根绝对」（相对地址会被 --data-avatar 按样式表目录解析，见 rootUrl()）
        const displayUrl = this.displayAvatarUrl(this.rootUrl(url));
        img.src = displayUrl;
        avatar.classList.add("done");
        this.changeData("avatar", displayUrl);
        //引用同步：只有能归一成 ext: 的真实文件地址才更新引用；
        //裁剪中间态（blob:）不能覆盖引用，否则草稿里就只剩一个刷新即失效的临时 URL
        const reference = this.toExtReference(url);
        if (!reference) return;
        this.avatarReference = reference;
        this.storedAvatarReference = reference;
        this.avatarCleared = false;
    }
    #listenAvatar() {
        let imgType = "", minDelay = 0.01;
        const avatarDataArea = this.getDataAreaDom("avatar");
        const avatar = avatarDataArea.querySelector('.avatar-view');
        const imgContainer = avatarDataArea.querySelector(".avatar-view .img-container");
        const curtain = avatarDataArea.querySelector(".avatar-view .img-container .curtain");
        const img = avatarDataArea.querySelector(".avatar-view img");
        const cutter = avatarDataArea.querySelector(".cutter")
        const resetButton = avatarDataArea.querySelector(".reset");
        const cutButton = avatarDataArea.querySelector(".cut");
        const loadFile = async (file) => {
            this.clearURLRecords("avatar");
            //落盘：extension/<工作区>/image/character/<武将id>.<ext>
            const reference = await this.saveLocalAsset(file, "extension-character-image");
            if (!reference) return;
            //落盘成功 → 记下权威引用：保存草稿时以它为准，不再从 DOM 反推
            this.avatarReference = reference;
            this.storedAvatarReference = reference;
            this.avatarCleared = false;
            imgType = file.type;
            img.style.cssText = "";
            //<img> 只认 URL：用 /extension/... 显示；草稿里存同样形式，getAllData 会归一成 ext:
            const url = `/extension/${reference.slice(4)}`;
            this.recordURL("avatar", url);
            //清掉上一次恢复时挂的 onerror 兜底：否则新图加载失败会被旧路径顶掉
            img.onerror = null;
            //同名文件换图后地址不变 → 显示地址补 `?t=`（草稿里仍是干净的 ext: 引用）
            const displayUrl = this.displayAvatarUrl(url);
            img.src = displayUrl;
            avatar.classList.add("done");
            this.changeData("avatar", displayUrl);
        }
        this.createUniqueChoiceManager("height-set", ...avatarDataArea.querySelectorAll(".height-set"))
            .listenSiblings("pointerup")
            .setCallback((last, now) => {
                avatar.classList.remove(last?.dataset?.heightSet);
                avatar.classList.add(now?.dataset?.heightSet);
            })
            .chooseFirst();
        //拖拽一律拦掉浏览器默认行为（默认是把图片当页面打开 / 塞进 <img>）。
        //⚠️ 不能再用 `done` 早退：**已经有立绘时才是「换一张」最常用的场景**——原来一句
        //`if (done) return` 让 dragover 不 preventDefault，浏览器根本不会派发 drop（用户实测「拖了没反应」）。
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
            avatar.addEventListener(event, e => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });
        avatar.addEventListener("pointerup", async () => {
            if (avatar.classList.contains("done")) return;
            const fileList = await this.fileQuery("submitFile", { format: "image/*" });
            if (fileList !== null) loadFile(fileList[0]);
        });
        //拖入的可能是：本地图片文件 / 搜索到的原画卡（skin-info-card）/ 网页上的一张图（图片地址）
        avatar.addEventListener("drop", async e => {
            const file = Array.from(e?.dataTransfer?.files || []).find(item => item.type?.startsWith?.("image"));
            if (file) {
                loadFile(file);
                return;
            }
            const dropped = await this.loadDroppedAvatar(e.dataTransfer);
            if (!dropped) return;
            imgType = dropped.type;
            //落盘即存草稿：记录与生成的武将包文件当轮就更新（别只靠 400ms 防抖）
            this.saveDraft();
        });
        resetButton.addEventListener("pointerup", async () => {
            //重置要把编辑态一并清掉：裁到一半点重置会残留 cutting/editing，界面看着像卡住
            avatar.classList.remove("done", "editing", "cutting", "loading");
            img.onerror = null;
            img.removeAttribute("src");
            img.classList.remove("full-width", "full-height");
            img.style.cssText = "";
            //重置是显式清空：连记录里的引用一起清（否则下次保存又会把旧引用写回去）
            const previous = this.avatarReference || this.storedAvatarReference || this.getData("avatar");
            this.avatarReference = "";
            this.storedAvatarReference = "";
            this.avatarCleared = true;
            this.changeData("avatar", "");
            //同生共死：重置立绘 = 删掉已落盘的那张；**等删完再存草稿**，免得新图刚写盘就被这次删除带走
            if (previous) await this.removeAssetFile(previous);
            //立刻落一次草稿：重置后记录 / 生成的武将包文件当轮更新（原来只靠防抖，看着像没生效）
            this.saveDraft();
        });
        cutButton.addEventListener("pointerup", () => {
            avatar.classList.add("cutting", "editing");
            const initialHeight = img.offsetHeight,
                initialWidth = img.offsetWidth;
            cutter.querySelectorAll('.control-point').forEach((handle) => {
                handle.addEventListener('pointerdown', (event) => {
                    const startX = event.clientX,
                        startY = event.clientY;
                    const startLeft = parseFloat(cutter.style.left) || 0,
                        startTop = parseFloat(cutter.style.top) || 0;
                    const startWidth = cutter.offsetWidth,
                        startHeight = cutter.offsetHeight;
                    const updateRate = () => {
                        const scale = cutter.offsetHeight / initialHeight;
                        cutter.style.setProperty("--scale", scale);
                    }
                    const pointerMove =
                        event.target.classList.contains("rb") ? (e) => {
                            let width = startWidth + e.clientX - startX,
                                height = startHeight + e.clientY - startY,
                                left = parseFloat(cutter.style.left) || 0,
                                top = parseFloat(cutter.style.top) || 0;
                            const maxWidth = Math.min(initialWidth - left, initialWidth),
                                maxHeight = Math.min(initialHeight - top, initialHeight);
                            if (width > maxWidth) width = maxWidth;
                            if (height > maxHeight) height = maxHeight;
                            cutter.style.width = `${width}px`;
                            cutter.style.height = `${height}px`;
                            updateRate()
                        } : event.target.classList.contains("lb") ? (e) => {
                            let width = startWidth + startX - e.clientX,
                                height = startHeight + e.clientY - startY,
                                left = startLeft + e.clientX - startX,
                                top = parseFloat(cutter.style.top) || 0
                            const maxWidth = Math.min(initialWidth - left, initialWidth),
                                maxHeight = Math.min(initialHeight - top, initialHeight);
                            if (width > maxWidth) width = maxWidth;
                            if (height > maxHeight) height = maxHeight;
                            if (left < 0) left = 0;
                            if (left > initialWidth) left = initialWidth;
                            cutter.style.width = `${width}px`;
                            cutter.style.height = `${height}px`;
                            cutter.style.left = `${left}px`;
                            updateRate()
                        } : event.target.classList.contains("rt") ? (e) => {
                            let width = startWidth + e.clientX - startX,
                                height = startHeight + startY - e.clientY,
                                left = parseFloat(cutter.style.left) || 0,
                                top = startTop + e.clientY - startY
                            const maxWidth = Math.min(initialWidth - left, initialWidth),
                                maxHeight = Math.min(initialHeight - top, initialHeight);
                            if (width > maxWidth) width = maxWidth;
                            if (height > maxHeight) height = maxHeight;
                            if (top < 0) top = 0;
                            if (top > initialHeight) top = initialHeight;
                            cutter.style.width = `${width}px`;
                            cutter.style.height = `${height}px`;
                            cutter.style.top = `${top}px`;
                            updateRate()
                        } : event.target.classList.contains("lt") ? (e) => {
                            let width = startWidth + startX - e.clientX,
                                height = startHeight + startY - e.clientY,
                                left = startLeft + e.clientX - startX,
                                top = startTop + e.clientY - startY
                            const maxWidth = Math.min(initialWidth - left, initialWidth),
                                maxHeight = Math.min(initialHeight - top, initialHeight);
                            if (width > maxWidth) width = maxWidth;
                            if (height > maxHeight) height = maxHeight;
                            if (left < 0) left = 0;
                            if (left > initialWidth) left = initialWidth;
                            if (top < 0) top = 0;
                            if (top > initialHeight) top = initialHeight;
                            cutter.style.width = `${width}px`;
                            cutter.style.height = `${height}px`;
                            cutter.style.left = `${left}px`;
                            cutter.style.top = `${top}px`;
                            updateRate()
                        } : null;
                    const pointerUp = () => {
                        document.removeEventListener('pointermove', pointerMove);
                        document.removeEventListener('pointerup', pointerUp);
                    }
                    document.addEventListener('pointermove', pointerMove);
                    document.addEventListener('pointerup', pointerUp);
                });
            });
            const listener = async (e) => {
                if (e.composedPath()[0] === curtain || !imgContainer.contains(e.composedPath()[0])) {
                    document.removeEventListener("pointerdown", listener);
                    if (cutter.style.cssText.length > 0) {
                        avatar.classList.add("loading");
                        if (imgType === "image/gif") {
                            const clipManager = this.multiMediaQuery("gifClip", {
                                img,
                                x: parseFloat(cutter.style.left) || 0,
                                y: parseFloat(cutter.style.top) || 0,
                                width: cutter.clientWidth,
                                height: cutter.clientHeight,
                                dataForm: "blobURL",
                                quality: 1,
                                minDelay,
                                useClientData: true
                            })
                            clipManager.on("dataend", this.getURLRecordGroup("avatar").length === 1 ? (results) => {
                                minDelay = (results[0]?.image?.duration || 1e4) / 1e6;
                                avatar.classList.remove("cutting");
                            } : () => {
                                avatar.classList.remove("cutting");
                            });
                            clipManager.on("finished", (data) => {
                                this.reloadAvatar(data);
                                avatar.classList.remove("editing", "loading");
                            })
                        } else {
                            try {
                                await this.clipStaticAvatar(img, cutter, imgType);
                            } catch (err) {
                                //裁剪以前是「静默死在 async 监听里」：控制框和幕布留在界面上，看着就是显示异常
                                console.warn("裁剪失败", err);
                                alert(`裁剪失败：${(err && err.message) || err}`);
                                this.showAvatar(this.avatarReference || this.storedAvatarReference);
                            } finally {
                                //⚠️ 成败都必须退出编辑态（否则控制框/幕布常驻）
                                avatar.classList.remove("cutting", "editing", "loading");
                            }
                        }
                    } else {
                        avatar.classList.remove("cutting", "editing");
                    }
                    cutter.style.cssText = "";
                }
            }
            document.addEventListener("pointerdown", listener);
        });
        img.addEventListener("load", (e) => {
            //模拟cover效果
            //⚠️ 两个类不能同时留：`full-width`+`full-height` 会把图拉成 100%×100%（比例失真），
            //裁剪时的两个轴缩放率就对不上、剪出来的区域与用户框的不一致（踩过：裁剪后显示异常）
            img.classList.remove("full-width", "full-height");
            const scaleH = img.naturalHeight / avatar.clientHeight,
                scaleW = img.naturalWidth / avatar.clientWidth;
            img.classList.add(scaleH < scaleW ? "full-height" : "full-width");
        })
    }
    reloadDieAudios(url) {
        const audioCard = this.shadowRoot.querySelector("audio-info-card");
        audioCard.setAttribute("src", this.pathQuery("changeToExtPath", { path: url }));
        this.clearURLRecords("dieAudios");
        this.recordURL("dieAudios", url);
        this.changeData("dieAudios", url);
    }
    /**
     * 按 `dataset.dieAudios` 重建阵亡语音卡（载入草稿走它 —— `applyData` 只写 dataset，卡片不会自己出现）。
     * @returns {this}
     */
    renderDieAudios() {
        const dieAudiosDataArea = this.getDataAreaDom("dieAudios");
        const section = dieAudiosDataArea?.querySelector("section");
        if (!section) return this;
        section.innerHTML = "";
        const reference = (dieAudiosDataArea.dataset.dieAudios || "").split(" ").filter(Boolean)[0];
        if (!reference) return this;
        const audioCard = document.createElement("audio-info-card");
        audioCard.setAttribute("src", reference);
        audioCard.setAttribute("removable", true);
        section.append(audioCard);
        //`value` 要等卡片挂进文档之后再设：它的 attributeChangedCallback 会去 shadowRoot 里找输入框
        const dieAudioText = dieAudiosDataArea.dataset.dieAudioText;
        if (dieAudioText) audioCard.setAttribute("value", dieAudioText);
        return this;
    }
    #listenDieAudios() {
        const dieAudiosDataArea = this.getDataAreaDom("dieAudios");
        const dieAudioSection = dieAudiosDataArea.querySelector("section")
        const addButton = dieAudiosDataArea.querySelector(".add");
        addButton.addEventListener("pointerdown", async e => {
            if (dieAudioSection.childNodes.length) return;
            const [file] = await this.fileQuery("submitFile", { format: "audio/*" });
            if (!file) return;
            //旧引用（老版本存的 blob: URL）先清掉
            this.clearURLRecords("dieAudios")
            //落盘：extension/<工作区>/audio/die/<武将id>1.<ext>（与引擎的扩展音频约定一致）
            const reference = await this.saveLocalAsset(file, "extension-die-audio", "1");
            if (!reference) return;
            const audioCard = document.createElement("audio-info-card");
            audioCard.setAttribute("src", reference);
            audioCard.setAttribute("removable", true)
            dieAudioSection.append(audioCard);
            this.changeData("dieAudios", reference);
        });
        //🗑️ 删条目 = 删文件（同生共死）
        dieAudioSection.addEventListener("removeCard", async e => {
            const node = e.detail && e.detail.from;
            const reference = node && node.getAttribute && node.getAttribute("src");
            if (reference) await this.removeAssetFile(reference);
            this.changeData("dieAudios", "");
        });
        dieAudioSection.addEventListener("audioTextChange", e => {
            if (typeof e.detail?.newValue === "string") this.changeData("dieAudioText", e.detail.newValue);
        });
    }
    #listenName() {
        const nameDataArea = this.getDataAreaDom("name")
        const nameInput = nameDataArea.querySelector('div');
        const pinyinInput = nameDataArea.querySelector('rt');
        preventEnter(nameInput, pinyinInput);
        new MutationObserver(() => {
            this.changeData("name", nameInput.textContent);
            pinyinInput.textContent = this.textQuery("pinyin", { text: nameInput.textContent, withTone: true });
        }).observe(nameInput, { characterData: true, subtree: true, childList: true });
        new MutationObserver(() => {
            this.changeData("pinyin", pinyinInput.textContent);
        }).observe(pinyinInput, { characterData: true, subtree: true, childList: true });
    }
    loadId(id) {
        const idDataArea = this.getDataAreaDom("id");
        const idInput = idDataArea.querySelector("div");
        return new Promise(reslove => {
            idInput.textContent = id;
            reslove();
        })
    }
    #listenId() {
        const idDataArea = this.getDataAreaDom("id");
        const idInput = idDataArea.querySelector("div");
        const button = idDataArea.querySelector("button");
        const title = idDataArea.querySelector("span>span");
        preventEnter(idInput);
        button.addEventListener("pointerup", () => {
            const pinyin = this.textQuery("pinyin", { text: this.getData("name"), withTone: false }).join("");
            idInput.textContent = pinyin;
        });
        //实例字段而不是闭包变量：载入草稿后要能重新对准（见 loadDraft）
        this.lastAssetId = this.getData("id") || "";
        new MutationObserver(async () => {
            const nowId = idInput.textContent;
            this.changeData("id", nowId)
            this.changeData("defaultIntro", this.playerQuery("intro", { id: nowId }));
            if (this.checkQuery("characterId", { id: nowId })) {
                if (title.classList.contains("wrong")) title.classList.remove("wrong");
            } else {
                if (!title.classList.contains("wrong")) title.classList.add("wrong");
            }
            //媒体文件改名跟随（同生共死）
            if (this.lastAssetId && nowId && this.lastAssetId !== nowId) await this.renameAssets(this.lastAssetId, nowId);
            this.lastAssetId = nowId;
        }).observe(idInput, { characterData: true, subtree: true, childList: true });
    }
    #listenSex() {
        const sexOptions = this.getDataAreaDom("sex").querySelectorAll("[data-sex-option]");
        this.sexChoiceManager = this.createUniqueChoiceManager("sex", ...sexOptions)
            .listenSiblings("pointerup")
            .setCallback((pre, now, funcMap) => {
                funcMap.forClass("chosen");
                this.changeData("sex", now.dataset.sexOption);
            })
            .choose(sexOptions[0]);
    }
    /**
     * 记下势力的中文名（`x19D6_editor.groups.<势力id>`）并补进 live lib.translate。
     * 落盘时要靠它生成 `translate[势力id] = 中文名`——否则自定义势力在游戏里只显示原 id（用户反馈的「势力没落包」）。
     * @param {string} groupId
     * @param {string} groupName
     */
    recordGroupName(groupId, groupName) {
        if (!groupId || !groupName) return;
        this.configQuery("write", { member: `x19D6_editor.groups.${groupId}`, value: groupName });
        if (!lib.translate[groupId]) lib.translate[groupId] = groupName;
    }
    createGroupOption({ id, name, textShadow, imageData } = {}) {
        return this.createDiyOption({
            dataset: { groupOption: id },
            label: name || id || "",
            style: { "--url": imageData ? `url(${imageData})` : "", "--group-text-shadow": textShadow || "" }
        });
    }
    createClanOption(name) {
        return this.createDiyOption({ dataset: { clanOption: name }, label: name });
    }
    /**
     * 建一个「势力 / 宗族」选项条目。
     * ⚠️ 文字必须包在 `.diy-label` 里：`li.textContent` 会被 ✕ 删除键污染，而单/多选管理器是读
     * `now.textContent` 拿势力名的（见 #listenGroup 里的 setGroup）——不包一层就会把「✕」拼进势力名。
     * @param {{dataset?:Record<string,string>, label?:string, style?:Record<string,string>}} config
     */
    createDiyOption({ dataset = {}, label = "", style = {} } = {}) {
        const li = document.createElement("li");
        Object.assign(li.dataset, dataset);
        const labelSpan = document.createElement("span");
        labelSpan.className = "diy-label";
        labelSpan.textContent = label;
        li.append(labelSpan);
        Object.entries(style).forEach(([name, value]) => {
            //没有图片就别写 url(undefined)——那会让整个选项渲染成空白格（用户截图里那个空位）
            if (value) li.style.setProperty(name, value);
        });
        return li;
    }
    /**
     * 取选项条目的显示文字（排除 ✕ 删除键）。管理器靠它读势力名 / 宗族名。
     * @param {HTMLElement} [node]
     * @returns {string}
     */
    optionLabel(node) {
        return (node?.querySelector?.(".diy-label")?.textContent || node?.textContent || "").trim();
    }
    /**
     * 给自建项挂上右上角的 ✕ 删除键。
     * ⚠️ 必须 `stopPropagation`：选择管理器的 pointerup 监听就挂在 `<li>` 上（`listenAllNodes`），
     * 不拦住的话按 ✕ 会先触发一次「选中这个势力 / 宗族」。
     * @param {HTMLElement} node
     */
    attachDiyRemove(node) {
        if (!node) return node;
        const button = document.createElement("span");
        button.className = "diy-remove";
        button.title = "删除";
        button.addEventListener("pointerup", (event) => {
            event.stopPropagation();
            event.preventDefault();
            this.removeDiyOption(node);
        });
        node.append(button);
        return node;
    }
    /**
     * ✕ 的统一入口：按条目上的属性分派给势力 / 宗族的删除逻辑。
     * @param {HTMLElement} node
     */
    removeDiyOption(node) {
        if (!node) return;
        if (node.dataset.groupOption != null) this.removeCustomGroup(node.dataset.groupOption);
        else if (node.dataset.clanOption != null) this.removeCustomClan(node.dataset.clanOption);
    }
    /**
     * @returns {Record<string, object>} 全部武将草稿（键 = 草稿编号）
     */
    draftRecords() {
        return this.configQuery("get", { member: "x19D6_editor.characters" }) || {};
    }
    /**
     * 删除一个自建势力：界面选中态 / 多势力串 / 登记表 / 图标 / live translate / **所有草稿里的引用**一起清掉。
     * @param {string} groupId
     */
    async removeCustomGroup(groupId) {
        if (!groupId) return;
        const chooseManager = this.groupChoiceManager;
        const doubleManager = this.doubleGroupChoiceManager;
        const wasChosen = chooseManager?.chosen?.dataset?.groupOption === groupId;
        const nodes = Array.from(this.getDataAreaDom("group")?.querySelectorAll(`[data-group-option="${CSS.escape(groupId)}"]`) || []);
        //① 先收拾界面选中态：选中的正是它 → 空选中（会回调 setGroup，把 data-group 一并清掉）
        if (wasChosen) {
            chooseManager.choose(null);
        } else if (this.getDataAreaDom("group")?.dataset?.group === groupId) {
            this.changeData("group", "");
        }
        //多选的「多势力」里也要摘掉
        this.removeGroupFromDouble(groupId);
        //② 从两个选择管理器里摘掉（listener 留着无妨：节点已离开文档，点不到）
        nodes.forEach(node => {
            chooseManager?.remove(node);
            doubleManager?.remove(node);
            node.remove();
        });
        //③ 登记表 / 图标记录 / live translate 一并清掉
        this.configQuery("remove", { member: `x19D6_editor.groups.${groupId}` });
        const icon = this.configQuery("get", { member: `x19D6_editor.groupImages.${groupId}` });
        if (icon) {
            this.configQuery("remove", { member: `x19D6_editor.groupImages.${groupId}` });
            try {
                await this.fileQuery("removeFile", { path: `extension/${icon}` });
            } catch (err) {
                console.warn("势力图标删除失败", icon, err);
            }
        }
        if (lib.translate[groupId]) delete lib.translate[groupId];
        //④ 草稿里的引用一起清空
        this.purgeDraftsByGroup(groupId);
        this.finishDiyRemove();
    }
    /**
     * 删除一个自建宗族（宗族没有独立 id，key 就是中文名）。
     * @param {string} name
     */
    removeCustomClan(name) {
        if (!name) return;
        const manager = this.clanChoiceManager;
        const wasChosen = manager?.chosen?.dataset?.clanOption === name;
        const nodes = Array.from(this.getDataAreaDom("clans")?.querySelectorAll(`[data-clan-option="${CSS.escape(name)}"]`) || []);
        //选中态必须走管理器：choose(null) 会跑回调，把随宗族附加的技能一起移除
        if (wasChosen) manager.choose(null);
        else if ((this.getDataAreaDom("clans")?.dataset?.clans || "").split(" ").includes(name)) this.changeData("clans", "");
        nodes.forEach(node => {
            manager?.remove(node);
            node.remove();
        });
        const saved = this.configQuery("get", { member: "x19D6_editor.clans" });
        if (Array.isArray(saved)) {
            this.configQuery("write", { member: "x19D6_editor.clans", value: saved.filter(clan => clan !== name) });
        }
        //草稿里存的宗族是数组，删掉这一个；数组空了就把字段一起删，别留一份空数组
        this.purgeDraftField(
            record => Array.isArray(record.clans) && record.clans.includes(name),
            record => {
                const left = record.clans.filter(clan => clan !== name);
                if (left.length) record.clans = left;
                else delete record.clans;
            }
        );
        this.finishDiyRemove();
    }
    /**
     * 从「多势力」多选管理器与编辑器数据里摘掉某个势力。
     * @param {string} groupId
     */
    removeGroupFromDouble(groupId) {
        const area = this.getDataAreaDom("group");
        if (!area) return;
        const list = (area.dataset.doubleGroup || "").split(" ").filter(Boolean);
        if (!list.includes(groupId)) return;
        const left = list.filter(id => id !== groupId);
        area.dataset.doubleGroup = left.join(" ");
        const node = Array.from(area.querySelectorAll("[data-group-option]")).find(item => item.dataset.groupOption === groupId);
        if (node) this.doubleGroupChoiceManager?.unselect(node);
        const chosen = this.groupChoiceManager?.chosen?.dataset?.groupOption;
        const infoList = left.filter(id => id !== chosen).map(id => {
            const item = Array.from(area.querySelectorAll("[data-group-option]")).find(data => data.dataset.groupOption === id);
            return { groupId: id, groupName: this.optionLabel(item), groupTextShadow: item?.style?.getPropertyValue?.("--group-text-shadow") };
        });
        if (!left.length) {
            this.doubleGroupChoiceManager?.reset();
            area.dataset.doubleGroup = "";
        } else {
            this.setDoubleGroup({ groupId: chosen, groupName: this.optionLabel(this.groupChoiceManager?.chosen), groupTextShadow: "" }, infoList);
        }
    }
    /**
     * 清空所有武将草稿里的某个势力：`group` 与 `doubleGroup`（空格分隔的多势力串）都要摘掉。
     * @param {string} groupId
     */
    purgeDraftsByGroup(groupId) {
        this.purgeDraftField(
            record => record.group === groupId || (record.doubleGroup || "").split(" ").includes(groupId),
            record => {
                if (record.group === groupId) delete record.group;
                if (record.doubleGroup) {
                    const left = record.doubleGroup.split(" ").filter(id => id && id !== groupId);
                    if (left.length) record.doubleGroup = left.join(" ");
                    else delete record.doubleGroup;
                }
            }
        );
    }
    /**
     * 按条件改写当前工作区下的武将草稿（写回的是原对象引用，`writeConfig` 按键整份落盘）。
     * @param {(record:object)=>boolean} match
     * @param {(record:object)=>void} apply
     * @returns {number} 改了几份
     */
    purgeDraftField(match, apply) {
        const records = this.draftRecords();
        let changed = 0;
        Object.values(records).forEach(record => {
            if (!record || typeof record !== "object") return;
            if (this.workspace && record.extension && record.extension !== this.workspace) return;
            if (!match(record)) return;
            apply(record);
            changed++;
        });
        return changed;
    }
    /**
     * 删除自建项之后的收尾：刷新选项列表 → 当前草稿立刻落库 → 通知外壳重新生成武将包文件。
     * ⚠️ 顺序不能反：`saveDraft()` 会把当前界面状态写进配置，必须排在所有清空动作之后。
     */
    finishDiyRemove() {
        this.renderCustomGroups();
        this.renderCustomClans();
        this.flushDraft();
        this.triggerEvent("draftSaved", { draftKey: this.draftKey });
    }
    /**
     * 记下自建宗族（`x19D6_editor.clans` 数组）。宗族没有独立 id，key 就是中文名。
     * @param {string} name
     */
    recordClanName(name) {
        if (!name) return;
        const saved = this.configQuery("get", { member: "x19D6_editor.clans" });
        const clans = Array.isArray(saved) ? saved.slice() : [];
        if (clans.includes(name)) return;
        clans.push(name);
        this.configQuery("write", { member: "x19D6_editor.clans", value: clans });
    }

    /**
     * 把自建势力的图标落盘到 `extension/<工作区>/image/group/<势力id>.png`，并记下路径。
     * 图标是自建势力对话框里画布画出来的 data URL，不落盘刷新就丢（用户反馈：势力图片缺少）。
     * @param {string} groupId
     * @param {string} imageData
     * @returns {Promise<string>} 相对 resources/app 的路径（`<工作区>/image/group/<id>.png`）；失败返回 ""
     */
    async saveGroupIcon(groupId, imageData) {
        if (!groupId || !imageData || !this.workspace) return "";
        const relative = `${this.workspace}/image/group/${groupId}.png`;
        try {
            const blob = await (await fetch(imageData)).blob();
            const buffer = await blob.arrayBuffer();
            await this.fileQuery("writeFile", { path: `extension/${relative}`, data: buffer });
        } catch (err) {
            console.warn("势力图标落盘失败", relative, err);
            return "";
        }
        this.configQuery("write", { member: `x19D6_editor.groupImages.${groupId}`, value: relative });
        return relative;
    }
    /**
     * 把自建势力补回选项列表：来源是登记表（`x19D6_editor.groups`）**以及现有草稿用到的势力**
     * （草稿里用过但没登记的势力，若不在列表里，打开草稿时那个势力根本没法选）。
     * ⚠️ 必须在创建选择管理器**之前**调用（管理器是按当时的节点建的，事后插节点它不认）。
     * @returns {number} 补了几个
     */
    renderCustomGroups() {
        const groupDataArea = this.getDataAreaDom("group");
        if (!groupDataArea) return 0;
        const groupDiy = groupDataArea.querySelector("[data-diy]");
        if (!groupDiy) return 0;
        const saved = Object.assign({}, this.configQuery("get", { member: "x19D6_editor.groups" }) || {});
        const icons = this.configQuery("get", { member: "x19D6_editor.groupImages" }) || {};
        const records = this.configQuery("get", { member: "x19D6_editor.characters" }) || {};
        Object.values(records).forEach(record => {
            if (!record || !record.group) return;
            if (this.workspace && record.extension && record.extension !== this.workspace) return;
            if (!saved[record.group]) saved[record.group] = record.group;
        });
        let added = 0;
        Object.entries(saved).forEach(([groupId, groupName]) => {
            if (groupDataArea.querySelector(`[data-group-option="${CSS.escape(groupId)}"]`)) return;
            const icon = icons[groupId];
            groupDiy.parentElement.insertBefore(
                this.attachDiyRemove(this.createGroupOption({ id: groupId, name: groupName, imageData: icon ? `/extension/${icon}` : "" })),
                groupDiy
            );
            added++;
        });
        return added;
    }

    /**
     * 把自建宗族补回选项列表：来源是登记表（`x19D6_editor.clans`）**以及现有草稿用到的宗族**。
     * ⚠️ 同样要在建管理器之前。
     * @returns {number} 补了几个
     */
    renderCustomClans() {
        const clansDataArea = this.getDataAreaDom("clans");
        if (!clansDataArea) return 0;
        const clanDiy = clansDataArea.querySelector("[data-diy]");
        if (!clanDiy) return 0;
        const saved = this.configQuery("get", { member: "x19D6_editor.clans" });
        const clans = new Set(Array.isArray(saved) ? saved : []);
        const records = this.configQuery("get", { member: "x19D6_editor.characters" }) || {};
        Object.values(records).forEach(record => {
            if (!record || !Array.isArray(record.clans)) return;
            if (this.workspace && record.extension && record.extension !== this.workspace) return;
            record.clans.forEach(clan => clan && clans.add(clan));
        });
        let added = 0;
        clans.forEach(clanName => {
            if (clansDataArea.querySelector(`[data-clan-option="${CSS.escape(clanName)}"]`)) return;
            clanDiy.parentElement.insertBefore(this.attachDiyRemove(this.createClanOption(clanName)), clanDiy);
            added++;
        });
        return added;
    }
    setGroup(info) {
        const { groupName, groupTextShadow, groupId } = info;
        this.style.setProperty(
            "--data-group",
            `"${groupName || ""}势力"`
        );
        this.style.setProperty(
            "--data-group-text-shadow",
            groupTextShadow || ""
        );
        this.changeData("group", groupId);
        this.recordGroupName(groupId, groupName);
    }
    /**
     * @typedef {{groupId:string,groupName:string,groupTextShadow:string}} groupInfo
     * @param {groupInfo} mainGroupInfo 
     * @param {groupInfo[]} infoList 
     */
    setDoubleGroup(mainGroupInfo, infoList) {
        const groupIdList = infoList.map(info => info.groupId).filter(Boolean);
        const groupNameList = infoList.map(info => info.groupName).filter(Boolean);
        const groupTextShadowList = infoList.map(info => info.groupTextShadow).filter(Boolean);
        this.style.setProperty(
            "--data-group",
            `"${[mainGroupInfo.groupName, ...groupNameList].join("/")}势力"`
        );
        this.style.setProperty(
            "--data-group-text-shadow",
            [mainGroupInfo.groupTextShadow, ...groupTextShadowList].join(",")
        );
        this.changeData(
            "doubleGroup",
            groupIdList.length ? [mainGroupInfo.groupId, ...groupIdList].join(" ") : ""
        );
        [mainGroupInfo, ...infoList].forEach(info => this.recordGroupName(info?.groupId, info?.groupName));
    }
    #listenGroup() {
        const groupDataArea = this.getDataAreaDom("group")
        //自建势力先补回列表：选择管理器按当时节点构建，补晚了它就不认
        this.renderCustomGroups();
        const groupChosenSection = groupDataArea.querySelector("section");
        const groupOptions = groupDataArea.querySelectorAll("[data-group-option]");
        const doubleGroupCheckBox = groupDataArea.querySelector(".checkbox");
        const singleManager = this.createUniqueChoiceManager("group", ...groupOptions);
        const doubleManager = this.createMultipleChoiceManager("doubleGroup", ...groupOptions);
        const chosenModeManager = this.createMultipleChoiceManager("groupChosenMode", doubleGroupCheckBox);
        const weakmap = new WeakMap([
            [
                doubleGroupCheckBox,
                new Map([
                    [doubleGroupCheckBox, ["chosen"]],
                    [groupChosenSection, ["double-group-choosing"]]
                ])
            ]
        ])
        chosenModeManager.listenSiblings("pointerup")
            .setCallback((type, target, eventMap) => {
                eventMap.forClassByNodeClassMap(weakmap);
                if (type === "delete" && target === doubleGroupCheckBox) {
                    doubleManager.reset();
                }
            })
            .setGetInfoMethod((target) => {
                return target.getAttribute("value");
            })
        singleManager.listenAllNodes("pointerup", () => !chosenModeManager.getLastestInfo())
            .setCallback((pre, now, funcMap) => {
                funcMap.forClass("chosen");
                this.setGroup({
                    groupId: now?.dataset?.groupOption,
                    groupName: this.optionLabel(now),
                    groupTextShadow: now?.style?.getPropertyValue?.("--group-text-shadow")
                });
            })
            .choose(groupOptions[0]);
        this.groupChoiceManager = singleManager;
        this.doubleGroupChoiceManager = doubleManager;
        doubleManager
            .listenAllNodes("pointerup", (_event, node) => chosenModeManager.getLastestInfo() === "double" && !node.classList.contains("chosen"))
            .setCallback((type, target, funMap) => {
                funMap.forClass("double-group-chosen");
                const infoList = doubleManager.getAllInfo();
                const groupChosen = singleManager.chosen;
                const groupInfo = {
                    groupId: groupChosen?.dataset?.groupOption,
                    groupName: this.optionLabel(groupChosen),
                    groupTextShadow: groupChosen?.style?.getPropertyValue?.("--group-text-shadow")
                }
                this.setDoubleGroup(groupInfo, infoList);
            })
            .setGetInfoMethod(target => {
                return {
                    groupId: target?.dataset?.groupOption,
                    groupName: this.optionLabel(target),
                    groupTextShadow: target?.style?.getPropertyValue?.("--group-text-shadow")
                };
            });
        const groupDiy = groupDataArea.querySelector("[data-diy]");
        groupDiy.addEventListener("pointerup", async () => {
            const dialog = document.createElement("noname-dialog");
            dialog.setAttribute("type", "diygroup");
            this.shadowRoot.append(dialog);
            const result = await dialog.wait();
            if (result) {
                //图标先落盘，再拿落盘路径建选项（否则刷新后图标就没了）
                const iconPath = await this.saveGroupIcon(result.id, result.imageData);
                const newGroupOption = this.attachDiyRemove(this.createGroupOption({ ...result, imageData: iconPath ? `/extension/${iconPath}` : "" }));
                groupDiy.parentElement.insertBefore(newGroupOption, groupDiy);
                singleManager.append(newGroupOption);
                doubleManager.append(newGroupOption);
                this.recordGroupName(result.id, result.name);
            }
        })
    }
    #listenClans() {
        const clansDataArea = this.getDataAreaDom("clans")
        //自建宗族先补回列表（同上）
        this.renderCustomClans();
        const clanOptions = clansDataArea.querySelectorAll("[data-clan-option]");
        const manager = this.createUniqueChoiceManager("clans", ...clanOptions)
            .listenAllNodes("pointerup")
            .setCallback((pre, now, funcMap) => {
                funcMap.forClass("chosen");
                if (pre instanceof HTMLElement) {
                    this.removeSkill(this.playerQuery("clanSkillId", { clan: pre.dataset.clanOption }));
                }
                if (now instanceof HTMLElement) {
                    const clanSkillId = this.playerQuery("clanSkillId", { clan: now.dataset.clanOption });
                    this.addSkill(clanSkillId);
                    this.changeData("clans", now.dataset.clanOption);
                } else {
                    this.changeData("clans", "");
                }
            })
            .setRevocable(true);
        this.clanChoiceManager = manager;
        const clanDiy = clansDataArea.querySelector("[data-diy]");
        clanDiy.addEventListener("pointerup", async () => {
            const dialog = document.createElement("noname-dialog");
            dialog.setAttribute("type", "prompt");
            this.shadowRoot.append(dialog);
            dialog.setAttribute("message", "请输入宗族");
            const result = await dialog.wait()
            if (result) {
                const newClanOption = this.attachDiyRemove(this.createClanOption(result));
                clanDiy.parentElement.insertBefore(newClanOption, clanDiy);
                manager.append(newClanOption);
                this.recordClanName(result);
            }
        })
    }
    #adjustHpDivsTo(num) {
        if (num < 1 || num > 6) return;
        const hpDataArea = this.getDataAreaDom("hp");
        const hpContainer = hpDataArea.querySelector(".hpContainer");
        const hpManager = this.getUniqueChoiceManager("hp")
        const hps = Array.from(hpDataArea.querySelectorAll(`.hp`));
        const d = num - hps.length;
        if (d > 0) {
            for (let i = 0; i < d; i++) {
                const hp = document.createElement("div");
                hp.className = "hp lost";
                hpContainer.prepend(hp);
                hpManager.append(hp);
            }
        } else if (d < 0) {
            hps.slice(0, Math.abs(d)).forEach(node => {
                node.remove();
                hpManager.remove(node);
            })
        }
    }
    #prependMaxHp(num = 1, onlyMaxHp = false) {
        if (num < 0) return;
        const hpDataArea = this.getDataAreaDom("hp");
        const moreShowContainer = hpDataArea.querySelector(".hp-more-show");
        const hpManager = this.getUniqueChoiceManager("hp");
        const nowHp = this.getData("hp"), nowMaxHp = this.getData("maxHp");
        const maxHpInputManager = this.getEditableElementManager("maxHp");
        const hpInputManager = this.getEditableElementManager("hp");
        const changedMaxHp = nowMaxHp + num
        maxHpInputManager.changeValue(changedMaxHp);
        this.changeData("maxHp", changedMaxHp);
        if (changedMaxHp <= 6) {
            this.#adjustHpDivsTo(changedMaxHp);
            if (onlyMaxHp === false) {
                hpManager.choose(this.getDataAreaDom("hp").querySelector(`.hp:nth-last-child(${nowHp + num})`));
            }
        } else {
            if (moreShowContainer.classList.contains("hidden")) {
                moreShowContainer.classList.remove("hidden");
            }
            if (onlyMaxHp === false) {
                hpInputManager.changeValue(nowHp + num);
                this.changeData("hp", nowHp + num);
            }
            hpManager.choose(null);
        }
    }
    #removeMaxHp(num = 1) {
        if (num < 0) return;
        const hpDataArea = this.getDataAreaDom("hp");
        const moreShowContainer = hpDataArea.querySelector(".hp-more-show");
        const hpManager = this.getUniqueChoiceManager("hp")
        const maxHpInputManager = this.getEditableElementManager("maxHp");
        const hpInputManager = this.getEditableElementManager("hp");
        const nowHp = this.getData("hp"), nowMaxHp = this.getData("maxHp"); num = Math.min(num, nowMaxHp - 1);
        const changedMaxHp = num === Infinity ? 1 : nowMaxHp - num;
        this.changeData("maxHp", changedMaxHp);
        maxHpInputManager.changeValue(changedMaxHp);
        if (changedMaxHp <= 6) {
            this.#adjustHpDivsTo(changedMaxHp);
            if (!moreShowContainer.classList.contains("hidden")) moreShowContainer.classList.add("hidden");
            if (changedMaxHp < nowHp) {
                hpManager.choose(hpDataArea.querySelector(".hp"));
            } else {
                hpManager.choose(hpDataArea.querySelector(`.hp:nth-last-child(${nowHp})`));
            }
        } else if (changedMaxHp < nowHp) {
            hpInputManager.changeValue(nowHp - num);
            this.changeData("hp", nowHp - num);
        }
    }
    #addHp(num = 1) {
        if (num < 0) return;
        const hpManager = this.getUniqueChoiceManager("hp")
        const hpInputManager = this.getEditableElementManager("hp");
        const nowHp = this.getData("hp"), nowMaxHp = this.getData("maxHp");
        const d = nowHp + num - nowMaxHp;
        hpInputManager.changeValue(nowHp + num);
        this.changeData("hp", nowHp + num);
        //体力溢出
        if (d > 0) {
            this.#prependMaxHp(d, true);
        }
        //体力未溢出且上限不超过6，或体力溢出，但是变换后的上限小于6
        if (d <= 0 && nowMaxHp <= 6 || d > 0 && nowMaxHp + d <= 6) {
            hpManager.choose(this.getDataAreaDom("hp").querySelector(`.hp:nth-last-child(${nowHp + num})`));
        }
    }
    #removeHp(num = 1) {
        if (num < 0) return;
        const hpManager = this.getUniqueChoiceManager("hp")
        const hpInputManager = this.getEditableElementManager("hp");
        const nowHp = this.getData("hp"), nowMaxHp = this.getData("maxHp"); num = Math.min(num, nowHp - 1);
        const changedHp = num === Infinity ? 1 : nowHp - num;
        hpInputManager.changeValue(changedHp);
        this.changeData("hp", changedHp);
        if (nowMaxHp <= 6) {
            hpManager.choose(this.getDataAreaDom("hp").querySelector(`.hp:nth-last-child(${changedHp})`));
        }
    }
    #listenHp() {
        let hpAdjustMode, hpAdjustUnitOffset = 1;
        const hpDataArea = this.getDataAreaDom("hp");
        const hpContainer = hpDataArea.querySelector(".hpContainer");
        const unitOffsetInput = hpDataArea.querySelector(".hp-adjust [contenteditable]")
        const [hpInput, maxHpInput] = hpDataArea.querySelectorAll(".hp-operation [contenteditable]");
        const [hpPlus, hpMinus] = hpDataArea.querySelectorAll(".hp-adjust>div>div");
        const hpManager = this.createUniqueChoiceManager("hp", ...hpDataArea.querySelectorAll(".hp"));
        const adjustOptionManager = this.createUniqueChoiceManager(null, ...hpDataArea.querySelectorAll(".hp-more-show span"));
        const unitOffsetInputManager = this.createEditableElementManager(null, unitOffsetInput)
        const hpInputManager = this.createEditableElementManager("hp", hpInput);
        const maxHpInputManager = this.createEditableElementManager("maxHp", maxHpInput);

        maxHpInputManager.inputNumber({
            min: 1, max: Infinity, value: 4, supportInfinity: true, isInteger: true,
            commonCallback: (e, val, last) => {
                const d = val - last;
                if (d < 0) this.#removeMaxHp(Math.abs(d));
                else if (d > 0) this.#prependMaxHp(d, true);
            }
        });
        hpInputManager.inputNumber({
            min: 1, max: Infinity, value: 4, supportInfinity: true, isInteger: true,
            commonCallback: (e, val, last) => {
                const d = val - last;
                if (d > 0) this.#addHp(d)
                else if (d < 0) this.#removeHp(Math.abs(d))
            }
        });
        unitOffsetInputManager.inputNumber({
            min: 1, max: Infinity, value: 1, supportInfinity: true, isInteger: true,
            commonCallback: (e, i) => {
                hpAdjustUnitOffset = i;
            }
        })
        hpManager.listenSiblings("pointerup").setCallback((pre, now, funcMap) => {
            funcMap.forClass("chosen");
            const hps = Array.from(this.getDataAreaDom("hp").querySelectorAll(".hp"));
            const i = hps.indexOf(now);
            //choose(null)（体力上限 > 6 时收回血格的选中态）不带节点：indexOf 会给 -1，
            //照旧算成「格数 + 1」会把体力值改错（6/6 点 + 之后 hp 变成 5）
            if (i < 0) return;
            const hpValue = hps.length - i;
            this.changeData("hp", hpValue);
            hpInputManager.changeValue(hpValue);
        }).chooseFirst()
        adjustOptionManager.listenSiblings("pointerup").setCallback((pre, now, funcMap) => {
            funcMap.forClass("chosen");
            hpAdjustMode = now.dataset.hpAdjustMode;
        }).chooseFirst()
        hpPlus.addEventListener("pointerup", () => {
            const maxHp = this.getData("maxHp"), hp = this.getData("hp");
            if (maxHp > 6) {
                if (hpAdjustMode === "maxHp") this.#prependMaxHp(hpAdjustUnitOffset, true);
                else this.#addHp(hpAdjustUnitOffset);
            } else if (hp === maxHp) {
                this.#prependMaxHp(1, false);
            } else {
                this.#prependMaxHp(1, true);
            }
        });
        hpMinus.addEventListener("pointerup", () => {
            if (this.getData("maxHp") > 6) {
                if (hpAdjustMode === "maxHp") this.#removeMaxHp(hpAdjustUnitOffset);
                else this.#removeHp(hpAdjustUnitOffset);
            } else this.#removeMaxHp();
        });
        //
        const hujias = Array.from(this.getDataAreaDom("hujia").querySelectorAll(".hujia"));
        const hujiaManager = this.createUniqueChoiceManager("hujia", ...hujias);
        const hujiaInputManager = this.createEditableElementManager("hujia", this.getDataAreaDom("hujia").querySelector(".hujia-operation [contenteditable]"))
        hujiaInputManager.inputNumber({
            min: 0, max: 5, value: 0, isInteger: true,
            commonCallback: (e, i) => {
                hujiaManager.choose(hujias[5 - i])
            }
        })
        hujiaManager.listenSiblings("pointerup")
            .setCallback((last, now, funcMap) => {
                funcMap.forClass("chosen");
                const i = hujias.indexOf(now);
                const hujiaValue = 5 - i;
                this.changeData("hujia", hujiaValue);
                hujiaInputManager.changeValue(hujiaValue);
            })
        new MutationObserver(() => {
            toggleMultiClass(hpContainer, "healthy", "damaged", "dangerous")
                .single(this.playerQuery("hpStatus", { hp: this.getData("hp"), maxHp: this.getData("maxHp") }));
        }).observe(hpContainer, {
            attributes: true,
            childList: true,
            subtree: true,
            attributeFilter: ['class']
        });
    }
    /**
     * 造一张技能卡（技能栏与「载入草稿」共用；字段与 `data-noname.mjs:parseSkill` 的产物同形）。
     * ⚠️ `lib.skill` 里还没有这个技能时 `infoQuery` 给的是 null，而卡片拿到 null 会渲染成**空条**，
     * 所以补一份按 translate 兜底的技能信息。
     * @param {string} id
     * @returns {HTMLElement}
     */
    createSkillCard(id) {
        const skillCard = document.createElement("skill-info-card");
        skillCard.setAttribute("skill-id", id);
        skillCard.skillInfo = this.infoQuery("skill", { skillId: id, characterId: this.getData("id") })
            || { id, name: lib.translate[id] || id, description: lib.translate[id + "_info"] || "", audios: [] };
        skillCard.setAttribute("removable", true);
        return skillCard;
    }
    addSkill(arg) {
        const skillsDataArea = this.getDataAreaDom("skills");
        const ul = skillsDataArea.querySelector("ul");
        let id;
        if (arg instanceof HTMLElement && arg.tagName === "SKILL-INFO-CARD") {
            id = arg.getAttribute("skill-id")
        } else if (typeof arg === "string" && arg.trim().length !== 0) {
            id = arg;
        } else return;
        //已经在技能栏里的不再入场：同一张卡拖两次、或载入草稿时宗族回调补挂已列出的技能，
        //都会把同一个技能写两遍（一个武将带两个同名技能是坏数据）
        if (id && (skillsDataArea.dataset.skills || "").split(" ").includes(id)) return;
        if (arg instanceof HTMLElement && arg.tagName === "SKILL-INFO-CARD") {
            const node = arg;
            node.removeAttribute("usable");
            node.removeAttribute("id");
            node.removeAttribute("markWords");
            ul.append(node);
        } else {
            ul.append(this.createSkillCard(id));
        }
        this.changeData("skills", id, { mode: "append" });
        if (this.checkQuery("skillTags", { id, tags: ["hiddenSkill"] })) {
            this.getMultipleChocieManager("more").selectByFind(node => node.dataset.moreOption === "hasHiddenSkill")
        }
        if (this.checkQuery("skillTags", { id, tags: ["zhuSkill"] })) {
            this.getMultipleChocieManager("more").selectByFind(node => node.dataset.moreOption === "isZhugong")
        }
    }
    removeSkill(arg) {
        const skillsDataArea = this.getDataAreaDom("skills");
        const ul = skillsDataArea.querySelector("ul");
        let id, node;
        if (arg instanceof HTMLElement) {
            node = arg;
            id = node.getAttribute("skill-id");
        } else if (typeof arg === "string" && arg.trim().length !== 0) {
            id = arg;
            node = ul.querySelector(`[skill-id=${id}]`);
        } else return;
        node?.remove?.();
        this.changeData("skills", id, { mode: "remove" });
    }
    /**
     * 按 `dataset.skills` 重建技能栏。
     * ⚠️ `changeData` 只负责写 `dataset` 与 CSS 变量，卡片是 DOM —— 载入草稿后不重建的话
     * 技能栏是空的，用户一动别的字段，防抖保存就把空技能栏当成真相写回记录（技能就是这么丢的）。
     * @returns {this}
     */
    renderSkills() {
        const skillsDataArea = this.getDataAreaDom("skills");
        const ul = skillsDataArea?.querySelector("ul");
        if (!ul) return this;
        ul.innerHTML = "";
        (skillsDataArea.dataset.skills || "").split(" ").filter(Boolean).forEach(id => ul.append(this.createSkillCard(id)));
        return this;
    }
    #listenSkills() {
        const skillsDataArea = this.getDataAreaDom("skills");
        const searchInput = skillsDataArea.querySelector("ruby>[contenteditable]");
        const searchInputManager = this.createEditableElementManager("skillsSearch", searchInput);
        const search = skillsDataArea.querySelector("ruby>span");
        searchInputManager.inputSearch({
            searchCallback: (e, { filter, keyWords }) => {
                this.triggerEvent("searchSkill", { from: skillsDataArea, toggleNav: true, keyWords, filter });
            },
            associated: {
                element: search,
                listenerType: "pointerup"
            }
        });
        skillsDataArea.addEventListener("requestUseSkill", (e) => {
            const { from: node } = e.detail;
            this.addSkill(node);
        });
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
            skillsDataArea.addEventListener(event, e => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });
        skillsDataArea.addEventListener("drop", e => {
            const id = e.dataTransfer.getData("text");
            /**
             * @type {HTMLNonameFocusUIElement}
             */
            const node = document.getElementById(id);
            if (!node) return;
            //侧栏技能草稿卡带了来源标记 → **复制一份**进技能栏：把草稿列表那一行搬走的话侧栏就少一条，
            //而且那一行还要继续用来打开/删除草稿。搜索页的技能卡没有标记，照旧把卡搬进来。
            if (e.dataTransfer.getData("application/x19d6-skill-source")) {
                const skillId = node.getAttribute?.("skill-id");
                if (skillId) this.addSkill(skillId);
                return;
            }
            this.addSkill(node);
        });
        skillsDataArea.addEventListener("removeCard", (e) => {
            const { from: node } = e.detail;
            this.removeSkill(node)
        })
    }
    /**
     * 珠联璧合列表专用的**紧凑武将卡**（组件的 `compact` 形态）。
     * 直接把搜索卡片搬进列表，会把「整张卡」（立绘 + 死亡语音 + 内嵌技能卡）一起带进来，撑满右栏。
     * @param {string} id
     * @param {object} [snapshot] 来源卡片的 characterInfo（草稿 id 不在 lib 里时兜底）
     * @returns {HTMLElement}
     */
    createPerfectPairCard(id, snapshot) {
        const card = document.createElement("character-info-card");
        card.setAttribute("character-id", id);
        card.setAttribute("compact", true);
        card.setAttribute("removable", true);
        card.characterInfo = this.infoQuery("character", { characterId: id })
            || snapshot
            || { id, name: this.textQuery("characterTranslation", { attr: "name", text: id }) || id };
        return card;
    }
    addPerfectPairCharacter(arg) {
        const perfectPairDataArea = this.getDataAreaDom("perfectPair");
        const ul = perfectPairDataArea.querySelector("ul");
        let id, snapshot;
        if (arg instanceof HTMLElement && arg.tagName === "CHARACTER-INFO-CARD") {
            //搜索/侧栏卡片带 characterInfo 访问器字段，作为草稿 id 不在 lib 里时的兜底
            id = arg.getAttribute("character-id");
            snapshot = arg.characterInfo;
        } else if (typeof arg === "string" && arg.trim().length !== 0) {
            id = arg;
        } else return;
        if (!id || id === this.getData("id")) return;
        if ((perfectPairDataArea.dataset.perfectPair || "").split(" ").includes(id)) return;
        //一律重建紧凑卡，不搬运原节点（否则 usefor/拖拽态与整张卡的渲染会一起被搬进来）
        ul.append(this.createPerfectPairCard(id, snapshot));
        this.changeData("perfectPair", id, { mode: "append" });
    }
    removePerfectPairCharacter(arg) {
        const perfectPairDataArea = this.getDataAreaDom("perfectPair");
        const ul = perfectPairDataArea.querySelector("ul");
        let id, node;
        if (arg instanceof HTMLElement) {
            node = arg;
            id = node.getAttribute("character-id");
        } else if (typeof arg === "string" && arg.trim().length !== 0) {
            id = arg;
            node = ul.querySelector("[character-id=" + id + "]");
        } else return;
        node?.remove?.();
        this.changeData("perfectPair", id, { mode: "remove" });
    }
    renderPerfectPair() {
        const perfectPairDataArea = this.getDataAreaDom("perfectPair");
        const ul = perfectPairDataArea.querySelector("ul");
        ul.innerHTML = "";
        const ids = (perfectPairDataArea.dataset.perfectPair || "").split(" ").filter(Boolean);
        ids.forEach(id => ul.append(this.createPerfectPairCard(id)));
    }
    #listenPerfectPair() {
        const perfectPairDataArea = this.getDataAreaDom("perfectPair");
        const searchInput = perfectPairDataArea.querySelector("ruby>[contenteditable]");
        const searchInputManager = this.createEditableElementManager("perfectPairSearch", searchInput);
        const search = perfectPairDataArea.querySelector("ruby>span");
        searchInputManager.inputSearch({
            searchCallback: (e, { filter, keyWords }) => {
                this.triggerEvent("searchCharacter", { from: perfectPairDataArea, toggleNav: true, keyWords, filter });
            },
            associated: {
                element: search,
                listenerType: "pointerup"
            }
        });
        perfectPairDataArea.addEventListener("requestUseSkill", (e) => {
            const { from: node } = e.detail;
            this.addPerfectPairCharacter(node);
        });
        ["dragenter", "dragover", "dragleave", "drop"].forEach(event => {
            perfectPairDataArea.addEventListener(event, e => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });
        perfectPairDataArea.addEventListener("drop", e => {
            const id = e.dataTransfer.getData("text");
            const node = document.getElementById(id);
            if (!node) return;
            this.addPerfectPairCharacter(node);
        });
        perfectPairDataArea.addEventListener("removeCard", (e) => {
            const { from: node } = e.detail;
            this.removePerfectPairCharacter(node);
        });
    }
    changeMoreSetting(attrName, val) {
        const moreDataArea = this.getDataAreaDom("more");
        const attr = "data-" + this.textQuery("formatTransfer", { text: attrName, to: "kebab" })
        switch (val) {
            case false: {
                moreDataArea.removeAttribute(attr);
            }; break;
            case true: {
                moreDataArea.setAttribute(attr, true);
            }; break;
            case undefined: case null: {
                moreDataArea.hasAttribute(attr) ?
                    moreDataArea.removeAttribute(attr) :
                    moreDataArea.setAttribute(attr, true);
            }; break;
            default: {
                moreDataArea.setAttribute(attr, val);
            }; break;
        }
    }
    #listenMore() {
        const moreDataArea = this.getDataAreaDom("more");
        const options = moreDataArea.querySelectorAll("ul li.checkbox");
        const manager = this.createMultipleChoiceManager("more", ...options)
            .listenAllNodes("pointerup")
            .setCallback((type, target, funMap) => {
                if (!target) return;
                funMap.forClass("chosen");
                //按回调类型显式置位/清除：不传第二个参数会走 changeMoreSetting 的 undefined 分支**取反**，
                //同一个节点被 select 两次（比如拖两次同一个技能）反而会把刚勾上的标记又取消掉
                this.changeMoreSetting(target.dataset.moreOption, type !== "delete");
            });
    }
    introStandardize(html) {
        const parser = new DOMParser();
        const tempDoc = parser.parseFromString(html, "text/html");
        tempDoc.normalize();
        tempDoc.body.querySelectorAll("br").forEach(br => {
            if (br.previousSibling) {
                const p = document.createElement();
                p.innerHTML = br.previousSibling.innerHTML || br.previousSibling.textContent;
                br.previousSibling.replaceWith(p);
            }
            if (br.nextSibling) {
                const p = document.createElement();
                p.innerHTML = br.previousSibling.innerHTML || br.nextSibling.textContent;
                br.nextSibling.replaceWith(p);
            }
        })
        if (!tempDoc.body.matches("p")) {
            const p = document.createElement("p");
            p.innerHTML = tempDoc.body.innerHTML;
            tempDoc.body.replaceChildren(p);
        }
        return tempDoc.body.innerHTML;
    }
    setIntro(html) {
        const introDataArea = this.getDataAreaDom("intro");
        const introParagraph = introDataArea.querySelector("p");
        if (html && introParagraph.dataset.defaultIntro !== html) {
            introParagraph.classList.remove("use-default");
            introParagraph.innerHTML = html;
        } else {
            introParagraph.classList.add("use-default");
            introParagraph.innerHTML = "";
            html = "";
        }
        this.changeData("intro", html);
    }
    #listenIntro() {
        const introDataArea = this.getDataAreaDom("intro");
        const editButton = introDataArea.querySelector(".edit");
        const defaultEditButton = introDataArea.querySelector(".edit-default")
        editButton.addEventListener("pointerup", async (e) => {
            const dialog = document.createElement("noname-dialog");
            const noPElementHTML = this.getData("intro");
            dialog.setAttribute("type", "text");
            if (noPElementHTML) dialog.setAttribute("message", this.introStandardize(noPElementHTML));
            this.shadowRoot.append(dialog);
            this.appendChildViaSlot(dialog, "dialogText");
            const result = await dialog.wait();
            if (result !== false) {
                const html = result.noPElementHTML.trim();
                this.setIntro(html);
            }
        });
        defaultEditButton.addEventListener("pointerup", async () => {
            const dialog = document.createElement("noname-dialog");
            const noPElementHTML = this.getData("default-intro");
            dialog.setAttribute("type", "text");
            if (noPElementHTML) dialog.setAttribute("message", this.introStandardize(noPElementHTML));
            this.shadowRoot.append(dialog);
            this.appendChildViaSlot(dialog, "dialogText");
            const result = await dialog.wait();
            if (result !== false) {
                const html = result.noPElementHTML.trim();
                this.setIntro(html);
            }
        })
    }
    #listenExpanable() {
        this.shadowRoot.querySelectorAll("[class^=expandable]").forEach(node => {
            const linkedNodes = this.shadowRoot.querySelectorAll(`[data-by=${node.dataset.for}]`)
            node.addEventListener("pointerup", () => {
                if (node.classList.contains("expandable-expanded")) {
                    node.classList.remove("expandable-expanded");
                    node.classList.add("expandable-collapsed");
                    linkedNodes.forEach(linkedNode => {
                        if (!linkedNode.classList.contains("hidden")) linkedNode.classList.add("hidden");
                    })
                } else if (node.classList.contains("expandable-collapsed")) {
                    node.classList.remove("expandable-collapsed");
                    node.classList.add("expandable-expanded");
                    linkedNodes.forEach(linkedNode => {
                        if (linkedNode.classList.contains("hidden")) linkedNode.classList.remove("hidden");
                    })
                }
            })
        })
    }
    /**
     * @typedef {"extension"|"packageId"|"avatar"|"dieAudios"|"hp"|"maxHp"|"hujia"|"pinyin"|"name"|"sex"|"group"|"id"|"clans"|"skills"|"isZhugong"|"intro"} dataType
     */
    /**
     * @param {dataType} type 
     * @returns {HTMLElement}
     */
    /**
     * 武将称号输入：失焦或回车时写入（changeData 会触发草稿自动保存）
     */
    #listenTitle() {
        const input = this.shadowRoot.querySelector("[data-title] .title-input");
        if (!input) return;
        const submit = () => this.changeData("title", input.innerText.trim());
        input.addEventListener("blur", submit);
        input.addEventListener("keyup", e => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            input.blur();
        });
    }
    /**
     * 主区标签栏用的标题（武将：id）
     * @returns {string}
     */
    getTabTitle() {
        const label = this.getData("id") || this.getData("name");
        const seq = this.draftSeq;
        const suffix = seq ? ` #${seq}` : "";
        return label ? `武将：${label}${suffix}` : `武将：未命名${suffix}`;
    }
    /**
     * 草稿编号（唯一键）。挂在 `draft-key` 属性上：侧栏列表、标签页去重、持久化都以它为准。
     * @returns {string}
     */
    get draftKey() {
        return this.getAttribute("draft-key") || "";
    }
    set draftKey(value) {
        if (value) this.setAttribute("draft-key", value);
        else this.removeAttribute("draft-key");
    }
    /**
     * 编号里的序号（`draft-7` → `7`）
     * @returns {string}
     */
    get draftSeq() {
        return (this.draftKey.match(/^draft-(\d+)$/) || [])[1] || "";
    }
    /**
     * 分配一个新草稿编号。草稿以编号为唯一键、**武将 id 只是数据字段**——
     * 这样在编辑器里改 id 不会再另存成一份新草稿（踩过：改一次拼音，侧栏就多出一个「武将」）。
     * @returns {string} 形如 `draft-7`
     */
    createDraftKey() {
        const seq = (Number(this.configQuery("get", { member: "x19D6_editor.draftSeq" })) || 0) + 1;
        this.configQuery("write", { member: "x19D6_editor.draftSeq", value: seq });
        return `draft-${seq}`;
    }
    /** 标题相关数据变了 → 冒泡通知主区标签栏刷新 */
    notifyTabTitle() {
        this.triggerEvent("tabTitleChange");
    }
    getDataAreaDom(type) {
        return this.shadowRoot.querySelector(`[data-${this.textQuery("formatTransfer", { to: "kebab", text: type })}]`)
    }
    /**
     * @param {dataType} type 
     * @param {any} val 
     */
    changeData(type, val, config) {
        if (!type) return;
        type = this.textQuery("formatTransfer", { text: type, to: "camel" });
        //数组一律先折成空格串：dataset 是 DOMStringMap，赋数组会被 String() 成 `a,b`，
        //而 `getData` 是按**空格**拆的 —— 多势力 / 宗族 / 阵亡语音载入后就成了 `wei,shu` 这种脏值，
        //再存一次就把记录永久写坏（载入草稿时踩过）。
        if (Array.isArray(val)) val = val.join(" ");
        switch (type) {
            case "name": {
                this.getDataAreaDom("name").dataset["name"] = val;
                this.style.setProperty("--data-name", `'${val}'`);
                this.notifyTabTitle();
            }; break;
            case "id": {
                this.getDataAreaDom("id").dataset["id"] = val;
                this.style.setProperty("--data-id", `'${val}'`);
                this.notifyTabTitle();
            }; break;
            case "pinyin": {
                this.getDataAreaDom("pinyin").dataset["pinyin"] = val;
                this.style.setProperty("--data-pinyin", val == "" ? "" : `'(${val})'`);
            }; break;
            case "sex": {
                this.getDataAreaDom("sex").dataset["sex"] = val;
                this.style.setProperty("--data-sex", `'${this.textQuery("characterTranslation", { attr: type, text: val })}'`);
            }; break;
            case "clans": case "clan": {
                this.getDataAreaDom("clans").dataset["clans"] = val;
                this.style.setProperty("--data-clans", `'${val}'`);
            }; break;
            case "hp": case "maxHp": case "hujia": {
                if (typeof val !== "number" || Number.isNaN(val)) return false;
                this.getDataAreaDom(type).dataset[type] = val;
                this.style.setProperty("--data-" + type, val == Infinity ? "'∞'" : `'${val}'`);
            }; break;
            case "skills": {
                const skillsDataArea = this.getDataAreaDom("skills");
                if (!skillsDataArea) break;
                const current = () => (skillsDataArea.dataset[type] || "").split(" ").filter(Boolean);
                let skills;
                if (config.mode === "append") {
                    skills = current().concat(String(val || "").split(" ").filter(Boolean));
                    skillsDataArea.dataset[type] = skills.join(" ");
                } else if (config.mode === "remove") {
                    skills = current().filter(skill => skill && skill !== val);
                    skillsDataArea.dataset[type] = skills.join(" ");
                } else {
                    //技能栏是空的，400ms 后的自动保存再按空值重建记录 → 草稿里的技能被抹掉（用户反馈的事故）。
                    skills = String(val || "").split(" ").filter(Boolean);
                    skillsDataArea.dataset[type] = skills.join(" ");
                }
                this.style.setProperty(
                    "--data-skills",
                    `"${skills.map(skill => this.textQuery("skillTranslation", { text: skill, attr: "name" })).join("，")}"`
                );
            }; break;
            case "perfectPair": {
                const perfectPairDataArea = this.getDataAreaDom("perfectPair");
                if (config.mode === "append") {
                    perfectPairDataArea.dataset[type] = perfectPairDataArea.dataset[type].split(" ").filter(Boolean).concat(val).join(" ");
                } else if (config.mode === "remove") {
                    perfectPairDataArea.dataset[type] = perfectPairDataArea.dataset[type].split(" ").filter(id => id && id !== val).join(" ");
                } else if (config.mode === "rewrite" || config.mode === "replace") {
                    if (Array.isArray(val)) {
                        perfectPairDataArea.dataset[type] = val.join(" ");
                    } else {
                        perfectPairDataArea.dataset[type] = val;
                    }
                }
            }; break;
            case "avatar": {
                this.getDataAreaDom(type).dataset[type] = val;
                this.style.setProperty("--data-" + type, `url(${val})`);
            }; break;
            default: {
                const target = this.getDataAreaDom(type);
                if (target) target.dataset[type] = val;
            }; break;
        }
        //回填草稿期间不排保存（见 #applyingData）：载入不是编辑，没回填到的字段不该被写回记录
        if (!this.#applyingData) this.scheduleSaveDraft();
    }
    /**
     * 草稿自动保存：字段级防抖，落库到 lib.config.x19D6_editor.characters.<id>
     */
    scheduleSaveDraft() {
        if (this.#saveTimer) clearTimeout(this.#saveTimer);
        this.#saveTimer = setTimeout(() => {
            this.#saveTimer = null;
            this.saveDraft();
        }, 400);
    }
    /**
     * 立即把当前武将草稿写入配置（切页/关闭/导出前调用）
     * @returns {boolean}
     */
    saveDraft() {
        if (this.#saveTimer) {
            clearTimeout(this.#saveTimer);
            this.#saveTimer = null;
        }
        //草稿以「编号」为唯一键：改武将 id 只是改字段，不会另存成新草稿
        const data = this.getAllData();
        //空表单（没编号、没 id、没名字）不落库，避免点开就多一堆空草稿
        if (!this.draftKey && !data.id && !data.name) return false;
        if (!this.draftKey) this.draftKey = this.createDraftKey();
        data.savedAt = Date.now();
        this.configQuery("write", { member: `x19D6_editor.characters.${this.draftKey}`, value: data });
        //通知外壳：草稿变了 → 把武将/包/分包重新落盘到扩展入口
        this.triggerEvent("draftSaved", { draftKey: this.draftKey });
        return true;
    }
    flushDraft() {
        return this.saveDraft();
    }

    /**
     * 把一份草稿数据回填到界面。
     * ⚠️ `changeData` 只写 `dataset` 与 CSS 变量——contenteditable 输入框的**文字**、选项的 `chosen` 高亮、
     * 体力/护甲的数字框都不会因此变化，所以这里额外同步一遍（踩过：打开草稿后界面看着是空的，其实数据在）。
     * @param {object} data
     */
    applyData(data) {
        if (!data) return this;
        //⚠️ 回填期间禁止排自动保存（见 `#applyingData` 的说明）：载入不是编辑，
        //这一轮里没被回填到的字段不该被 400ms 后的保存当成「用户清空了」写回记录 —— 技能就是这么丢的。
        const restoring = !this.#applyingData;
        this.#applyingData = true;
        try {
            const attributes = this.characterAttributes;
            for (const attr of attributes) {
                if (!(attr in data)) continue;
                this.changeData(attr, data[attr], { mode: "replace" });
            }
            //列表类字段的卡片是 DOM：`changeData` 只写 dataset 与 CSS 变量，这里必须重建一遍
            this.renderSkills();
            this.renderPerfectPair();
            this.renderDieAudios();
            //文字输入框（姓名 / 拼音 / id）
            this.syncTextInputs();
            //选中态：必须走选择管理器的 choose()——只写 class 的话管理器内部状态还是空的，
            //于是第一次点别的选项时它不知道要摘掉旧的那个（用户反馈：第一次无法切换宗族）
            this.restoreChoice("sex", this.sexChoiceManager, data.sex);
            this.restoreChoice("group", this.groupChoiceManager, data.group);
            this.restoreChoice("clans", this.clanChoiceManager, data.clans);
            //宗族管理器是**单选**的，而 `clans` 在记录里可以是数组：单选回填会把 dataset 收窄成选中的那一个，
            //多宗族草稿于是会在下一次保存时被静默截断 —— 按记录原样写回
            if (Array.isArray(data.clans) && data.clans.length > 1) this.changeData("clans", data.clans);
            //「多势力」的勾选态也在多选管理器里（同 restoreMoreSettings 的理由）
            this.restoreDoubleGroup(data.doubleGroup);
            //「更多设置」的勾选态（主公技/隐藏技/BOSS…）：见 restoreMoreSettings 的说明
            this.restoreMoreSettings(data);
            if (data.groupName) this.setGroup({ groupId: data.group, groupName: data.groupName });
            //顶部「所属分包」那行用的是 CSS 变量，载入时同样要设
            if (data.extension) this.style.setProperty("--data-extension", `"${data.extension}"`);
            if (data.packageId) this.style.setProperty("--data-package-id", `"${lib.translate[data.packageId + "_character_config"] || data.packageId}"`);
            if (data.characterSortName) this.style.setProperty("--data-character-sort", `"${data.characterSortName}"`);
            //立绘：getAllData 会把 avatar 挪进 trashBin（ext: 路径），草稿里没有 avatar 字段，所以从这里恢复
            this.loadedTrashBin = Array.isArray(data.trashBin) ? data.trashBin.slice() : [];
            if (data.avatar) this.avatarReference = data.avatar;
            this.syncAvatarFromTrashBin(data.trashBin, data);
            console.log(data, "maxHp" in data, data.hp);
            //体力 / 体力上限 / 护甲的数字框与旁边的血/甲格
            if ("maxHp" in data) this.restoreMaxHp(data.maxHp)
            else this.restoreMaxHp(data.hp)
            this.restoreHp(data.hp)
            this.restoreHujia(data.hujia)
        } finally {
            if (restoring) this.#applyingData = false;
        }
        return this;
    }
    /**
     * 回填姓名 / 拼音 / id 的 contenteditable 文字（与当前值相同就不写，免得把 MutationObserver 点着）
     */
    syncTextInputs() {
        const nameArea = this.getDataAreaDom("name");
        if (nameArea) {
            const nameInput = nameArea.querySelector('ruby[data-by="name"]>div');
            const pinyinInput = nameArea.querySelector('ruby[data-by="name"]>rt');
            const name = String(this.getData("name") ?? "");
            const pinyin = this.getData("pinyin");
            const pinyinText = Array.isArray(pinyin) ? pinyin.filter(Boolean).join("") : String(pinyin ?? "");
            if (nameInput && nameInput.textContent !== name) nameInput.textContent = name;
            if (pinyinInput && pinyinText && pinyinInput.textContent !== pinyinText) pinyinInput.textContent = pinyinText;
        }
        const idArea = this.getDataAreaDom("id");
        if (idArea) {
            const idInput = idArea.querySelector('ruby[data-by="id"]>div');
            const id = String(this.getData("id") ?? "");
            if (idInput && idInput.textContent !== id) idInput.textContent = id;
        }
    }

    /**
     * 恢复选项选中态。**必须走选择管理器的 `choose()`**：只写 `chosen` 类的话，管理器内部 `chosen` 仍是空的，
     * 第一次点别的选项时它的 `last` 是 undefined，不会摘掉旧的高亮，看着就是「切不过去」（用户反馈的宗族问题）。
     * @param {"sex"|"group"|"clans"} area
     * @param {import("./encapsulated.mjs").UniqueChoiceManager} [manager]
     * @param {string|string[]} values
     * @returns {boolean} 是否恢复到某个选项
     */
    restoreChoice(area, manager, values) {
        const areaDom = this.getDataAreaDom(area);
        if (!areaDom) return false;
        const list = (Array.isArray(values) ? values : [values]).filter(Boolean);
        if (!list.length) return false;
        const config = {
            sex: ["[data-sex-option]", "sexOption"],
            group: ["[data-group-option]", "groupOption"],
            clans: ["[data-clan-option]", "clanOption"]
        }[area];
        if (!config) return false;
        const [selector, key] = config;
        const node = Array.from(areaDom.querySelectorAll(selector)).find(item => list.includes(item.dataset[key]));
        if (!node) return false;
        //已经选中的就别再 choose（可撤销的管理器会把「选同一个」当成取消）
        if (manager && manager.chosen !== node) manager.choose(node);
        else if (!manager) node.classList.add("chosen");
        return true;
    }

    /**
     * 回填「多势力」（`doubleGroup`，dataset 里是空格串）。
     * ⚠️ 同 `restoreMoreSettings`：勾选态在**多选管理器**内部，只写 dataset（`changeData`）界面不会亮；
     * 走 `select()` 才会跑回调 → `setDoubleGroup()` 把 CSS 变量与 dataset 一起写对。
     * @param {string|string[]} values
     * @returns {this}
     */
    restoreDoubleGroup(values) {
        const manager = this.doubleGroupChoiceManager;
        const areaDom = this.getDataAreaDom("group");
        if (!manager || !areaDom) return this;
        manager.reset();
        const nodes = Array.from(areaDom.querySelectorAll("[data-group-option]"));
        const mainGroup = this.groupChoiceManager?.chosen?.dataset?.groupOption;
        //主势力本来就在「势力」单选的选中态里，不进多势力列表（与 removeGroupFromDouble 口径一致）
        const extras = (Array.isArray(values) ? values : String(values || "").split(" "))
            .filter(id => id && id !== mainGroup);
        extras.forEach(id => {
            const node = nodes.find(item => item.dataset.groupOption === id);
            if (node) manager.select(node);
        });
        //管理器回调只在真的选中时才写 dataset，这里兜一次底（没有多势力时必须是空串）
        this.changeData("doubleGroup", extras.length ? [mainGroup, ...extras].filter(Boolean).join(" ") : "");
        //「选择多势力」的勾选态：有多势力就点亮它，否则界面显示成单势力、再点选项会改错目标
        const checkBox = areaDom.querySelector(".checkbox");
        const chosenModeManager = this.getMultipleChocieManager("groupChosenMode");
        if (checkBox && chosenModeManager) {
            if (extras.length) chosenModeManager.select(checkBox);
            else chosenModeManager.unselect(checkBox);
        }
        return this;
    }

    /**
     * 回填「更多设置」的勾选态（主公技 / 隐藏技 / BOSS / 炉石系列标记…）。
     * ⚠️ 不能只靠 `changeData`：它写属性的目标是 `[data-<kebab>]` 节点，而这些标记的宿主属性
     * （`data-is-zhugong` / `data-has-hidden-skill` …）是**点击时**由 `changeMoreSetting` 现挂上去的，
     * 新实例里根本不存在 → `applyData` 的 `changeData("isZhugong", true)` 是空操作，
     * 于是重新打开草稿时这些标记会**静默丢失**（界面不勾选、下次保存就没了）。
     * 走选择管理器：勾选态与属性一次同步（选中会触发回调 → `changeMoreSetting` 落属性）。
     * @param {object} data 草稿数据
     */
    restoreMoreSettings(data) {
        const manager = this.getMultipleChocieManager("more");
        const areaDom = this.getDataAreaDom("more");
        if (!manager || !areaDom) return;
        areaDom.querySelectorAll("li[data-more-option]").forEach(node => {
            const wanted = Boolean(data[node.dataset.moreOption]);
            if (wanted) manager.select(node);
            else manager.unselect(node);
        });
    }
    restoreHp(data) {
        const dHp = data - this.getData("hp");
        dHp > 0 ? this.#addHp(dHp) : this.#removeHp(Math.abs(dHp));
    }
    restoreMaxHp(data) {
        const dMaxHp = data - this.getData("maxHp");
        dMaxHp > 0 ? this.#prependMaxHp(dMaxHp) : this.#removeMaxHp(Math.abs(dMaxHp));

    }
    restoreHujia(data) {
        const hujiaManager = this.getUniqueChoiceManager("hujia");
        hujiaManager.choose(5 - data);
    }
    /**
     * 判断一条 `trashBin` 条目是不是立绘引用。
     * 引擎只认带前缀的条目（`ext:`/`img:`/`db:`/`sex:`…），老数据里也出现过裸路径。
     * @param {string} value
     * @returns {boolean}
     */
    isAvatarReference(value) {
        const text = String(value || "").trim();
        if (!text) return false;
        //引擎的其它 trashBin 标记，不是立绘
        if (/^(sex|des|ruby|tempname|character|mode|db):/i.test(text)) return false;
        const relative = this.stripUrlQuery(text).replace(/^(ext|img):/i, "");
        return /\.(png|jpe?g|gif|webp|bmp|avif|jfif)$/i.test(relative) || /(^|\/)image\//i.test(relative);
    }
    /**
     * 去掉 URL 上的查询串与锚点（`a.png?t=123` → `a.png`）。
     * 显示地址会带 `?t=` 缓存串，而**引用/磁盘路径**必须干净，所有「引用 ↔ 路径」的地方都先过它。
     * @param {string} value
     * @returns {string}
     */
    stripUrlQuery(value) {
        return String(value || "").replace(/[?#].*$/, "");
    }
    /**
     * 显示用地址：给同一个地址补一个 `?t=<时间戳>`。
     * 立绘文件名固定是 `<武将id>.<ext>`，**换图后地址不变** → 浏览器直接命中缓存，界面还是旧图
     * （用户实测：草稿/生成的武将包文件都当轮更新了，画面却不变）。
     * ⚠️ 只加在显示上（`<img src>` 与 `--data-avatar`）；草稿与生成文件里始终是干净的 `ext:<路径>`。
     * @param {string} url
     * @returns {string}
     */
    displayAvatarUrl(url) {
        const text = String(url || "");
        if (!text) return "";
        //blob:/data: 本身就是唯一地址，不需要（也不该）加参数
        if (/^(blob|data):/i.test(text)) return text;
        return `${this.stripUrlQuery(text)}?t=${Date.now()}`;
    }
    /**
     * 把「页面相对」的地址补成「根绝对」地址（`extension/a.png` → `/extension/a.png`）。
     * ⚠️ 立绘地址会被写进 CSS 变量（`changeData("avatar")` 的 `--data-avatar`），而
     * **自定义属性里的相对 URL 是按声明它的样式表 `character-editor.css` 的目录解析的**：
     * 实测请求变成 `/extension/魂氏编辑器/module/editor/style/extension/<工作区>/image/character/x.png` → 404
     * （同一个字符串给 `<img src>` 却按文档根解析、能正常显示 —— 所以只有控制台报 404、画面看着没毛病）。
     * 引擎本体的 `lib.assetURL` 就是空串（`noname/util/index.js:2`），这个 `/` 只能自己补。
     * @param {string} value
     * @returns {string}
     */
    rootUrl(value) {
        const text = String(value || "").trim();
        if (!text || text.startsWith("/")) return text;
        //blob:/data:/http:/file:/ext:/img:/db: 自带基址，原样返回
        if (/^[a-z][a-z0-9+.-]*:/i.test(text)) return text;
        return `/${text}`;
    }
    /**
     * `ext:<工作区相对路径>` / `/extension/…` / `<工作区相对路径>` → `<工作区相对路径>`
     * @param {string} reference
     * @returns {string}
     */
    referenceRelative(reference) {
        const text = this.stripUrlQuery(reference).trim();
        if (!text || /^(blob|data|https?|file|img|db):/i.test(text)) return "";
        return text.replace(/^ext:/i, "").replace(/^\/?extension\//, "");
    }
    /**
     * 立绘引用 → `<img>` 能加载的地址（**带 `?t=` 缓存串**，见 `displayAvatarUrl()`）。
     * `ext:` 是引擎的扩展素材约定（工作区相对路径）；`img:`/`db:` 是引擎的其它来源，
     * 编辑器不产生它们、也不去猜拼法 → 返回 ""（不显示，但保存时仍原样保留）。
     * @param {string} reference
     * @returns {string}
     */
    referenceUrl(reference) {
        const text = String(reference || "").trim();
        if (!text) return "";
        if (/^(blob|data|https?|file):/i.test(text)) return text;
        const relative = this.referenceRelative(text);
        if (!relative) return "";
        //⚠️ assetURL 为空串时**必须**补根路径 `/`：这个地址会被写进 CSS 变量（`--data-avatar`），
        //而 CSS 变量里的相对 URL 按 character-editor.css 的目录解析 → 请求 `…/style/extension/…` 404
        //（详见 rootUrl()）。assetURL 非空（file:///…）时只需保证它自带结尾的 `/`。
        const base = String(lib.assetURL || "");
        const prefix = base ? (base.endsWith("/") ? base : `${base}/`) : "/";
        return this.displayAvatarUrl(`${prefix}extension/${relative}`);
    }
    /**
     * 归一成草稿 `trashBin` 里该写的 `ext:` 路径。
     * `blob:`/`data:` 是页内临时 URL（刷新即失效）→ 一律不写进草稿（踩过：裁剪后草稿里只剩 blob:xxx）。
     * @param {string} value
     * @returns {string}
     */
    toExtReference(value) {
        //显示地址带 `?t=`（见 displayAvatarUrl）→ 写进草稿前必须剥掉，别把时间戳存进 ext: 路径
        const text = this.stripUrlQuery(value).trim();
        if (!text || /^(blob|data):/i.test(text)) return "";
        if (text.startsWith("ext:")) return text;
        if (/^(https?|file):/i.test(text)) {
            const matched = /\/extension\/(.+)$/.exec(text);
            return matched ? `ext:${matched[1]}` : "";
        }
        return this.pathQuery("changeToExtPath", { path: text });
    }
    /**
     * 从草稿里挑一个立绘引用：`trashBin` 的图片条目 → 旧的 `avatar` 字段。
     * `ext:` 优先（编辑器与引擎的约定），其次 `img:`，最后裸路径。
     * @param {string[]} [trashBin]
     * @param {object} [record]
     * @returns {string}
     */
    pickAvatarReference(trashBin, record = {}) {
        const entries = (Array.isArray(trashBin) ? trashBin : []).filter(item => this.isAvatarReference(item));
        const rank = value => (value.startsWith("ext:") ? 0 : value.startsWith("img:") ? 1 : 2);
        const ranked = entries.slice().sort((a, b) => rank(a) - rank(b));
        if (ranked.length) return ranked[0];
        const legacy = record && (record.avatar || record.img);
        return legacy ? String(legacy) : "";
    }
    /**
     * 扫描立绘目录，按武将 id 找回磁盘上已有的图（`<立绘目录>/<id>.<ext>`）。
     * 兜底自愈用：老数据被写坏成空 `trashBin` 时，文件其实还在磁盘上（用户反馈的场景）。
     * @param {string} id
     * @returns {Promise<string>} `ext:<工作区相对路径>`；找不到返回 ""
     */
    async findAvatarOnDisk(id) {
        const base = String(id || "").trim();
        if (!base || !this.workspace) return "";
        const dir = this.assetDir("extension-character-image");
        if (!dir) return "";
        try {
            const [, files] = await this.fileQuery("readFolder", { path: `extension/${dir}` });
            const candidates = (Array.isArray(files) ? files : []).filter(name => name.replace(/\.[^.]+$/, "") === base);
            //同名文件可能有多个（换过后缀），**0 字节/读不出来的要跳过**，否则又挑到坏图
            for (const name of candidates) {
                if (await this.isUsableAsset(`${dir}/${name}`)) return `ext:${dir}/${name}`;
            }
            return "";
        } catch (err) {
            console.warn("立绘目录扫描失败", dir, err);
            return "";
        }
    }
    /**
     * 素材文件是否「存在且非空」。
     * ⚠️ 只判「文件在不在」不够：写入载荷用错类型会留下 **0 字节**文件，界面上就是
     * 「有重置/裁剪按钮，但图片区域一片空白」（2026-10 踩过：裁剪结果用 Blob 写 → 0 字节）。
     * @param {string} relative 工作区相对路径
     * @returns {Promise<boolean>}
     */
    async isUsableAsset(relative) {
        const path = `extension/${this.stripUrlQuery(relative)}`;
        const fs = lib.node?.fs;
        const base = typeof window !== "undefined" ? window.__dirname : "";
        if (fs?.statSync && base) {
            try {
                const stat = fs.statSync(`${base}/${path}`);
                return Boolean(stat.isFile?.() ?? true) && stat.size > 0;
            } catch (err) {
                return false;   //文件不存在 / 读不到
            }
        }
        //网页端没有 fs：退化成读一遍（读得到且非空就算可用）
        try {
            const content = await this.fileQuery("readBinaryFile", { path });
            return (content?.length ?? content?.byteLength ?? 0) > 0;
        } catch (err) {
            return false;
        }
    }
    /**
     * 把立绘引用显示到界面上（`.done` + `--data-avatar` + `<img>`）。
     * @param {string} reference
     * @returns {boolean}
     */
    showAvatar(reference) {
        const relative = this.referenceRelative(reference);
        const url = this.referenceUrl(reference);
        if (!url) return false;
        this.reloadAvatar(url);
        //地址兜底：`lib.assetURL` 拼出来的地址不一定能加载（空串 / file:///… 两种都可能），
        //加载失败就退回 `/extension/…`（选图时用的就是这个形式，游戏里 `/` 相对 app 根）
        if (relative) {
            const img = this.getDataAreaDom("avatar").querySelector(".avatar-view img");
            img.onerror = () => {
                img.onerror = null;
                const fallback = this.displayAvatarUrl(`/extension/${relative}`);
                console.warn("立绘加载失败，改用 app 根路径重试", url, fallback);
                img.src = fallback;
                this.changeData("avatar", fallback);
            };
        }
        return true;
    }
    /**
     * 从草稿里恢复立绘。
     * 顺序：`trashBin` 的图片条目 → 旧的 `avatar` 字段 → **磁盘上按武将 id 命名的文件**。
     * 最后一条是自愈兜底：老数据被写坏成空 `trashBin` 时，文件还在磁盘上，靠扫目录认回来
     * （用户实测：图在 `image/character/` 里，重新打开编辑器却不显示）。
     * @param {string[]} [trashBin]
     * @param {object} [record] 整条草稿（取 legacy 的 `avatar` / `id`）
     * @returns {Promise<boolean>}
     */
    async syncAvatarFromTrashBin(trashBin, record = {}) {
        try {
            let reference = this.pickAvatarReference(trashBin, record);
            let fromDisk = false;
            if (!reference) {
                reference = await this.findAvatarOnDisk((record && record.id) || this.getData("id"));
                fromDisk = Boolean(reference);
            }
            if (!reference || this.avatarCleared) return false;
            //引用的文件被删/被写成 0 字节时不能硬显示：那会留下「有重置/裁剪按钮，但图是空白」的假状态。
            //先找同 id 的可用文件（换过后缀时能救回），实在没有就清掉这条坏引用，让占位提示回来。
            const relative = this.referenceRelative(reference);
            if (relative && !(await this.isUsableAsset(relative))) {
                const healed = await this.findAvatarOnDisk((record && record.id) || this.getData("id"));
                if (healed) {
                    reference = healed;
                    this.storedAvatarReference = healed;
                    this.avatarReference = healed;
                    return this.showAvatar(healed);
                }
                console.warn("立绘文件不可用（缺失或 0 字节），已忽略这条引用", relative);
                this.storedAvatarReference = "";
                this.avatarReference = "";
                this.avatarCleared = true;   //下一次保存把这条坏引用从草稿里清掉
                return false;
            }
            this.storedAvatarReference = reference;
            if (fromDisk) this.avatarReference = reference;
            return this.showAvatar(reference);
        } catch (err) {
            console.warn("恢复立绘失败", err);
            return false;
        }
    }
    /**
     * 按裁剪框裁一张静态立绘并落盘。
     * 几何一律用 `getBoundingClientRect()` 现算（那才是浏览器实际布局），缩放率**统一按高度**
     * —— `clipStaticImg(useClientData:true)` 那种「两个轴各除一个 rate」的算法，
     * 一旦 img 被拉伸（两个 cover 类同时在场）就会剪错区域；图片没解码出来时还会算出 Infinity/NaN，
     * 最后 `createObjectURL(null)` 抛错、编辑态留在界面上（用户看到的「裁剪后显示异常」）。
     * @param {HTMLImageElement} img
     * @param {HTMLElement} cutter
     * @param {string} [imgType] 源图 MIME（拿不到就按 png）
     * @returns {Promise<string>} 落盘后的引用；失败抛错（调用方负责提示 + 退出编辑态）
     */
    async clipStaticAvatar(img, cutter, imgType) {
        if (!img?.naturalWidth || !img?.naturalHeight) {
            throw new Error("图片还没解码出来（naturalWidth 为 0），等它显示出来再裁剪");
        }
        const imgRect = img.getBoundingClientRect(),
            cutterRect = cutter.getBoundingClientRect();
        const scale = imgRect.height / img.naturalHeight;
        if (!Number.isFinite(scale) || scale <= 0) throw new Error("算不出裁剪比例（图片没显示出来？）");
        const x = (cutterRect.left - imgRect.left) / scale,
            y = (cutterRect.top - imgRect.top) / scale,
            width = cutterRect.width / scale,
            height = cutterRect.height / scale;
        if (!(width >= 1 && height >= 1)) throw new Error(`裁剪框太小（${Math.round(width)}×${Math.round(height)} 像素）`);
        console.log("裁剪：", {
            natural: `${img.naturalWidth}×${img.naturalHeight}`,
            shown: `${Math.round(imgRect.width)}×${Math.round(imgRect.height)}`,
            cutter: `${Math.round(cutterRect.width)}×${Math.round(cutterRect.height)}`,
            source: `${Math.round(x)},${Math.round(y)} ${Math.round(width)}×${Math.round(height)}`
        });
        const cropped = await this.multiMediaQuery("staticImgClip", {
            img,
            x, y, width, height,
            dataForm: "blobURL",
            type: imgType || "image/png",
            //上面给的就是**原图像素**坐标 → 不要再让它除一次 rate
            useClientData: false
        });
        if (!cropped) throw new Error("裁剪没有产出图片");
        this.reloadAvatar(cropped);
        const saved = await this.saveCroppedAvatar(cropped);
        if (!saved) throw new Error("裁剪结果没能落盘");
        return saved;
    }
    /**
     * 裁剪结果落盘（同名覆盖），让草稿里始终是 `ext:` 引用。
     * 不落盘的话草稿只会记下 `blob:` URL：引擎不认、刷新即失效 → 「裁剪一次，原画就回不来了」。
     * @param {string} url 裁剪结果（`blob:` URL）
     * @returns {Promise<string>} 落盘后的引用；失败返回 ""
     */
    async saveCroppedAvatar(url) {
        if (!/^blob:/i.test(String(url || ""))) return "";
        const reference = this.avatarReference || this.storedAvatarReference;
        const relative = this.referenceRelative(reference);
        if (!relative) return "";
        try {
            const blob = await (await fetch(url)).blob();
            //⚠️ 空图绝不能落盘：以前这里直接用 Blob 写，引擎会写成 0 字节文件、把立绘直接毁掉
            if (!blob.size) throw new Error("裁剪结果是空图");
            //引擎只对 `[object File]` 走 FileReader（Blob 会被 `new Uint8Array(blob)` 写成空文件）→ 包成 File
            const file = new File([blob], this.imageFileName(reference, blob.type), { type: blob.type || "image/png" });
            await this.fileQuery("writeFile", { path: `extension/${relative}`, data: file });
            this.avatarReference = reference;
            this.storedAvatarReference = reference;
            this.avatarCleared = false;
            //落盘后界面改回**文件地址**，且要走 showAvatar()：
            //这样 <img> 的加载失败兜底（assetURL 拼不出来时退回 /extension/…）也能顺带修正 CSS 背景
            this.showAvatar(reference);
            return reference;
        } catch (err) {
            //提示与界面回退交给调用方（clipStaticAvatar 的 catch）统一做
            console.warn("裁剪结果落盘失败", relative, err);
            return "";
        }
    }
    /**
     * 处理「非文件」的原画拖入：搜索到的原画卡（`skin-info-card`）、武将卡、网页上的一张图。
     * 拿到图片地址后走**与本地选图同一条落盘链路**（`saveLocalAsset`）——目录配置、
     * `<武将id>.<ext>` 命名、与草稿同生共死全都一致。
     * @param {DataTransfer} [dataTransfer]
     * @returns {Promise<{reference: string, type: string}|null>}
     */
    async loadDroppedAvatar(dataTransfer) {
        const url = this.readDroppedImageUrl(dataTransfer);
        if (!url) return null;
        if (!this.workspace) {
            alert("请先在设置页选择工作区。");
            return null;
        }
        try {
            const blob = await this.fetchImageBlob(url);
            if (!blob || !blob.size) throw new Error("读到的图片是空的");
            const type = blob.type || this.imageTypeFromUrl(url) || "image/png";
            const file = new File([blob], this.imageFileName(url, type), { type });
            const reference = await this.saveLocalAsset(file, "extension-character-image");
            if (!reference) return null;
            this.avatarReference = reference;
            this.storedAvatarReference = reference;
            this.avatarCleared = false;
            if (!this.showAvatar(reference)) return null;
            return { reference, type };
        } catch (err) {
            console.warn("原画区：拖入的图片落盘失败", url, err);
            alert(`这张图没能存进扩展：${url}\n${(err && err.message) || err}\n（也可以先把图片保存到本地，再拖进原画区）`);
            return null;
        }
    }
    /**
     * 从 `drop` 载荷里读出**图片地址**：拖卡片（沿用技能区/珠联璧合区那套 `chosen-card` 约定）、
     * 拖 `<img>`、拖网页上的图都会进这里。取不到返回 ""。
     * @param {DataTransfer} [dataTransfer]
     * @returns {string}
     */
    readDroppedImageUrl(dataTransfer) {
        if (!dataTransfer) return "";
        //① 编辑器内部的卡片拖拽：卡片把自己 id 设成 chosen-card 并写进 text（同一约定，见 component-infoCard.mjs）
        let cardId = "";
        try { cardId = dataTransfer.getData("text"); } catch (err) { cardId = ""; }
        if (cardId) {
            const url = this.readCardImageUrl(document.getElementById(cardId));
            if (url) return url;
        }
        //② 浏览器默认的图片拖拽：text/uri-list、text/html（内容是 `<img src=…>`）、text/plain
        for (const type of ["text/uri-list", "text/html", "text/plain"]) {
            let raw = "";
            try { raw = dataTransfer.getData(type); } catch (err) { raw = ""; }
            const url = this.pickImageUrl(raw);
            if (url) return url;
        }
        return "";
    }
    /**
     * 卡片（搜索结果的武将卡 / 原画卡）里那张图的地址：优先 `<img src>`，武将卡是 `setBackground` 写的背景图。
     * @param {HTMLElement} [card]
     * @returns {string}
     */
    readCardImageUrl(card) {
        if (!card || !card.shadowRoot) return "";
        const main = card.shadowRoot.querySelector(".main-content") || card.shadowRoot;
        const src = main.querySelector?.("img")?.getAttribute?.("src") || "";
        if (src) return src;
        const background = main.style?.backgroundImage || (main === card.shadowRoot ? "" : getComputedStyle(main).backgroundImage);
        const matched = /url\(["']?(.+?)["']?\)/i.exec(background || "");
        if (matched) return matched[1];
        const skinInfo = card.skinInfo;
        if (skinInfo && typeof skinInfo === "object") return String(skinInfo.link || skinInfo.src || skinInfo.image || "");
        return "";
    }
    /**
     * 从任意拖拽文本里挑出图片地址（`<img src=…>` / uri-list 的一行 / 纯地址）。
     * ⚠️ 不能只靠后缀判断：wiki 的图片地址常常没有 `.png/.jpg`（认死后缀就会「拖了没反应」）。
     * @param {string} [raw]
     * @returns {string}
     */
    pickImageUrl(raw) {
        const text = String(raw || "").trim();
        if (!text) return "";
        const matched = /<img[^>]+src\s*=\s*["']?([^"'\s>]+)/i.exec(text);
        const candidate = (matched ? matched[1] : text.split(/[\r\n\s]+/)[0] || "").trim();
        return this.isImageUrl(candidate) ? candidate : "";
    }
    /**
     * @param {string} value
     * @returns {boolean}
     */
    isImageUrl(value) {
        const text = String(value || "").trim();
        if (!text || /^(javascript|about|mailto):/i.test(text)) return false;
        if (/^(data:image\/|blob:)/i.test(text)) return true;
        //http(s)、页面根路径（`/extension/…`、`/image/…`）、相对路径，以及任何带图片后缀的地址
        if (/^(https?:|\/|\.{1,2}\/)/i.test(text)) return true;
        return /\.(png|jpe?g|gif|webp|bmp|avif|jfif)(\?|#|$)/i.test(text);
    }
    /**
     * 图片地址 → Blob。桌面端窗口是 `webSecurity:false`（app/main.js:43849），跨域的 wiki 图也能直接 fetch。
     * @param {string} url
     * @returns {Promise<Blob>}
     */
    async fetchImageBlob(url) {
        const response = await fetch(url, { mode: "cors", credentials: "omit" });
        if (!response.ok && response.status !== 0) throw new Error(`HTTP ${response.status}`);
        return response.blob();
    }
    /**
     * 给个文件名——只为拿扩展名（`saveLocalAsset` 用 `file.name` 的后缀决定存成什么）
     * @param {string} url
     * @param {string} type
     * @returns {string}
     */
    imageFileName(url, type) {
        const matched = /([^/?#]+)\.(png|jpe?g|gif|webp|bmp|avif|jfif)/i.exec(String(url || ""));
        //只留字母/数字/中文与 . _ -（\p{L} 含 CJK；\w 只认 ASCII，会把中文名洗成下划线）
        const base = matched ? matched[1].replace(/[^\p{L}\p{N}._-]/gu, "_") : "dropped-avatar";
        return `${base}.${this.imageExtension(type || this.imageTypeFromUrl(url))}`;
    }
    /**
     * MIME → 扩展名（认不出按 png；`saveLocalAsset` 只拿 `file.name` 的后缀当扩展名）
     * @param {string} type
     * @returns {string}
     */
    imageExtension(type) {
        const clean = String(type || "").split("/")[1]?.toLowerCase()?.replace("jpeg", "jpg") || "";
        return ["png", "jpg", "gif", "webp", "bmp", "avif", "jfif"].includes(clean) ? clean : "png";
    }
    /**
     * 地址后缀 → MIME（服务器不给 content-type 时兜底；认不出返回 ""）
     * @param {string} url
     * @returns {string}
     */
    imageTypeFromUrl(url) {
        const matched = /\.(png|jpe?g|gif|webp|bmp|avif|jfif)(?:\?|#|$)/i.exec(String(url || ""));
        if (!matched) return "";
        const ext = matched[1].toLowerCase();
        return `image/${ext === "jpg" || ext === "jfif" ? "jpeg" : ext}`;
    }
    /**
     * 按 id 载入草稿
     * @param {string} id
     * @returns {boolean} 是否载入成功
     */
    loadDraft(id) {
        if (!id) return false;
        const data = this.configQuery("get", { member: `x19D6_editor.characters.${id}` });
        if (!data || typeof data !== "object") return false;
        //换草稿要先把立绘状态清干净，否则上一份的引用会被写进这一份
        this.avatarReference = "";
        this.storedAvatarReference = "";
        this.avatarCleared = false;
        this.loadedTrashBin = [];
        this.applyData(data);
        //草稿的扩展一律按当前工作区对待（保存时写回）
        this.syncWorkspace();
        //媒体改名要按「当前草稿的武将 id」比，所以载入后重新对准
        this.lastAssetId = this.getData("id") || "";
        //珠联璧合列表由 `applyData` 里的 `renderPerfectPair()` 一起重建，这里不再单独调
        return true;
    }
    /**
     * @param {dataType} type 
     * @param {any} val 
     */
    getData(type) {
        const camelizedType = this.textQuery("formatTransfer", { to: "camel", text: type });
        let result = this.getDataAreaDom(type)?.dataset?.[camelizedType];
        switch (camelizedType) {
            case "hp": case "maxHp": case "hujia": return Number(result) || 0;
            case "dieAudios": case "clans": case "skills": case "perfectPair": case "doubleGroup": return result.split(" ").filter(Boolean);
            case "pinyin": return result.split(",");
            case "intro": return result.trim();
            default: {
                if (camelizedType.startsWith("is") || camelizedType.startsWith("has")) return Boolean(result);
                return result;
            }
        }
    }
    getAllData() {
        const dataList = {};
        this.characterAttributes.forEach((attr) => {
            dataList[attr] = this.getData(attr);
        });
        //扩展 = 当前工作区（草稿归属以工作区为准，保存时写回）
        if (this.workspace) dataList.extension = this.workspace;
        if (!dataList.trashBin) dataList.trashBin = [];
        if (!dataList.clans.length) delete dataList.clans;
        if (!dataList.perfectPair || !dataList.perfectPair.length) delete dataList.perfectPair;
        if (!dataList.doubleGroup.length) delete dataList.doubleGroup;
        if (!dataList.dieAudios.length) delete dataList.dieAudios;
        if (!dataList.hujia) delete dataList.hujia;
        if (!dataList.avatar) delete dataList.avatar;
        if (!dataList.isZhugong) delete dataList.isZhugong;
        if (!dataList.hasHiddenSkill) delete dataList.hasHiddenSkill;
        if (!dataList.isAiForbidden) delete dataList.isAiForbidden;
        if (!dataList.isBoss) delete dataList.isBoss;
        if (!dataList.isChessBoss) delete dataList.isChessBoss;
        if (!dataList.isUnseen) delete dataList.isUnseen;
        if (!dataList.isJiangeBoss) delete dataList.isJiangeBoss;
        if (!dataList.isJiangeMech) delete dataList.isJiangeMech;
        if (!dataList.isFellowInStoneMode) delete dataList.isFellowInStoneMode;
        if (!dataList.isSpecialInStoneMode) delete dataList.isSpecialInStoneMode;
        if (!dataList.isHiddenInStoneMode) delete dataList.isHiddenInStoneMode;
        if (!dataList.intro) delete dataList.intro;
        if (!dataList.pinyin || dataList.pinyin.toString() === this.textQuery("pinyin", { text: dataList.name }).toString()) delete dataList.pinyin;
        if (dataList.maxHp === dataList.hp) delete dataList.maxHp;
        if (dataList.sex === "male-castrated") {
            dataList.sex = "male";
            dataList.trashBin.push("sex:male_castrated");
        }
        //立绘引用：以编辑器持有的引用为准，**不从 DOM 反推**——
        //只要有一次「DOM 里没有立绘」的保存（同草稿开两个实例、裁剪后只剩 blob: URL…），
        //原来那种从 dataset.avatar 重建 trashBin 的写法就会把已存盘的引用抹成空数组，
        //文件还在磁盘上、重新打开却再也回不来（用户反馈的 bug 就是这么产生的）。
        const avatarValue = this.avatarCleared ? "" : (this.avatarReference || this.storedAvatarReference || dataList.avatar);
        const avatarEntry = this.toExtReference(avatarValue);
        if (avatarEntry) dataList.trashBin.push(avatarEntry);
        delete dataList.avatar;
        //记录里原有的非立绘标记（sex:male_castrated / des:… 等）原样写回，别在保存时丢掉
        (this.loadedTrashBin || []).forEach(item => {
            if (typeof item !== "string" || !item) return;
            if (this.isAvatarReference(item)) return;
            if (dataList.trashBin.includes(item)) return;
            dataList.trashBin.push(item);
        });
        if (dataList.dieAudios) {
            dataList.dieAudios = dataList.dieAudios.map(path => this.pathQuery("changeToExtPath", { path }));
        }
        //这里将packageId默认设置为扩展名 方便以后调试
        if (!dataList.packageId) {
            dataList.packageId = dataList.extension;
            delete dataList.characterSort;
            delete dataList.characterSortName;
        } else {
            if (!dataList.characterSort) {
                delete dataList.characterSort;
                delete dataList.characterSortName;
            } else if (!this.checkQuery("characterSortId", { id: dataList.characterSort, packageId: dataList.packageId })) { //这里检查是否已有分类
                delete dataList.characterSortName;
            }
        }
        return dataList;
    }
    getGroupedData() {
        const allData = this.getAllData();
        const { characterSort, characterSortName, ...characterInfo } = allData;
        const characterSortInfo = {
            id: characterInfo.id,
            characterSort,
            characterSortName,
            packageId: characterInfo.packageId
        }
        return {
            characterInfo,
            characterSortInfo
        }
    }
    async genCode() {
        const { characterInfo, characterSortInfo } = this.getGroupedData();
        const codeList = [];
        codeList.push({
            title: "character",
            codeString: await this.codeQuery("genCharacterCode", [characterInfo, "object"]),
            otherPatternCodeString: await this.codeQuery("genCharacterCode", [characterInfo, "array"])
        });
        if (characterSortInfo.characterSort) {
            codeList.push({
                title: "characterSort",
                codeString: await this.codeQuery("genCharacterSortCode", [characterSortInfo, this.checkQuery("memberExistence", { member: `lib.characterSort.${characterInfo.packageId}` })])
            })
        }
        return codeList;
    }
}
customElements.define("character-editor", HTMLNonameCharacterEditorElement);