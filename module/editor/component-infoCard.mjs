import { HTMLNonameFocusUIElement } from "./component-base.mjs";
const nonameCardStyle = (() => {
    const style = document.createElement("style");
    style.textContent = `:host {
        width: 100%;
        color: wheat;
        display: flex;
        flex-direction: column;
        background-color: #000;
    }

    :host>*{
        width: 100%;
    }

    ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    img{
        max-width: 100%;
    }

    img:not([src]){
        display: none;
    }

    .font-songti{
        font-family:songti;
    }
    
    .font-small{
        font-size:small;
    }

    .main-content[draggable] {
        cursor: grab;
    }

    [data-audio-list-item] {
        color: gold;
        margin: 1px 0;
        filter: contrast(1.2);
    }

    .interact-bar {
        display: flex;
        justify-content: flex-end;
        background-color: #1e1e1e;
    }

    .interact-bar>* {
        font-size: 20px;
        cursor: pointer;
    }

    .interact-bar>.use {
        cursor: not-allowed;
    }

    .interact-bar>.use.allowed{
        cursor: pointer;
        filter: grayscale(0%);
    }

    .interact-bar>.use,
    .interact-bar>.like {
        filter: grayscale(80%);
    }

    .interact-bar>.like.liked {
        filter: grayscale(0%);
    }

    [data-audio-src]::after{
        content: "🔈";
        cursor: pointer;
    }

    [data-audio-src].playing::after {
        animation: play-audio 1s linear infinite;
        cursor: not-allowed;
    }
    
    [contenteditable]{
        min-height: 1em;
        width: 100%;
    }
    
    [contenteditable]:empty::before{
        content:"请点击这里，以输入语音对应的文本";
    }

    [contenteditable]:empty:focus::before{
        content: none;
    }

    @keyframes play-audio {
        0% {
            content: "🔈";
        }
        50% {
            content: "🔉";
        }
        100% {
            content: "🔊";
        }
    }`
    return style
})();
const nonameCardFragment = (() => {
    const fragment = document.createDocumentFragment();
    const showInfo = document.createElement("div");
    const style = nonameCardStyle.cloneNode(true);
    showInfo.className = "show-info";
    const interactBar = document.createElement("div");
    interactBar.className = "interact-bar"
    fragment.append(style, showInfo, interactBar);
    return fragment;
})();
class HTMLNonameInfoCardElement extends HTMLNonameFocusUIElement {
    constructor() {
        super();
        const shadow = this.attachShadow({ mode: "open" });
        shadow.append(nonameCardFragment.cloneNode(true));
    }
    static observedAttributes = ["likable", "removable", "usable", "usefor", "markwords"];
    connectedCallback() {
        this.shadowRoot.addEventListener("pointerup", (e) => {
            const node = e.target;
            if (node.dataset.audioSrc && !node.classList.contains("playing")) {
                node.classList.add("playing");
                this.multiMediaQuery("audioPlay", { src: node.dataset.audioSrc, volume: 1 })
                    .then(() => {
                        node.classList.remove("playing");
                    })
            }
        });
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        const interactBar = this.shadowRoot.querySelector(".interact-bar");
        switch (name) {
            case "usable": {
                if (newValue === "true") {
                    const useSpan = document.createElement("span");
                    useSpan.className = "use";
                    useSpan.textContent = "⬅️";
                    useSpan.addEventListener("pointerdown", () => {
                        this.triggerEvent("useCardData");
                    });
                    interactBar.prepend(useSpan);
                } else {
                    interactBar.querySelector(":scope>.use")?.remove?.();
                    this.removeAttribute("usefor");
                }
            }; break;
            case "likable": {
                if (newValue === "true") {
                    const likeSpan = document.createElement("span");
                    likeSpan.className = "like";
                    likeSpan.textContent = "❤️"
                    likeSpan.addEventListener("pointerdown", () => {
                        if (!likeSpan.classList.contains("liked")) {
                            likeSpan.classList.add("liked");
                            this.triggerEvent("like");
                        } else if (likeSpan.classList.contains("like")) {
                            likeSpan.classList.remove("liked")
                            this.triggerEvent("likeCancel");
                        }
                    })
                    interactBar.insertBefore(likeSpan, interactBar.children[2]);
                } else {
                    interactBar.querySelector(":scope>.like")?.remove?.();
                }
            }; break;
            case "removable": {
                if (newValue === "true") {
                    const removeSpan = document.createElement("span");
                    removeSpan.className = "remove";
                    removeSpan.textContent = "🗑️"
                    removeSpan.addEventListener("pointerdown", () => {
                        this.triggerEvent("removeCard");
                        this.remove();
                    })
                    interactBar.insertBefore(removeSpan, interactBar.children[1]);
                } else {
                    interactBar.querySelector(":scope>.remove")?.remove?.();
                }
            }; break;
            case "usefor": {
                const mainContentDiv = this.shadowRoot.querySelector(".main-content");
                if (!mainContentDiv) break;
                const use = interactBar.querySelector(":scope>.use");
                if (this.useForNode && this.useForNode.id == newValue || (this.useForNode = document.getElementById(newValue))) {
                    mainContentDiv.setAttribute("draggable", "true");
                    if (use) {
                        use?.classList?.add?.("allowed");
                        use.onpointerdown = (e) => {
                            this.sendEvent("requestUseSkill", this.useForNode);
                        };
                    }
                    mainContentDiv.ondragstart = (e) => {
                        this.setAttribute("id", "chosen-card");
                        e.dataTransfer.setData("text", "chosen-card");
                        mainContentDiv.ondragend = (e) => {
                            this.removeAttribute("id");
                            mainContentDiv.ondragend = null;
                        }
                    }
                } else {
                    mainContentDiv.removeAttribute("draggable");
                    mainContentDiv.ondragstart = null;
                    if (use) {
                        use?.classList?.remove?.("allowed");
                        use.onpointerdown = null;
                    }
                    this.useForNode = null;
                }
            }; break;
            case "markwords": {
                if (newValue) {
                    this.markTextNode(".main-content", newValue.split(" "), { root: "shadowRoot" })
                } else {
                    this.unmarkTextNode(".main-content", { root: "shadowRoot" });
                }
            }
        }
    }
    /**
     * @param {"like"|"use"|"remove"} type 
     */
    triggerInteractEvent(type) {
        const event = new Event("pointerdown")
        switch (type) {
            case "like": {
                this.shadowRoot.querySelector(".interact-bar>.like")?.dispatchEvent?.(event);
            }; break;
            case "use": {
                this.shadowRoot.querySelector(".interact-bar>.use")?.dispatchEvent?.(event);
            }; break;
            case "remove": {
                this.shadowRoot.querySelector(".interact-bar>.remove")?.dispatchEvent?.(event);
            }; break;
        }
    }
}
class HTMLNonameSkillInfoCardElement extends HTMLNonameInfoCardElement {
    static observedAttributes = super.observedAttributes.concat("skill-info");
    #skillInfo;
    constructor() {
        super();
    }
    connectedCallback() {
        super.connectedCallback();
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "skill-info") {
            const showInfo = this.shadowRoot.querySelector(".show-info");
            showInfo.replaceChildren();
            const skillInfo = this.#skillInfo;
            if (skillInfo) {
                const fragment = document.createDocumentFragment();
                const mainContentDiv = document.createElement('div');
                mainContentDiv.className = 'main-content';
                mainContentDiv.innerHTML =
                    `${skillInfo.name}(${skillInfo.id})</br>
                    ${skillInfo.description}`
                fragment.appendChild(mainContentDiv);
                if (skillInfo.audios?.length) {
                    const audioUl = document.createElement('ul');
                    skillInfo.audios.forEach(audio => {
                        const li = document.createElement('li');
                        li.dataset.audioListItem = true;
                        const span = document.createElement('span');
                        span.dataset.audioSrc = audio.file
                        li.append(audio.text, span);
                        audioUl.appendChild(li);
                    });
                    mainContentDiv.appendChild(audioUl);
                }
                showInfo.replaceChildren(fragment);
            }
        }
        else super.attributeChangedCallback(name, oldValue, newValue);
    }
    /**
     * @param {any} val
     */
    set skillInfo(val) {
        this.#skillInfo = val;
        this.setAttribute("skill-info", Boolean(val));
    }
}
class HTMLNonameCharacterInfoCardElement extends HTMLNonameInfoCardElement {
    static observedAttributes = super.observedAttributes.concat("character-info", "skill-likable", "skill-usable")
    #characterInfo;
    constructor() {
        super();
    }
    connectedCallback() {
        super.connectedCallback();
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "character-info") {
            const showInfo = this.shadowRoot.querySelector(".show-info");
            showInfo.replaceChildren();
            const characterInfo = this.#characterInfo;
            if (characterInfo) {
                const fragment = document.createDocumentFragment();
                const mainContentDiv = document.createElement('div');
                mainContentDiv.className = 'main-content';
                let innerHTML = "";
                innerHTML += `${characterInfo.name || "未命名武将"}(${characterInfo.id || ""})</br>`;
                innerHTML += `武将包：${characterInfo.packageName || "无所属包"}</br>`;
                innerHTML += `分包：${characterInfo.characterSortName || "未分包"}</br>`;;
                if (characterInfo.sex) innerHTML += `性别：${characterInfo.sex}</br>`;
                if (characterInfo.group) innerHTML += `势力：${characterInfo.group}</br>`;
                if (characterInfo.hp) innerHTML += `体力：${characterInfo.hp}/${characterInfo.maxHp || characterInfo.hp}</br>`;
                if (characterInfo.hujia) innerHTML += `护甲：${characterInfo.hujia}</br>`;
                if (characterInfo.clans) innerHTML += `宗族：${characterInfo.clans}</br>`;
                innerHTML += `技能：</br>${characterInfo?.skillList?.join?.("</br>") || "无"}`;
                mainContentDiv.innerHTML = innerHTML;
                mainContentDiv.setBackground(characterInfo.id, "character");
                if (characterInfo.dieAudios?.length) {
                    const audioUl = document.createElement('ul');
                    characterInfo.dieAudios.forEach(audio => {
                        const li = document.createElement('li');
                        li.dataset.audioListItem = true;
                        const span = document.createElement('span');
                        span.dataset.audioSrc = audio.file
                        li.append(audio.text, span);
                        audioUl.appendChild(li);
                    });
                    mainContentDiv.appendChild(audioUl);
                }
                fragment.appendChild(mainContentDiv);
                if (characterInfo.skills) {
                    const skillsUl = document.createElement('ul');
                    characterInfo.skills.forEach(skillInfoItem => {
                        const skillCard = document.createElement('skill-info-card');
                        skillCard.setAttribute('skill-id', skillInfoItem.id);
                        skillCard.skillInfo = skillInfoItem;
                        skillsUl.appendChild(skillCard);
                    });
                    fragment.appendChild(skillsUl);
                }
                showInfo.appendChild(fragment);
            }
        } else if (name === "skill-likable") {
            if (newValue === "true") {
                this.shadowRoot.querySelectorAll("skill-info-card").forEach(skillCard => {
                    skillCard.setAttribute("likable", "true");
                })
            } else {
                this.shadowRoot.querySelectorAll("skill-info-card").forEach(skillCard => {
                    skillCard.setAttribute("likable", "false");
                })
            }
        } else if (name === "skill-usable") {
            if (newValue === "true") {
                this.shadowRoot.querySelectorAll("skill-info-card").forEach(skillCard => {
                    skillCard.setAttribute("usable", "true");
                })
            } else {
                this.shadowRoot.querySelectorAll("skill-info-card").forEach(skillCard => {
                    skillCard.setAttribute("usable", "false");
                })
            }
        } else {
            super.attributeChangedCallback(name, oldValue, newValue);
        }
    }
    /**
     * @param {any} val
     */
    set characterInfo(val) {
        this.#characterInfo = val;
        this.setAttribute("character-info", Boolean(val));
    }
}
class HTMLNonameSkinInfoCardElement extends HTMLNonameInfoCardElement {
    static observedAttributes = super.observedAttributes.concat("src", "skin-info")
    #skinInfo
    constructor() {
        super();
    }
    connectedCallback() {
        super.connectedCallback();
    }
    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case "skin-info": {
                const showInfo = this.shadowRoot.querySelector(".show-info");
                const skinInfo = this.#skinInfo;
                const fragment = document.createDocumentFragment();
                const mainContentDiv = document.createElement('div');
                mainContentDiv.className = "main-content";
                const img = document.createElement("img");
                if (this.hasAttribute("src")) {
                    img.setAttribute("src", this.getAttribute("src"));
                }
                const footer = document.createElement("footer");
                footer.className = "font-songti font-small";
                footer.innerHTML += `<span>${skinInfo.quality}</span>
                <span>${skinInfo.artist}</span>
                <span>${skinInfo.skinName}</span>`
                mainContentDiv.append(img);
                fragment.append(mainContentDiv, footer);
                showInfo.replaceChildren(fragment);
            }; break;
            case "src": {
                if (oldValue === newValue) break;
                const img = this.shadowRoot.querySelector("img");
                img?.setAttribute?.("src", newValue);
            }; break;
            default: {
                super.attributeChangedCallback(name, oldValue, newValue);
            }; break;
        }
    }
    /**
     * @param {any} val
     */
    set skinInfo(val) {
        this.#skinInfo = val;
        this.setAttribute("skin-info", Boolean(val));
    }
}
class HTMLNonameAudioInfoCardElement extends HTMLNonameInfoCardElement {
    static observedAttributes = super.observedAttributes.concat("src", "value");
    get audio() {
        return this.shadowRoot.querySelector("audio");
    }
    get audioText() {
        return this.shadowRoot.querySelector("[contenteditable]")
    }
    constructor() {
        super();
    }
    connectedCallback() {
        super.connectedCallback();
        const showInfo = this.shadowRoot.querySelector(".show-info");
        const fragment = document.createDocumentFragment();
        const mainContentDiv = document.createElement('div');
        mainContentDiv.className = "main-content";
        const textContainer = document.createElement("div");
        textContainer.textContent = "语音台词："
        const audio = document.createElement("span");
        audio.setAttribute("data-audio-src", this.getAttribute("src") || "");
        const text = document.createElement("div");
        text.contentEditable = true;
        text.textContent = this.getAttribute("value") || "";
        textContainer.append(audio, text);
        mainContentDiv.append(textContainer);
        fragment.append(mainContentDiv);
        showInfo.replaceChildren(fragment);
        new MutationObserver(() => {
            if (text.textContent !== this.getAttribute("value")){
                this.setAttribute("value", text.textContent);
            } 
        }).observe(text, { characterData: true, childList: true, subtree: true, });
    }
    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case "src": {
                if (oldValue === newValue) break;
                const audio = this.shadowRoot.querySelector("[data-audio-src]");
                audio?.setAttribute?.("data-audio-src", newValue);
            }; break;
            case "value": {
                if (oldValue === newValue) break;
                const text = this.shadowRoot.querySelector("[contenteditable]");
                this.triggerEvent("audioTextChange", { oldValue, newValue });
                if (text.textContent !== newValue) {
                    text.textContent = newValue;
                }
            }; break;
            default: {
                super.attributeChangedCallback(name, oldValue, newValue);
            }; break;
        }
    }
}
customElements.define("audio-info-card", HTMLNonameAudioInfoCardElement);
customElements.define("skin-info-card", HTMLNonameSkinInfoCardElement);
customElements.define("skill-info-card", HTMLNonameSkillInfoCardElement);
customElements.define("character-info-card", HTMLNonameCharacterInfoCardElement);