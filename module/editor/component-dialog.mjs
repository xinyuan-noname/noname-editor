import { HTMLNonameFocusUIElement } from "./component-base.mjs";
const groupDiyFragment = (() => {
    const fragment = new DocumentFragment();

    const diyGroupDiv = document.createElement('div');
    diyGroupDiv.className = 'diyGroup';

    const canvas = document.createElement('canvas');
    canvas.width = 68;
    canvas.height = 68;
    const text = document.createElement("p");
    const form = document.createElement('form');

    const groupDiv = document.createElement('div');
    groupDiv.innerHTML = `<label for="group">势力名称</label><input id="group" name="group" type="text" max-length="2">`;

    const groupIdDiv = document.createElement('div');
    groupIdDiv.innerHTML = `<label for="group-id">势力id</label><input id="group-id" name="group-id" type="text">`;

    const colorDiv = document.createElement('div');
    colorDiv.innerHTML = `<label for="color">设置阴影颜色</label><input id="color" name="color" type="color">`;

    const blurDiv = document.createElement('div');
    blurDiv.innerHTML = `<label for="blur">设置阴影模糊程度</label><input id="blur" type="range" name="blur" value="10" max="25">`;

    const fontListDiv = document.createElement('div');
    fontListDiv.className = 'font-list';
    [
        ["minifanzhuanshu", "迷你繁篆书"],
        ['xiaozhuan', "方正小篆体"],
        ["xinwei", "华文新魏_GBK"],
        ['huangcao', "方正黄草_GBK"],
        ['yuanli', "方正北魏楷书_GBK"],
        ['xingkai', "方正行楷_GBK"],
        ['shousha', "方正隶变_GBK"],
    ].forEach(function ([fontName, fontCnName], index) {
        const fontItemDiv = document.createElement('div');
        fontListDiv.appendChild(fontItemDiv);
        const label = document.createElement('label');
        label.setAttribute('for', fontName);
        label.style.fontFamily = fontName;
        label.textContent = fontCnName;
        label.title = fontCnName;
        fontItemDiv.appendChild(label);
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'font-family';
        radio.value = fontName;
        radio.id = fontName;
        if (index === 0) radio.setAttribute("checked", "true");
        fontItemDiv.appendChild(radio);
    });
    form.append(groupDiv, groupIdDiv, colorDiv, blurDiv, fontListDiv);
    diyGroupDiv.append(canvas, text, form);
    fragment.appendChild(diyGroupDiv);
    return fragment;
})();
const groupDiyStyle = (() => {
    const style = document.createElement("style");
    style.textContent =
        `.diyGroup { height: 100%; width: 100%; font-size:24px; display: flex; flex-direction: column; align-item: center; justify-content: center; }

        p{ display:flex; align-item: center; justify-content: center; margin: 0; font-size: 16px; color: #fff; }

        canvas{  margin: 10px auto; }

        .font-list{ margin-top: 10px; flex-wrap: wrap; font-size: 16px; }

        .font-list>div{ display: flex; align-item: center; flex-direction: column; line-height:16px; margin: 0 5px; }`
    return style;
})();
const textFragment = (() => {
    const fragment = new DocumentFragment();
    const textEditorWrapper = document.createElement("div");
    const textEditorToolBar = document.createElement("div");
    const textEditorContainer = document.createElement("div");
    textEditorToolBar.setAttribute("id", "text-editor-toolbar-container");
    textEditorContainer.setAttribute("id", "text-editor-container");
    textEditorWrapper.style.cssText = `display:flex;flex-direction:column;height:100%;width:100%;background:#e0e0e0`
    textEditorContainer.style.cssText = `margin-top:5px;flex:1;max-height:100%;width:100%;overflow:auto;`
    textEditorWrapper.append(textEditorToolBar, textEditorContainer);
    fragment.append(textEditorWrapper);
    return fragment;
})();
class HTMLNonameDialogHTML extends HTMLNonameFocusUIElement {
    static dialogStack = [];
    constructor() {
        super();
        const shadow = this.attachShadow({ mode: "open" });
        //$: shadow , html/dialog.html//
shadow.innerHTML=`
<style>
    :host {
        height: 100%;
        width: 100%;
        z-index: 1024;
        position: absolute !important;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
    }

    p {
        margin: 0;
        font-weight: 900;
        font-size: 1.5em;
    }

    .curtain {
        display: block;
        position: absolute;
        height: 100%;
        width: 100%;
        background-color: rgba(255, 255, 255, 0.4);
        z-index: -1;
    }

    .remove {
        cursor: pointer;
        width: 1em;
    }

    .dialog {
        height: var(--dialog-height, 315px);
        width: var(--dialog-width, 560px);
        border-radius: 13px;
        background: #e0e0e0;
        box-shadow: 0 0 10px #bebebe, 0 0 10px #ffffff, 0 0 5px black;
        padding: 5px;
        display: flex;
        flex-direction: column;
        color: #000;
        text-shadow: 1px 1px #fff;
    }

    .dialog form>div {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .content {
        height: 95%;
    }

    .actions {
        display: flex;
        justify-content: center;
        margin-top: 25px;
    }

    .actions>div {
        background: #e6e6e6;
        box-shadow: 0px 0px 3px #272727;
        border-radius: 5px;
        margin: 0 10px;
        padding: 5px;
        font-size: 28px;
        color: rgb(200, 200, 200);
        cursor: pointer;
    }

    .actions.invalid .confirm {
        display: none;
    }

    .actions.forced .cancel {
        display: none;
    }
</style>
<div class="curtain"></div>
<div class="dialog">
    <header>
        <p></p>
    </header>
    <section class="content"></section>
</div>
<div class="actions">
    <div class="confirm">确认</div>
    <div class="cancel">取消</div>
</div>`
//#: shadow , html/dialog.html//
        this.#listenLoad();
    }
    dialogendListener = [];
    dialogcancelListener = [];
    connectedCallback() {
        if (HTMLNonameDialogHTML.dialogStack.length) {
            HTMLNonameDialogHTML.dialogStack.forEach(dialog => dialog.close());
        }
        HTMLNonameDialogHTML.dialogStack.push(this);
    }
    static observedAttributes = ["type", "headline", "message", "placeholder", "height", "width", "forced", "required", "invalid"];
    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        switch (name) {
            case "type": {
                const tempStyle = this.shadowRoot.querySelector("style#temp");
                if (tempStyle) tempStyle.remove();
                if (this.hasAttribute("forced")) this.removeAttribute("forced");
                if (this.hasAttribute("headline")) this.removeAttribute("headline");
                if (this.hasAttribute("message")) this.removeAttribute("message");
                if (this.dialogendListener.length) {
                    const dialog = this.shadowRoot.querySelector(".dialog");
                    this.dialogendListener.forEach(listener => {
                        dialog.removeEventListener("dialogend", listener);
                    })
                }
                if (this.dialogcancelListener.length) {
                    const dialog = this.shadowRoot.querySelector(".dialog");
                    this.dialogcancelListener.forEach(listener => {
                        dialog.removeEventListener("dialogcancel", listener);
                    })
                }
                this.querySelectorAll(":scope>*").forEach((node) => {
                    node.remove();
                });
                switch (newValue) {
                    case "alert": {
                        this.setAttribute("forced", true);
                    }; break;
                    case "confirm": ; break;
                    /*
                     * 以下三类为《魂氏编辑器》新增：供技能编辑器内核并轨使用
                     *  - multiline  多行文本（初始值取 payload，须在设置 type 之前设置）
                     *  - range      数值滑条（min/max/step/value 属性，实时显示）
                     *  - switch-list 开关列表（payload 传 JSON：{ key: { label, checked } }，须在设置 type 之前设置）
                     */
                    /*
                     * multi-input：多字段输入（对应内核的 multiprompt + appendPrompt 链式追加）
                     * payload 传 JSON 数组：[{ label, placeholder, value, type }]
                     * 返回按顺序排列的字符串数组
                     */
                    /*
                     * choose：按钮式单选列表
                     * payload 传 JSON 字符串数组，点选即 resolve 其下标（0 起）
                     */
                    case "choose": {
                        let options = [];
                        try {
                            options = JSON.parse(this.getAttribute("payload") || "[]");
                        } catch (err) {
                            console.error("choose 的 payload 不是合法 JSON", err);
                        }
                        if (!Array.isArray(options)) options = [];
                        const style = document.createElement("style");
                        style.textContent = `
.choose-list { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
.choose-list>button { font: inherit; font-size: 1.1em; padding: 8px 14px; border-radius: 6px;
  border: 1px solid #6b6b6b; background: #e4d5b7; color: #000; cursor: pointer; }
.choose-list>button:hover { background: #f3e6c9; }
.choose-list>button.selected { outline: 2px solid #7093DB; }
`;
                        this.appendTempStyle(style);
                        const { form, container } = this.appendInput();
                        container.remove();
                        const list = document.createElement("div");
                        list.className = "choose-list";
                        let picked = -1;
                        options.forEach((text, index) => {
                            const btn = document.createElement("button");
                            btn.type = "button";
                            btn.textContent = text;
                            btn.addEventListener("click", () => {
                                picked = index;
                                Array.from(list.children).forEach((n, i) => n.classList.toggle("selected", i === index));
                            });
                            list.appendChild(btn);
                        });
                        form.appendChild(list);
                        this.#whenEnd(() => {
                            this.#finishReslove(picked);
                        });
                        //取消/关闭时也要 resolve，否则调用方 await 会一直悬住
                        this.#whenCancel(() => {
                            this.#finishReslove(-1);
                        });
                    }; break;
                    case "multi-input": {
                        let fields = [];
                        try {
                            fields = JSON.parse(this.getAttribute("payload") || "[]");
                        } catch (err) {
                            console.error("multi-input 的 payload 不是合法 JSON", err);
                        }
                        if (!Array.isArray(fields)) fields = [];
                        const inputs = [];
                        fields.forEach((field, index) => {
                            const item = field || {};
                            const config = { id: `multi-input-${index}` };
                            if (item.type) config.type = item.type;
                            const { input } = this.appendInput(item.label || "", config);
                            if (item.placeholder) input.placeholder = item.placeholder;
                            if (item.value !== undefined && item.value !== null) input.value = item.value;
                            inputs.push(input);
                        });
                        this.#whenEnd(() => {
                            this.#finishReslove(inputs.map(input => input.value));
                        });
                    }; break;
                    case "multiline": {
                        const { container, input } = this.appendInput();
                        const textarea = document.createElement("textarea");
                        textarea.id = "multiline";
                        textarea.value = this.getAttribute("payload") || "";
                        if (this.hasAttribute("placeholder")) textarea.placeholder = this.getAttribute("placeholder");
                        container.replaceChild(textarea, input);
                        this.#whenEnd(() => {
                            this.#finishReslove(textarea.value);
                        });
                    }; break;
                    case "range": {
                        const { input } = this.appendInput();
                        input.type = "range";
                        input.min = this.getAttribute("min") ?? 0;
                        input.max = this.getAttribute("max") ?? 100;
                        input.step = this.getAttribute("step") ?? 1;
                        input.value = this.getAttribute("value") ?? input.min;
                        const shower = document.createElement("b");
                        shower.textContent = input.value;
                        input.after(shower);
                        input.addEventListener("input", () => (shower.textContent = input.value));
                        this.#whenEnd(() => {
                            this.#finishReslove(Number(input.value));
                        });
                    }; break;
                    case "search-select": {
                        let map = {};
                        try {
                            map = JSON.parse(this.getAttribute("payload") || "{}");
                        } catch (err) {
                            console.error("search-select 的 payload 不是合法 JSON", err);
                        }
                        const single = this.hasAttribute("single");
                        const chosen = new Set();
                        const style = document.createElement("style");
                        style.textContent = `
.search-select-list { list-style: none; margin: 4px 0 0; padding: 0; max-height: 55%; overflow: auto; text-align: left; }
.search-select-list>li { padding: 3px 6px; border-radius: 3px; cursor: pointer; font-size: 0.9em; }
.search-select-list>li:hover { background: rgba(0, 0, 0, 0.12); }
.search-select-list>li.chosen { background: #cfe3ff; }
.search-select-list>li.empty { opacity: 0.6; cursor: default; }
`;
                        this.appendTempStyle(style);
                        const { container, input } = this.appendInput("搜索");
                        input.id = "search-select";
                        const list = document.createElement("ul");
                        list.className = "search-select-list";
                        container.after(list);
                        const render = (keyword = "") => {
                            list.innerHTML = "";
                            const keys = Object.keys(map).filter(key => {
                                if (!keyword) return true;
                                return String(map[key]).includes(keyword) || String(key).includes(keyword);
                            }).slice(0, 200);
                            keys.forEach(key => {
                                const li = document.createElement("li");
                                li.dataset.key = key;
                                li.textContent = map[key];
                                if (chosen.has(key)) li.classList.add("chosen");
                                list.appendChild(li);
                            });
                            if (!keys.length) {
                                const li = document.createElement("li");
                                li.className = "empty";
                                li.textContent = "无匹配项";
                                list.appendChild(li);
                            }
                        };
                        input.addEventListener("input", () => render(input.value.trim()));
                        list.addEventListener("click", e => {
                            const li = e.target.closest("li[data-key]");
                            if (!li) return;
                            const key = li.dataset.key;
                            //单选：点选即出结果
                            if (single) {
                                this.#finishReslove(key);
                                return;
                            }
                            if (chosen.has(key)) {
                                chosen.delete(key);
                                li.classList.remove("chosen");
                            } else {
                                chosen.add(key);
                                li.classList.add("chosen");
                            }
                        });
                        render();
                        this.#whenEnd(() => {
                            this.#finishReslove(single ? null : Array.from(chosen));
                        });
                    }; break;
                    case "list-manage": {
                        let map = {};
                        try {
                            map = JSON.parse(this.getAttribute("payload") || "{}");
                        } catch (err) {
                            console.error("list-manage 的 payload 不是合法 JSON", err);
                        }
                        const removed = [];
                        const seeText = this.getAttribute("see-text") || "查看";
                        const deleteText = this.getAttribute("delete-text") || "删除";
                        const style = document.createElement("style");
                        style.textContent = `
.list-manage-row { display: flex; align-items: center; gap: 6px; padding: 3px 4px; border-bottom: 1px solid rgba(0, 0, 0, 0.12); font-size: 0.9em; text-align: left; }
.list-manage-row>.desc { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.list-manage-row>.detail { flex-basis: 100%; opacity: 0.8; font-size: 0.9em; padding: 2px 0; }
.list-manage-row.expanded { flex-wrap: wrap; }
.list-manage-row.marked>.desc { text-decoration: line-through; opacity: 0.5; }
button { font: inherit; padding: 1px 6px; border-radius: 3px; border: 1px solid #888; background: #e6e6e6; cursor: pointer; }
`;
                        this.appendTempStyle(style);
                        const { form, container } = this.appendInput();
                        container.remove();
                        Object.keys(map).forEach(key => {
                            const item = map[key] || {};
                            const row = document.createElement("div");
                            row.className = "list-manage-row";
                            row.dataset.key = key;
                            const desc = document.createElement("span");
                            desc.className = "desc";
                            desc.textContent = key;
                            const seeButton = document.createElement("button");
                            seeButton.type = "button";
                            seeButton.textContent = seeText;
                            seeButton.addEventListener("click", () => {
                                const expanded = row.classList.toggle("expanded");
                                seeButton.textContent = expanded ? "收起" : seeText;
                                if (!expanded) return;
                                let detail = row.querySelector(".detail");
                                if (!detail) {
                                    detail = document.createElement("div");
                                    detail.className = "detail";
                                    row.appendChild(detail);
                                }
                                //与原有 seeDelete 行为一致：详情按 HTML 渲染
                                detail.innerHTML = item.desc || item.link || "（无详情）";
                            });
                            const delButton = document.createElement("button");
                            delButton.type = "button";
                            delButton.textContent = deleteText;
                            delButton.addEventListener("click", () => {
                                const index = removed.indexOf(key);
                                if (index >= 0) {
                                    removed.splice(index, 1);
                                    row.classList.remove("marked");
                                    delButton.textContent = deleteText;
                                } else {
                                    removed.push(key);
                                    row.classList.add("marked");
                                    delButton.textContent = "撤销";
                                }
                            });
                            row.append(desc, seeButton, delButton);
                            form.append(row);
                        });
                        this.#whenEnd(() => {
                            this.#finishReslove(removed.slice());
                        });
                    }; break;
                    case "switch-list": {
                        let map = {};
                        try {
                            map = JSON.parse(this.getAttribute("payload") || "{}");
                        } catch (err) {
                            console.error("switch-list 的 payload 不是合法 JSON", err);
                        }
                        const state = {};
                        const { form, container } = this.appendInput();
                        container.remove();
                        Object.keys(map).forEach(key => {
                            const item = map[key] || {};
                            const label = document.createElement("label");
                            const box = document.createElement("input");
                            box.type = "checkbox";
                            box.checked = Boolean(item.checked);
                            state[key] = box.checked;
                            box.addEventListener("change", () => (state[key] = box.checked));
                            label.append(box, document.createTextNode(item.label ?? key));
                            form.append(label);
                        });
                        this.#whenEnd(() => {
                            this.#finishReslove({ ...state });
                        });
                    }; break;
                    case "prompt": {
                        const { input } = this.appendInput();
                        this.#whenEnd(() => {
                            this.#finishReslove(input.value);
                        });
                    }; break;
                    case "select": {
                        const { form } = this.appendSelect('', {}, { id: "select", name: "select" });
                        this.#whenEnd(() => {
                            const { select } = Object.fromEntries(new FormData(form))
                            this.#finishReslove(select);
                        });
                    }; break;
                    case "select-append": {
                        const { form, select } = this.appendSelect('', {}, { id: "select", name: "select" });
                        const { input: idInput } = this.appendInput("", { id: "id-input" });
                        const { input: nameInput } = this.appendInput("", { id: "name-input" });
                        const { button } = this.appendButton("添加新项");
                        button.addEventListener("pointerup", () => {
                            const option = document.createElement("option");
                            const id = idInput.value, name = nameInput.value;
                            if (!this.#appendCheck || this.#appendCheck?.(id, name)) {
                                option.value = id;
                                option.textContent = name;
                                idInput.value = ""; nameInput.value = "";
                                option.selected = true;
                                select.appendChild(option);
                            }
                            this.#appendCallback?.(id, name);
                        })
                        this.#whenEnd(() => {
                            const { select } = Object.fromEntries(new FormData(form))
                            this.#finishReslove(select);
                        });
                    }; break;
                    case "id-character": {
                        const { input } = this.appendInput("武将id");
                        input.addEventListener("keyup", e => {
                            e.stopPropagation();
                            if (this.checkQuery("characterId", { id: input.value })) {
                                this.removeAttribute("invalid");
                            } else {
                                this.setAttribute("invalid", true);
                            }
                        });
                        input.addEventListener("change", e => e.stopPropagation())
                        this.whenEnd((e, reslove) => {
                            e.preventDefault();
                            this.remove();
                            reslove(input.value);
                        });
                    }; break;
                    case "diygroup": {
                        this.appendTempStyle(groupDiyStyle.cloneNode(true))
                        const content = this.shadowRoot.querySelector(".content");
                        content.append(groupDiyFragment.cloneNode(true));
                        const form = content.querySelector("form");
                        const group = content.querySelector("input#group");
                        const groupId = content.querySelector("input#group-id");
                        const canvas = content.querySelector("canvas");
                        const text = content.querySelector("p");
                        const context = canvas.getContext('2d');
                        group.addEventListener("change", () => {
                            groupId.value = this.textQuery("pinyin", { text: group.value, withTone: false }).join("");
                        });
                        form.addEventListener("change", () => {
                            const map = new Map(new FormData(form));
                            const groupText = map.get("group");
                            const color = map.get("color");
                            const fontFamily = map.get("font-family")
                            const blur = map.get("blur");
                            if (!groupText.length) return;
                            if (groupText.length === 1) {
                                this.canvasQuery("drawLineText", { context, text: groupText, canvas, shadowBlur: blur, fontFamily, shadowColor: color });
                            } else if (groupText.length === 2) {
                                this.canvasQuery("drawLineText", { context, text: groupText[0], canvas, offsetX: -9, offsetY: -9, fontSize: "36px", shadowBlur: blur, fontFamily, shadowColor: color });
                                this.canvasQuery("drawLineText", { context, text: groupText[1], clear: false, canvas, offsetX: 9, offsetY: 9, fontSize: "36px", shadowBlur: blur, fontFamily, shadowColor: color });
                            }
                            text.textContent = groupText;
                            text.style.cssText = `text-shadow: ${color} 0 0 2px, ${color} 0 0 2px, ${color} 0 0 2px, #000 0 0 1px;`
                        });
                        this.#whenEnd(async (e) => {
                            e.preventDefault();
                            const map = new Map(new FormData(form));
                            const color = map.get("color")
                            const imageData = await this.canvasQuery("exportAsStaticImage", { canvas, height: 41, dataForm: "blobURL" });
                            this.#finishReslove({
                                imageData,
                                id: map.get("group-id"),
                                name: map.get("group"),
                                textShadow: `${color} 0 0 2px, ${color} 0 0 2px, ${color} 0 0 2px, #000 0 0 1px`
                            });
                            this.remove();
                        });
                    }; break;
                    //以下引用wangDditor
                    case "text": {
                        let editor;
                        const content = this.shadowRoot.querySelector(".content");
                        const slot = this.appendChildViaSlot(textFragment.cloneNode(true), "text", content);
                        const loadEditor = () => {
                            const { createEditor, createToolbar } = window.wangEditor;
                            editor = createEditor({
                                selector: '#text-editor-container',
                                config: {},
                                html: this.getAttribute("message") || void 0,
                                mode: 'default'
                            });
                            createToolbar({
                                editor,
                                selector: '#text-editor-toolbar-container',
                                config: {
                                    excludeKeys: ["headerSelect", "blockquote", "insertTable", 'group-image', 'group-video', 'group-justify', 'group-indent', "fontFamily"]
                                },
                                mode: 'default'
                            })
                            this.setAttribute("height", 475);
                        }
                        //因为不确定多久能够检测到id 这里0.1s检测1次
                        new Promise(reslove => {
                            const timer = setInterval(() => {
                                if (document.querySelector('#text-editor-container') && document.querySelector('#text-editor-toolbar-container')) {
                                    clearInterval(timer);
                                    reslove();
                                }
                            }, 100);
                        }).then(() => {
                            "wangEditor" in window ? loadEditor() : (() => {
                                this.loadCss(`../libs/wangeditor/style`, { root: document.head });
                                import("./libs/wangeditor/index.min.js").then(loadEditor);
                            })();
                        })
                        this.#whenEnd(async (e) => {
                            const sourceHTML = editor?.getHtml();
                            if (sourceHTML) {
                                const parser = new DOMParser();
                                const tempDoc = parser.parseFromString(sourceHTML, "text/html");
                                const ps = tempDoc.body.querySelectorAll(":scope>p")
                                ps.forEach((p) => {
                                    const nodes = [], flag = tempDoc.body.lastElementChild === p;
                                    nodes.push(...p.childNodes);
                                    if (!flag) nodes.push(document.createElement("br"));
                                    p.replaceWith(...nodes);
                                })
                                const noPElementHTML = tempDoc.body.innerHTML;
                                this.#finishReslove({
                                    sourceHTML,
                                    noPElementHTML
                                });
                            } else {
                                this.#finishReslove({
                                    sourceHTML: "<p></p>",
                                    noPElementHTML: ""
                                })
                            }

                        });
                    }; break;
                    default: break;
                }
                this.updateWithValidity();
            }; break;
            case "headline": {
                const p = this.shadowRoot.querySelector("header p");
                p.textContent = newValue;
            }; break;
            case "message": {
                switch (this.getAttribute("type")) {
                    case "alert": case "confirm": {
                        const content = this.shadowRoot.querySelector(".content");
                        content.textContent = newValue;
                    }; break;
                    case "prompt": case "select": {
                        const label = this.shadowRoot.querySelector("label");
                        label.textContent = newValue;
                    }; break;
                    case "text": {
                        const editor = this.querySelector("#text-editor-container");
                        if (typeof editor.getHtml === "function" && editor.getHtml() !== newValue) editor.setHtml(newValue);
                    }; break;
                }
            }; break;
            case "placeholder": {
                if (this.getAttribute("type") === "prompt") {
                    const input = this.shadowRoot.querySelector("input");
                    input.placeholder = newValue;
                }
            }; break;
            case "height": {
                this.style.setProperty("--dialog-height", parseFloat(newValue) + "px")
            }; break;
            case "width": {
                this.style.setProperty("--dialog-width", parseFloat(newValue) + "px")
            }; break;
            case "forced": {
                const actions = this.shadowRoot.querySelector(".actions");
                if (newValue) {
                    actions.classList.add("forced");
                } else {
                    actions.classList.remove("forced");
                }
            }; break;
            case "required": {
                switch (this.getAttribute("type")) {
                    case "prompt": {
                        const input = this.shadowRoot.querySelector("input");
                        input.setAttribute("required", newValue);
                    }; break;
                    case "select": {
                        const select = this.shadowRoot.querySelector("select");
                        select.setAttribute("required", newValue);
                    }; break;
                }
            }; break;
            case "invalid": {
                const actions = this.shadowRoot.querySelector(".actions");
                if (newValue) actions.classList.add("invalid");
                else if (newValue == false || newValue == null) actions.classList.remove("invalid");
            }; break;
            default: break;
        }
    }
    disconnectedCallback() {
        HTMLNonameDialogHTML.dialogStack.pop();
        const length = HTMLNonameDialogHTML.dialogStack.length;
        if (length) HTMLNonameDialogHTML.dialogStack[length - 1].show();
    }
    #listenLoad() {
        const confirm = this.shadowRoot.querySelector(".confirm");
        const cancel = this.shadowRoot.querySelector(".cancel");
        const dialog = this.shadowRoot.querySelector(".dialog");
        confirm.addEventListener("pointerup", () => {
            this.sendEvent("dialogend", dialog, void 0, { cancelable: true });
        });
        cancel.addEventListener("pointerup", () => {
            this.sendEvent("dialogcancel", dialog, void 0, { cancelable: true });
        });
        dialog.addEventListener("dialogend", (e) => {
            setTimeout(() => {
                if (!e.defaultPrevented) {
                    this.remove();
                    this.#finishReslove(true);
                }
            }, 0)
        });
        dialog.addEventListener("dialogcancel", (e) => {
            setTimeout(() => {
                if (!e.defaultPrevented) {
                    this.remove();
                    this.#finishReslove(false);
                }
            }, 0)
        });
        dialog.addEventListener("change", (e) => {
            this.updateWithValidity();
        });
    }
    close() {
        this.setAttribute("hidden", true);
    }
    show() {
        this.removeAttribute("hidden");
    }
    wait() {
        return new Promise((resolve) => {
            this.tempResolve = resolve;
        })
    }
    #finishReslove(data) {
        if (typeof this.tempResolve === "function") {
            this.tempResolve(data);
            this.tempResolve = null;
        }
    }
    //按下确认键时的行为
    #whenEnd(listener, options) {
        const dialog = this.shadowRoot.querySelector(".dialog");
        dialog.addEventListener("dialogend", listener, options);
        this.dialogendListener.push(listener);
    }
    whenEnd(callback, options) {
        const dialog = this.shadowRoot.querySelector(".dialog");
        const listener = (e) => {
            callback.apply(this, [e, this.#finishReslove.bind(this)])
        }
        dialog.addEventListener("dialogend", listener, options);
        this.dialogendListener.push(listener);
    }
    //按下取消键时的行为
    #whenCancel(listener, options) {
        const dialog = this.shadowRoot.querySelector(".dialog");
        dialog.addEventListener("dialogcancel", listener, options);
        this.dialogcancelListener.push(listener);
    }
    whenCancel(callback, options) {
        const dialog = this.shadowRoot.querySelector(".dialog");
        const listener = (e) => {
            callback.apply(this, [e, this.#finishReslove.bind(this)])
        }
        dialog.addEventListener("dialogcancel", listener, options);
        this.dialogendListener.push(listener);
    }
    appendTempStyle(style) {
        if (style instanceof HTMLStyleElement) {
            style.setAttribute("id", "temp");
            this.shadowRoot.prepend(style);
        }
    }
    toggleInvalidWhen(initial, promise, callback) {
        if (initial === false) this.removeAttribute("invalid")
        else this.setAttribute("invalid", true);
        promise.then(() => {
            if (initial === false) this.setAttribute("invalid", true);
            else this.removeAttribute("invalid");
            if (typeof callback === "function") callback();
        })
    }
    updateWithValidity() {
        const form = this.shadowRoot.querySelector("form");
        if (form && form.checkValidity() === false) this.setAttribute("invalid", true)
        else this.removeAttribute("invalid")
    }
    appendInput(subTitle, config) {
        const content = this.shadowRoot.querySelector(".content");
        const form = content.querySelector("form") || (() => {
            const e = document.createElement("form");
            content.appendChild(e);
            e.addEventListener("submit", e => e.preventDefault());
            return e
        })();
        const div = document.createElement('div');
        const label = document.createElement("label");
        const input = document.createElement("input");
        if (subTitle) label.textContent = subTitle;
        if (config) {
            for (const attr in config) {
                if (attr === "id") label.setAttribute("for", config[attr]);
                input.setAttribute(attr, config[attr]);
            }
        }
        div.append(label, input);
        form.append(div);
        return { form, container: div, label, input };
    }
    appendSelect(subTitle, options, config) {
        const content = this.shadowRoot.querySelector(".content");
        const form = content.querySelector("form") || (() => {
            const e = document.createElement("form");
            content.appendChild(e);
            e.addEventListener("submit", e => e.preventDefault());
            return e
        })();
        const div = document.createElement('div');
        const label = document.createElement("label");
        const select = document.createElement("select");
        if (options) for (const value in options) {
            const content = options[value];
            const option = document.createElement("option");
            option.value = value;
            option.textContent = content;
            select.append(option)
        }
        if (subTitle) label.textContent = subTitle;
        if (config) for (const attr in config) {
            if (attr === "id") label.setAttribute("for", config[attr]);
            select.setAttribute(attr, config[attr]);
        }
        div.append(label, select);
        form.append(div);
        return { form, container: div, label, select };
    }
    appendButton(text, config) {
        const content = this.shadowRoot.querySelector(".content");
        const form = content.querySelector("form") || (() => {
            const e = document.createElement("form");
            content.appendChild(e);
            e.addEventListener("submit", e => e.preventDefault());
            return e
        })();
        const div = document.createElement('div');
        const button = document.createElement("button");
        if (text) {
            button.textContent = text;
        }
        if (config) for (const attr in config) {
            button.setAttribute(attr, config[attr]);
        }
        div.append(button);
        form.append(div);
        return { form, container: div, button };
    }
    /**
     * @param {string} val
     */
    set type(val) {
        this.setAttribute("type", val)
    }
    /**
     * @param {string} val
     */
    set headline(val) {
        this.setAttribute("headline", val)
    }
    /**
     * @param {string} val
     */
    set message(val) {
        this.setAttribute("message", val)
    }
    /**
     * @param {string} val
     */
    set placeholder(val) {
        this.setAttribute("placeholder", val)
    }
    /**
     * @param {string} val
     */
    set height(val) {
        this.setAttribute("height", val)
    }
    /**
     * @param {string} val
     */
    set width(val) {
        this.setAttribute("width", val)
    }
    /**
     * @param {object} val
     */
    set options(val) {
        switch (this.getAttribute("type")) {
            case "select": case "select-append": {
                const select = this.shadowRoot.querySelector("select");
                const fragment = document.createDocumentFragment();
                for (let k in val) {
                    const content = val[k];
                    const option = document.createElement("option");
                    option.value = k;
                    option.textContent = content;
                    fragment.append(option)
                }
                select.replaceChildren(fragment);
            }; break;
            default: break;
        }
    }
    #config;
    /**
     * @param {object} val
     */
    set config(val) {
        this.#config = val;
    }
    /**
     * @param {{ [x: string]: any; }} val
     */
    set labelContent(val) {
        for (const k in val) {
            const id = k, content = val[k];
            const label = this.shadowRoot.querySelector(`[for="${id}"]`);
            if (label) {
                label.textContent = content;
            }
        }
    }
    #appendCheck;
    /**
     * @param {function} fn
     */
    set appendCheck(fn) {
        if (typeof fn === "function") this.#appendCheck = fn.bind(this);
    }
    #appendCallback;
    /**
     * @param {function} fn 
     */
    set appendCallback(fn) {
        if (typeof fn === "function") this.#appendCallback = fn.bind(this);
    }
}
customElements.define("noname-dialog", HTMLNonameDialogHTML);