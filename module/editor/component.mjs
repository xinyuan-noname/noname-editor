import { preventEnter, toggleMultiClass } from "./encapsulated.mjs";
import { HTMLNonameFocusUIElement } from "./component-base.mjs";
import "./component-infoCard.mjs";
import "./component-dialog.mjs";
class HTMLNonameCharacterEditorElement extends HTMLNonameFocusUIElement {
    /**
     * 草稿自动保存的防抖定时器
     */
    #saveTimer = null;
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
                        <li class="checkbox" data-more-option="isZhuGong">
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
        return `ext:${relative}`;
    }
    /**
     * 把 `ext:` / `/extension/` / `extension/` 形式的引用还原成工作区相对路径
     * @param {string} reference
     * @returns {string}
     */
    assetRelative(reference) {
        const text = String(reference || "");
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
        img.src = url;
        avatar.classList.add("done");
        this.changeData("avatar", url);
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
            imgType = file.type;
            img.style.cssText = "";
            //<img> 只认 URL：用 /extension/... 显示；草稿里存同样形式，getAllData 会归一成 ext:
            const url = `/extension/${reference.slice(4)}`;
            this.recordURL("avatar", url);
            img.src = url;
            avatar.classList.add("done");
            this.changeData("avatar", url);
        }
        this.createUniqueChoiceManager("height-set", ...avatarDataArea.querySelectorAll(".height-set"))
            .listenSiblings("pointerup")
            .setCallback((last, now) => {
                avatar.classList.remove(last?.dataset?.heightSet);
                avatar.classList.add(now?.dataset?.heightSet);
            })
            .chooseFirst();
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
            avatar.addEventListener(event, e => {
                if (avatar.classList.contains("done")) return;
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });
        avatar.addEventListener("pointerup", async () => {
            if (avatar.classList.contains("done")) return;
            const fileList = await this.fileQuery("submitFile", { format: "image/*" });
            if (fileList !== null) loadFile(fileList[0]);
        });
        avatar.addEventListener("drop", e => {
            if (e?.dataTransfer?.files?.item(0)?.type?.startsWith?.("image")) {
                loadFile(e.dataTransfer.files[0]);
            }
        });
        resetButton.addEventListener("pointerup", () => {
            avatar.classList.remove("done");
            img.removeAttribute("src");
            img.style.cssText = "";
            const previous = this.getData("avatar");
            this.changeData("avatar", "");
            //同生共死：重置立绘 = 删掉已落盘的那张
            if (previous) this.removeAssetFile(previous);
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
                            this.reloadAvatar(await this.multiMediaQuery("staticImgClip", {
                                img,
                                x: parseFloat(cutter.style.left) || 0,
                                y: parseFloat(cutter.style.top) || 0,
                                width: cutter.clientWidth,
                                height: cutter.clientHeight,
                                dataForm: "blobURL",
                                type: imgType,
                                useClientData: true
                            }));
                            avatar.classList.remove("cutting", "editing", "loading");
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
        this.createUniqueChoiceManager("sex", ...sexOptions)
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
        const li = document.createElement("li");
        li.dataset.groupOption = id;
        li.textContent = name || id || "";
        //没有图片就别写 url(undefined)——那会让整个选项渲染成空白格（用户截图里「键」和「＋新增」之间那个空位）
        if (imageData) li.style.setProperty("--url", `url(${imageData})`);
        if (textShadow) li.style.setProperty("--group-text-shadow", textShadow);
        return li;
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
                this.createGroupOption({ id: groupId, name: groupName, imageData: icon ? `/${icon}` : "" }),
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
            clanDiy.parentElement.insertBefore(this.createClanOption(clanName), clanDiy);
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
                    groupName: now?.textContent?.trim(),
                    groupTextShadow: now?.style?.getPropertyValue?.("--group-text-shadow")
                });
            })
            .choose(groupOptions[0]);
        doubleManager
            .listenAllNodes("pointerup", (_event, node) => chosenModeManager.getLastestInfo() === "double" && !node.classList.contains("chosen"))
            .setCallback((type, target, funMap) => {
                funMap.forClass("double-group-chosen");
                const infoList = doubleManager.getAllInfo();
                const groupChosen = singleManager.chosen;
                const groupInfo = {
                    groupId: groupChosen?.dataset?.groupOption,
                    groupName: groupChosen?.textContent?.trim(),
                    groupTextShadow: groupChosen?.style?.getPropertyValue?.("--group-text-shadow")
                }
                this.setDoubleGroup(groupInfo, infoList);
            })
            .setGetInfoMethod(target => {
                return {
                    groupId: target?.dataset?.groupOption,
                    groupName: target?.textContent?.trim(),
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
                const newGroupOption = this.createGroupOption({ ...result, imageData: iconPath ? `/${iconPath}` : "" });
                groupDiy.parentElement.insertBefore(newGroupOption, groupDiy);
                singleManager.append(newGroupOption);
                doubleManager.append(newGroupOption);
                this.recordGroupName(result.id, result.name);
            }
        })
    }
    createClanOption(name) {
        const li = document.createElement("li");
        li.dataset.clanOption = name;
        li.textContent = name;
        return li;
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
        const clanDiy = clansDataArea.querySelector("[data-diy]");
        clanDiy.addEventListener("pointerup", async () => {
            const dialog = document.createElement("noname-dialog");
            dialog.setAttribute("type", "prompt");
            this.shadowRoot.append(dialog);
            dialog.setAttribute("message", "请输入宗族");
            const result = await dialog.wait()
            if (result) {
                const newClanOption = this.createClanOption(result);
                clanDiy.parentElement.insertBefore(newClanOption, clanDiy);
                manager.append(newClanOption);
                this.recordClanName(result);
            }
        })
    }
    #listenHp() {
        let hpAdjustMode, hpAdjustUnitOffset = 1;
        const hpDataArea = this.getDataAreaDom("hp");
        const hpContainer = hpDataArea.querySelector(".hpContainer");
        const moreShowContainer = hpDataArea.querySelector(".hp-more-show");
        const unitOffsetInput = hpDataArea.querySelector(".hp-adjust [contenteditable]")
        const [hpInput, maxHpInput] = hpDataArea.querySelectorAll(".hp-operation [contenteditable]");
        const [hpPlus, hpMinus] = hpDataArea.querySelectorAll(".hp-adjust>div>div");
        const hpManager = this.createUniqueChoiceManager("hp", ...hpDataArea.querySelectorAll(".hp"));
        const adjustOptionManager = this.createUniqueChoiceManager(null, ...hpDataArea.querySelectorAll(".hp-more-show span"));
        const unitOffsetInputManager = this.createEditableElementManager(null, unitOffsetInput)
        const hpInputManager = this.createEditableElementManager("hp", hpInput);
        const maxHpInputManager = this.createEditableElementManager("maxHp", maxHpInput);
        const adjustHpDivsTo = (num) => {
            if (num < 1 || num > 6) return;
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
        const prependMaxHp = (num = 1, onlyMaxHp = false) => {
            if (num < 0) return;
            const nowHp = this.getData("hp"), nowMaxHp = this.getData("maxHp");
            const changedMaxHp = nowMaxHp + num
            maxHpInputManager.changeValue(changedMaxHp);
            this.changeData("maxHp", changedMaxHp);
            if (changedMaxHp <= 6) {
                adjustHpDivsTo(changedMaxHp);
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
        const removeMaxHp = (num = 1) => {
            if (num < 0) return;
            const nowHp = this.getData("hp"), nowMaxHp = this.getData("maxHp"); num = Math.min(num, nowMaxHp - 1);
            const changedMaxHp = num === Infinity ? 1 : nowMaxHp - num;
            this.changeData("maxHp", changedMaxHp);
            maxHpInputManager.changeValue(changedMaxHp);
            if (changedMaxHp <= 6) {
                adjustHpDivsTo(changedMaxHp);
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
        const addHp = (num = 1) => {
            if (num < 0) return;
            const nowHp = this.getData("hp"), nowMaxHp = this.getData("maxHp");
            const d = nowHp + num - nowMaxHp;
            hpInputManager.changeValue(nowHp + num);
            this.changeData("hp", nowHp + num);
            if (d > 0) {
                prependMaxHp(d, true);
            }
            if (d < 0 && nowMaxHp <= 6 || d > 0 && nowMaxHp + d <= 6) {
                hpManager.choose(this.getDataAreaDom("hp").querySelector(`.hp:nth-last-child(${nowHp + num})`));
            }
        }
        const removeHp = (num = 1) => {
            if (num < 0) return;
            const nowHp = this.getData("hp"), nowMaxHp = this.getData("maxHp"); num = Math.min(num, nowHp - 1);
            const changedHp = num === Infinity ? 1 : nowHp - num;
            hpInputManager.changeValue(changedHp);
            this.changeData("hp", changedHp);
            if (nowMaxHp <= 6) {
                hpManager.choose(this.getDataAreaDom("hp").querySelector(`.hp:nth-last-child(${changedHp})`));
            }
        }
        maxHpInputManager.inputNumber({
            min: 1, max: Infinity, value: 4, supportInfinity: true, isInteger: true,
            commonCallback: (e, val, last) => {
                const d = val - last;
                if (d < 0) removeMaxHp(Math.abs(d));
                else if (d > 0) prependMaxHp(d, true);
            }
        });
        hpInputManager.inputNumber({
            min: 1, max: Infinity, value: 4, supportInfinity: true, isInteger: true,
            commonCallback: (e, val, last) => {
                const d = val - last;
                if (d > 0) addHp(d)
                else if (d < 0) removeHp(Math.abs(d))
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
                if (hpAdjustMode === "maxHp") prependMaxHp(hpAdjustUnitOffset, true);
                else addHp(hpAdjustUnitOffset);
            } else if (hp === maxHp) {
                prependMaxHp(1, false);
            } else {
                prependMaxHp(1, true);
            }
        });
        hpMinus.addEventListener("pointerup", () => {
            if (this.getData("maxHp") > 6) {
                if (hpAdjustMode === "maxHp") removeMaxHp(hpAdjustUnitOffset);
                else removeHp(hpAdjustUnitOffset);
            } else removeMaxHp();
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
    addSkill(arg) {
        const skillsDataArea = this.getDataAreaDom("skills");
        const ul = skillsDataArea.querySelector("ul");
        let id;
        if (arg instanceof HTMLElement && arg.tagName === "SKILL-INFO-CARD") {
            const node = arg;
            id = node.getAttribute("skill-id")
            node.removeAttribute("usable");
            node.removeAttribute("id");
            node.removeAttribute("markWords");
            ul.append(node);
        } else if (typeof arg === "string" && arg.trim().length !== 0) {
            id = arg;
            const nowSkillInfo = this.infoQuery("skill", { skillId: id, characterId: this.getData("id") })
            const skillCard = document.createElement("skill-info-card");
            skillCard.setAttribute("skill-id", id);
            skillCard.skillInfo = nowSkillInfo;
            skillCard.setAttribute("removable", true)
            ul.append(skillCard);
        } else return;
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
                funMap.forClass("chosen");
                this.changeMoreSetting(target.dataset.moreOption)
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
                if (typeof val !== "number") return false;
                this.getDataAreaDom(type).dataset[type] = val;
                this.style.setProperty("--data-" + type, val == Infinity ? "'∞'" : `'${val}'`);
            }; break;
            case "skills": {
                const skillsDataArea = this.getDataAreaDom("skills");
                let skills;
                if (config.mode === "append") {
                    skills = skillsDataArea.dataset[type].split(" ").filter(Boolean).concat(val);
                    skillsDataArea.dataset[type] = skills.join(" ");
                } else if (config.mode === "remove") {
                    skills = skillsDataArea.dataset[type].split(" ").filter(skill => skill && skill !== val);
                    skillsDataArea.dataset[type] = skills.join(" ");
                } else if (config.mode === "rewrite") {
                    if (Array.isArray(val)) {
                        skillsDataArea.dataset[type] = val.join(" ");
                        skills = val;
                    } else {
                        skillsDataArea.dataset[type] = val;
                        skills = skillsDataArea.dataset[type].split("");
                    }
                }
                if (Array.isArray(skills)) {
                    this.style.setProperty(
                        "--data-skills",
                        `"${skills.map(skill => this.textQuery("skillTranslation", { text: skill, attr: "name" })).join("，")}"`
                    );
                }
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
        this.scheduleSaveDraft();
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
        const attributes = this.characterAttributes;
        for (const attr of attributes) {
            if (!(attr in data)) continue;
            this.changeData(attr, data[attr], { mode: "replace" });
        }
        //文字输入框（姓名 / 拼音 / id）
        this.syncTextInputs();
        //选项高亮（选择管理器的高亮是 class，changeData 不碰它）
        this.markChosenOptions("sex", data.sex);
        this.markChosenOptions("group", data.group);
        this.markChosenOptions("clans", data.clans);
        if (data.groupName) this.setGroup({ groupId: data.group, groupName: data.groupName });
        //顶部「所属分包」那行用的是 CSS 变量，载入时同样要设
        if (data.extension) this.style.setProperty("--data-extension", `"${data.extension}"`);
        if (data.packageId) this.style.setProperty("--data-package-id", `"${lib.translate[data.packageId + "_character_config"] || data.packageId}"`);
        if (data.characterSortName) this.style.setProperty("--data-character-sort", `"${data.characterSortName}"`);
        //体力 / 体力上限 / 护甲的数字框
        this.syncHpInputs();
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
     * 回填选项的选中态
     * @param {"sex"|"group"|"clans"} area
     * @param {string|string[]} values
     * @returns {number} 标记了几个
     */
    markChosenOptions(area, values) {
        const areaDom = this.getDataAreaDom(area);
        if (!areaDom) return 0;
        const list = (Array.isArray(values) ? values : [values]).filter(Boolean);
        let marked = 0;
        areaDom.querySelectorAll("[data-sex-option],[data-group-option],[data-clan-option]").forEach(node => {
            const value = node.dataset.sexOption ?? node.dataset.groupOption ?? node.dataset.clanOption;
            const chosen = list.includes(value);
            node.classList.toggle("chosen", chosen);
            if (chosen) marked++;
        });
        return marked;
    }
    /**
     * 回填体力 / 体力上限 / 护甲的数字框
     */
    syncHpInputs() {
        const hpArea = this.getDataAreaDom("hp");
        if (!hpArea) return;
        const [hpInput, maxHpInput] = hpArea.querySelectorAll(".hp-operation [contenteditable]");
        const hujiaInput = hpArea.querySelector(".hujia-operation [contenteditable]");
        [[hpInput, this.getData("hp")], [maxHpInput, this.getData("maxHp")], [hujiaInput, this.getData("hujia")]]
            .forEach(([input, value]) => {
                if (!input || !Number.isFinite(value)) return;
                const text = String(value);
                if (input.textContent !== text) input.textContent = text;
            });
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
        this.applyData(data);
        //草稿的扩展一律按当前工作区对待（保存时写回）
        this.syncWorkspace();
        //媒体改名要按「当前草稿的武将 id」比，所以载入后重新对准
        this.lastAssetId = this.getData("id") || "";
        this.renderPerfectPair();
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
            case "hp": case "maxHp": case "hujia": return Number(result);
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
        if (dataList.avatar) {
            dataList.trashBin.push(this.pathQuery("changeToExtPath", { path: dataList.avatar }));
            delete dataList.avatar;
        }
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