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
        "isZhugong",
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
                    <span class="extension-setting pointer text-shadow-free">设置</span>
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
            <!-- <div class="data-setting" data-title>
                <span>
                    <span>武将称号</span>
                    <span class="expandable-collapsed" data-for="data-title"></span>
                    <span></span>
                </span>
                <section data-by="data-title" class="hidden">
                </section>
            </div>
            <div class="data-setting" data-perfect-pair>
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
                    <p class="note">搜索武将，将侧边栏武将拖入该区域，或选择技能卡片中的⬅️以添加武将</p>
                    <section>
                        <ul data-by="character-list"></ul>
                    </section>
                </section>
            </div> -->
        </div>
    </div>
    <div class="code">
    </div>
</section>
<section class="menu">
    <div class="menu-icon">🔧</div>
    <div class="close">关闭界面</div>
    <div class="export-all">一键导出</div>
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
        this.#listenMore();
        this.#listenIntro();
        //
        this.#listenExpanable();
        //按 id 载入已保存的草稿（新建武将时 id 为空，不载入）
        const draftId = this.getAttribute("character-id") || this.getData("id");
        if (draftId) this.loadDraft(draftId);
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
    openExtensionDialog() {
        const dialog = document.createElement("noname-dialog");
        dialog.type = "extension-setting";
        dialog.config = this.configQuery("get", { member: `x19D6_editor.extensionFileConfig` });
        this.shadowRoot.append(dialog);
        return {
            dialog,
            processing: dialog.wait().then(async result => {
                if (result) {
                    const extensionName = result["extension-name"]
                    if (extensionName !== this.getData("extension")) {
                        this.style.setProperty("--data-extension-name", `"${extensionName}"`);
                        this.changeData("extension", extensionName);
                        this.style.removeProperty("--data-package-id");
                        this.changeData("packageId", '');
                        this.changeData("characterSort", "");
                        this.changeData("characterSortName", "");
                        this.style.removeProperty("--data-character-sort");
                    }
                    await this.configQuery("write", { member: `x19D6_editor.extensionFileConfig.${extensionName}`, value: result });
                }
                return result;
            })
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
        const config = this.configQuery("get", {
            member: `x19D6_editor.extensionFileConfig.${this.getData("extension")}`
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
        const closeButton = menu.querySelector(".close");
        //
        const genCodeButton = menu.querySelector(".gen-code");
        const returnSettingButton = menu.querySelector(".return-setting");
        //
        const exportAllButton = menu.querySelector(".export-all");
        closeButton.addEventListener("pointerup", () => {
            this.remove();
        });
        exportAllButton.addEventListener("pointerup", async () => {
            if (!this.getData("id")) {
                const { dialog, processing } = this.openCharacterIdDialog();
                dialog.setAttribute("headline", "暂未设置武将id，请设置之！")
                const result = await processing;
                if (result === false) return;
                await this.loadId(result);
            }
            if (!this.getData("extension")) {
                const { dialog, processing } = this.openExtensionDialog();
                dialog.setAttribute("headline", "暂未设置导出到的扩展，请设置之。");
                const result = await processing;
                if (result === false) return;
            }
            const extensionName = this.getData("extension");
            if (!this.getData("packageId")) {
                if (!this.configQuery("get", { member: `x19D6_editor.extensionModuleConfig.${extensionName}` })) {
                    await this.writeModuleConfig(extensionName);
                }
                const { processing } = this.openPackageSelectDialog(extensionName);
                const result = await processing;
                if (result === false) return;
            }
            await this.downloadExtensionAsset();
            const modificationInfo = await this.codeQuery("modifyCharacterPackageCode", [
                this.getAllData(),
                this.configQuery("get", { member: `x19D6_editor.extensionModuleConfig.${extensionName}` })
            ]);
            this.modifyFiles(modificationInfo);
        })
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
    #listenExtension() {
        const extensionDataArea = this.getDataAreaDom("extension");
        const extensionSetting = extensionDataArea.querySelector(".extension-setting");
        const extensionNameBtn = extensionDataArea.querySelector(".extension-name");
        const packageIdBtn = extensionDataArea.querySelector(".package-id");
        const characterSortBtn = extensionDataArea.querySelector(".character-sort");
        const setExtensionName = async () => {
            const { dialog, processing } = this.openExtensionDialog();
            dialog.setAttribute("headline", "请设置武将所属扩展。");
            return await processing;
        }
        const setPackageName = async () => {
            if (!this.getData("extension")) {
                if (await setExtensionName() === false) return false;
            }
            const extensionName = this.getData("extension");
            if (!this.configQuery("get", { member: `x19D6_editor.extensionModuleConfig.${extensionName}` })) {
                await this.writeModuleConfig(extensionName);
            }
            const { processing } = this.openPackageSelectDialog(extensionName);
            return await processing;
        }
        const setCharacterSort = async () => {
            if (!this.getData("packageId")) {
                if (await setPackageName() === false) return;
            }
            const packageId = this.getData("packageId")
            this.openCharacterSortDialog(packageId);
        }
        extensionNameBtn.addEventListener("pointerup", setExtensionName);
        packageIdBtn.addEventListener("pointerup", setPackageName);
        characterSortBtn.addEventListener("pointerup", setCharacterSort);
        extensionSetting.addEventListener("pointerup", setCharacterSort);
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
            this.createAndRecordObjectURL("avatar", file);
            const url = this.getLastestURLRecord("avatar");
            imgType = file.type;
            img.style.cssText = "";
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
            this.changeData("avatar", "");
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
            this.clearURLRecords("dieAudios")
            const [file] = await this.fileQuery("submitFile", { format: "audio/*" });
            this.createAndRecordObjectURL("dieAudios", file);
            const audioCard = document.createElement("audio-info-card");
            audioCard.setAttribute("src", this.getLastestURLRecord("dieAudios"));
            audioCard.setAttribute("removable", true)
            dieAudioSection.append(audioCard);
            this.changeData("dieAudios", this.getLastestURLRecord("dieAudios"));
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
        new MutationObserver(() => {
            this.changeData("id", idInput.textContent)
            this.changeData("defaultIntro", this.playerQuery("intro", { id: idInput.textContent }));
            if (this.checkQuery("characterId", { id: idInput.textContent })) {
                if (title.classList.contains("wrong")) title.classList.remove("wrong");
            } else {
                if (!title.classList.contains("wrong")) title.classList.add("wrong");
            }
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
    createGroupOption({ id, name, textShadow, imageData } = {}) {
        const li = document.createElement("li");
        li.dataset.groupOption = id;
        li.textContent = name;
        li.style.setProperty("--url", `url(${imageData})`);
        li.style.setProperty("--group-text-shadow", textShadow);
        return li;
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
    }
    #listenGroup() {
        const groupDataArea = this.getDataAreaDom("group")
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
                const newGroupOption = this.createGroupOption(result);
                groupDiy.parentElement.insertBefore(newGroupOption, groupDiy);
                singleManager.append(newGroupOption);
                doubleManager.append(newGroupOption);
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
            node.removeAttribute("likable");
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
            }; break;
            case "id": {
                this.getDataAreaDom("id").dataset["id"] = val;
                this.style.setProperty("--data-id", `'${val}'`);
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
        const id = this.getData("id");
        if (!id) return false;
        const data = this.getAllData();
        data.savedAt = Date.now();
        this.configQuery("write", { member: `x19D6_editor.characters.${id}`, value: data });
        return true;
    }
    flushDraft() {
        return this.saveDraft();
    }
    /**
     * 把一份草稿数据回填到界面（每个字段都走 changeData，保证界面与数据一致）
     * @param {object} data
     */
    applyData(data) {
        if (!data) return this;
        const attributes = this.characterAttributes;
        for (const attr of attributes) {
            if (!(attr in data)) continue;
            this.changeData(attr, data[attr], { mode: "replace" });
        }
        return this;
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
            case "dieAudios": case "clans": case "skills": case "doubleGroup": return result.split(" ").filter(Boolean);
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
        if (!dataList.trashBin) dataList.trashBin = [];
        if (!dataList.clans.length) delete dataList.clans;
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