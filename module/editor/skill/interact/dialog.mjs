import {
    lib,
    game,
    ui,
    get,
    _status
} from "../../../../../../noname.js"
import { element, textareaTool } from '../tool/ui.js';
const DEFAULT_EVENT = lib.config.touchscreen ? 'touchend' : 'click';
class DialogEvent {
    dialog;
    constructor(dialog) {
        this.dialog = dialog;
        if (!this.dialog.buttons) return Promise.resolve(this);
        this.promise = new Promise(res => {
            for (const button of this.dialog.buttons) {
                button.addEventListener(DEFAULT_EVENT, function () {
                    const output = {
                        result: this.result,
                        index: this.resultIndex,
                        chosen: this.innerText,
                        bool: this.innerText === "确定" ? true : this.innerText === "取消" ? false : null,
                        rmImgs: this.rmImgs,
                        changedItems: this.changedItems,
                        type: "main"
                    }
                    if (this.file) {
                        if (this.file.result) {
                            output.fileData = this.file.result
                        };
                        if (this.file.self) {
                            output.file = this.file.self;
                        }
                        if (this.file.extn) {
                            output.fileData.extn = this.file.extn;
                            output.fileData.name = this.result;
                            output.result = [this.result, this.file.extn].join(".");
                        }
                    }
                    res(output);
                })
            }
        })
        this.promise.dialog = dialog;
        this.promise.insertDialog = (insert) => {
            dialog.insertDialog(insert);
            return this.promise;
        }
        this.promise.coverDialog = (insert) => {
            dialog.coverDialog(insert);
            return this.promise;
        }
        return this.promise;
    }
    exit
}
class x19D6_Dialog extends HTMLDivElement {
    constructor(...args) {
        const dialog = element('div')
            .addClass("x19D6_dialogBase")
            .addClass("x19D6ToCenter")
            .father(ui.window)
            .exit();
        ui.x19D6_blockWindowKeyboard(dialog);
        const back = ui.create.x19D6_curtain()
        const buttonContainer = element("div")
            .style({
                "z-index": "8",
                width: "100%",
                display: "block",
                height: "36px",
                top: "250px"
            })
            .addClass("x19D6ToCenter")
            .father(back)
            .exit();
        Object.setPrototypeOf(dialog, x19D6_Dialog.prototype);
        const buttons = [];
        for (const arg of args) {
            const button = ui.create.x19D6_button(buttonContainer, arg, [dialog, back])
            buttons.push(button)
        }
        dialog.back = back
        dialog.buttons = buttons;
        dialog.buttonContainer = buttonContainer;

        return dialog;
    }
    /**
     * @type {HTMLDivElement}
     */
    back;
    /**
     * @type {HTMLDivElement[]}
     */
    buttons = [];
    /**
     * @param {string} str 
     * @param {boolean} addButtons 
     * @param {boolean} closable 
     * @returns 
     */
    appendButton(str, addButtons = true, closable = true) {
        const removeEle = closable ? [this, this.back] : []
        const button = ui.create.x19D6_button(this.buttonContainer, str, removeEle);
        if (addButtons) this.buttons.push(button);
        return button;
    }
    replaceButton(node, index = 0, closable = true) {
        if (!this.buttons[index]) return;
        this.buttons[index].parentNode.insertBefore(node, this.buttons[index]);
        this.buttons[index].remove();
        this.buttons.splice(0, 1, node);
        node.removeEle = [];
        if (closable) node.removeEle = [this, this.back]
        delete node.result;
    }

    higher() {
        ui.x19D6_giveStyle(this, {
            height: "308.4px",
            top: "-170px"
        })
        return this
    }
    highest() {
        ui.x19D6_giveStyle(this, {
            height: "500px",
            top: "0px"
        })
        this.back.remove()
        this.highestRemove = function () {
            document.removeEventListener(DEFAULT_EVENT, this.highestListenerRemove);
            this.remove()
        }
        this.highestListenerRemove = function (e) {
            if (!this.highestRemoveOk) return;
            if (e.target !== this && !Array.from(this.getElementsByTagName("*")).includes(e.target)) {
                this.highestRemove()
            }
        }
        document.addEventListener(DEFAULT_EVENT, this.highestListenerRemove)
        return this
    }
    standardWidth = function () {
        ui.x19D6_giveStyle(this, {
            width: "502px"
        })
        return this;
    }


    show() {
        ui.x19D6_showElement(this);
        ui.x19D6_showElement(this.back)
        return this;
    }
    hide() {
        ui.x19D6_hideElement(this);
        ui.x19D6_hideElement(this.back)
        return this;
    }
    close() {
        this.remove();
        this.back.remove()
        return this;
    }

    insertDialog(dialog) {
        if (!dialog || !dialog.buttons || !Array.isArray(dialog.buttons)) return this;
        dialog.hide();
        for (const button of this.buttons) {
            button.addEventListener(DEFAULT_EVENT, () => {
                dialog.show();
            })
        }
        return this;
    }
    coverDialog(dialog) {
        if (!dialog || !dialog.buttons || !Array.isArray(dialog.buttons)) return this;
        dialog.hide();
        return this;
    }
}
game.x19D6_createDialogEvent = (dialog, ...subs) => {
    return new DialogEvent(dialog, ...subs);
}
ui.create.x19D6_dialogBase = function (...args) {
    if (game.x19D6_create.baned) return null;
    const div = new x19D6_Dialog(...args);
    div.addElement = function (tag, innerHTML, style) {
        let ele = ui.x19D6_addElement({
            target: div,
            tag: tag,
            innerHTML: innerHTML,
            style: style
        })
        if (tag == "textarea") {
            ele.addButton = function (character, text) {
                text = text ? text : character
                const button = div.addElement("span", character, { display: "Inline-block", height: "30px", width: "30px", textAlign: "center", border: "#FFFFE0 1.5px solid", fontSize: "1em", borderRadius: "50%", })
                if (ele.nextSibling !== button) {
                    div.insertBefore(button, ele.nextSibling)
                }
                button.addEventListener(lib.config.touchscreen ? 'touchend' : 'click', character !== "清" ? function (e) {
                    e.preventDefault()
                    let index = ele.selectionStart
                    let part1 = ele.value.slice(0, index);
                    let part2 = ele.value.slice(index);
                    const newPart = part1 + text
                    ele.value = newPart + part2;
                    ele.selectionStart = newPart.length;
                    ele.selectionEnd = newPart.length;
                } : function (e) {
                    e.preventDefault()
                    ele.value = "";
                })
                return ele;
            }
            ele.numberListButton = function (number) {
                for (let i = 0; i < number; i++) {
                    ele.addButton(`${i}`)
                }
            }
        }
        ele.addElement = this.addElement;
        return ele
    }
    div.setReconstruct = function (method, ...args) {
        div.reconstruct = () => method(...args);
        div.consturctArgs = [...args];
        return this;
    }
    div.elementTool = element;
    return div
};
//创建按钮
ui.create.x19D6_button = function (father, str, remove = [], removeCallBack, removeSelf) {
    if (remove instanceof HTMLElement) remove = [remove];
    const button = element("div")
        .addClass("x19D6_dialogButton")
        .innerHTML(str)
        .father(father)
        .setKey("removeEle", remove)
        .style({
            margin: "auto 15px",
        })
        .exit();
    if (removeSelf) {
        remove.push(button);
    }
    if (remove.length) {
        if (removeCallBack && typeof removeCallBack === "function") button.addEventListener(lib.config.touchscreen ? 'touchend' : 'click', removeCallBack)
        button.addEventListener(lib.config.touchscreen ? 'touchend' : 'click', function (e) {
            e.stopPropagation();
            for (const item of this.removeEle) {
                item.remove();
            }
        })
    }
    button.activate = function () {
        element().setTarget(this)
            .clickAndTouch()
    }
    button.chosenChange = function () {
        this.classList.toggle("xy-ED-skill-chosen")
    }
    button.chosen = function () {
        this.classList.add("xy-ED-skill-chosen")
    }
    button.unchosen = function () {
        this.classList.remove("xy-ED-skill-chosen")
    }
    return button
};
ui.create.x19D6_button2 = function (...args) {
    const button = ui.create.x19D6_button(...args);
    button.style.cssText = '';
    return button;
}
if (!game.x19D6_create) game.x19D6_create = {}
//game.x19D6_create开关
game.x19D6_create.ban = function () {
    return game.x19D6_create.baned = true;
}
game.x19D6_create.allow = function () {
    return game.x19D6_create.baned = false;
}
//提醒警告型对话框
game.x19D6_create.alert = function (str = "", func) {
    if (game.x19D6_create.baned) return;
    var dialog = ui.create.x19D6_dialogBase("确定")
    dialog.innerHTML = str;
    if (func) dialog.buttons[0].addEventListener(lib.config.touchscreen ? 'touchend' : 'click', func)
    dialog.buttons[0].addEventListener(lib.config.touchscreen ? 'touchend' : 'click', function () {
        if (dialog.next) {
            ui.x19D6_toBeVisible(dialog.next, dialog.next.back)
        }
    })
    dialog.setReconstruct(game.x19D6_create.alert, ...arguments)
    return dialog
}
//确认型对话框
game.x19D6_create.confirm = function (str = '', func1, func2) {
    if (game.x19D6_create.baned) return;
    var dialog = ui.create.x19D6_dialogBase("确定", "取消")
    dialog.innerHTML = str
    if (func1) dialog.buttons[0].addEventListener(lib.config.touchscreen ? 'touchend' : 'click', func1)
    if (func2) dialog.buttons[1].addEventListener(lib.config.touchscreen ? 'touchend' : 'click', func2)
    dialog.buttons[0].addEventListener(lib.config.touchscreen ? 'touchend' : 'click', function () {
        if (dialog.next) {
            ui.x19D6_toBeVisible(dialog.next, dialog.next.back)
        }
    })
    dialog.buttons[1].addEventListener(lib.config.touchscreen ? 'touchend' : 'click', function () {
        if (dialog.goon) {
            ui.x19D6_toBeVisible(dialog.goon, dialog.goon.back)
        }
    })
    dialog.setReconstruct(game.x19D6_create.confirm, ...arguments)
    return dialog
}
//互动性对话框
game.x19D6_create.prompt = function (str1, str2 = "", func1, func2) {
    if (game.x19D6_create.baned) return;
    var dialog = ui.create.x19D6_dialogBase("确定", "取消")
    dialog.addElement("div", str1)
    var textarea = dialog.addElement("textarea", str2, {
        display: "block",
        margin: "auto",
        width: "99%",
        height: "300%",
        fontSize: "24px",
    })
    dialog.input = textarea
    dialog.buttons[0].addEventListener(lib.config.touchscreen ? 'touchend' : 'click', function () {
        this.result = textarea.value
        if (dialog.next) {
            ui.x19D6_toBeVisible(dialog.next, dialog.next.back)
        }
    })
    dialog.buttons[1].addEventListener(lib.config.touchscreen ? 'touchend' : 'click', function () {
        this.result = textarea.value
        if (dialog.goon) {
            ui.x19D6_toBeVisible(dialog.goon, dialog.goon.back)
        }
    })
    if (func1) dialog.buttons[0].addEventListener(lib.config.touchscreen ? 'touchend' : 'click', func1)
    if (func2) dialog.buttons[1].addEventListener(lib.config.touchscreen ? 'touchend' : 'click', func2)
    dialog.Mysize = function () {
        ui.x19D6_giveStyle(dialog, {
            height: "308.4px",
            top: "-170px"
        })
        ui.x19D6_giveStyle(textarea, {
            height: "26px"
        })
        return dialog
    }
    dialog.inputSmall = function () {
        ui.x19D6_giveStyle(textarea, {
            width: "5em",
            height: "1em"
        })
        return dialog
    }
    dialog.inputOneLine = function () {
        textareaTool().setTarget(textarea)
            .width('95%')
            .height('1.5em')
            .style({
                margin: '0',
                marginTop: '20px',
                padding: '0'
            })
            .clearThenAnotherClickTouch('\n', dialog.buttons[0], 'touchend')
        return dialog
    }
    dialog.prompt = textarea
    dialog.setReconstruct(game.x19D6_create.prompt, ...arguments)
    return dialog
}
game.x19D6_create.blprompt = function (str1, str2, str3, str4, func1, func2) {
    if (game.x19D6_create.baned) return;
    let dialog = game.x19D6_create.prompt(str1, str2, void 0, void 0).Mysize();
    let textarea1 = dialog.input;
    dialog.addElement("div", str3)
    let textarea2 = dialog.addElement("textarea", str4, {
        display: "block",
        margin: "auto",
        width: "99%",
        marginTop: "10px",
        height: "26px",
        fontSize: "24px"
    })
    dialog.input2 = textarea2
    dialog.buttons[0].addEventListener(lib.config.touchscreen ? 'touchend' : 'click', function () {
        this.result2 = textarea2.value
    })
    dialog.buttons[1].addEventListener(lib.config.touchscreen ? 'touchend' : 'click', function () {
        this.result2 = textarea2.value
    })
    if (func1) dialog.buttons[0].addEventListener(lib.config.touchscreen ? 'touchend' : 'click', func1)
    if (func2) dialog.buttons[1].addEventListener(lib.config.touchscreen ? 'touchend' : 'click', func2)
    dialog.setReconstruct(game.x19D6_create.blprompt, ...arguments)
    return dialog;
}
game.x19D6_create.multiprompt = function (func1, func2) {
    if (game.x19D6_create.baned) return;
    const dialog = game.x19D6_create.confirm(void 0);
    dialog.prompts = []
    dialog.higher()
    dialog.appendPrompt = function (str, value, placeholder = '', times = 1) {
        element("div")
            .style({
                position: "relative",
            })
            .innerHTML(str)
            .father(this)
            .block()
            .exit()
        const textarea = element("textarea")
            .style({
                display: "block",
                margin: "auto",
                width: "99%",
                fontSize: "24px",
                height: `${34 * times}px`
            })
            .father(this)
            .exit()
        if (value) textarea.value = value
        textarea.placeholder = placeholder
        dialog.prompts.push(textarea)
        dialog.buttons[0].addEventListener(lib.config.touchscreen ? 'touchend' : 'click', function () {
            this.resultList = dialog.prompts.map(prompt => prompt.value);
        })
        dialog.buttons[1].addEventListener(lib.config.touchscreen ? 'touchend' : 'click', function () {
            this.resultList = dialog.prompts.map(prompt => prompt.value);
        })
        dialog.buttons[0].addEventListener(lib.config.touchscreen ? 'touchend' : 'click', func1)
        dialog.buttons[1].addEventListener(lib.config.touchscreen ? 'touchend' : 'click', func2)
        return dialog;
    }
    dialog.setReconstruct(game.x19D6_create.multiprompt, ...arguments)
    return dialog;
}
//选项型对话框
game.x19D6_create.chooseAnswer = function (str, choicesList, single, func, src) {
    if (game.x19D6_create.baned) return;
    var dialog = game.x19D6_create.alert(void 0, func);
    ui.x19D6_giveStyle(dialog, {
        height: "258.4px",
        top: "-120px"
    });
    dialog.chosen = [];
    dialog.choiceList = [];
    dialog.single = single;
    dialog.chosenIndex = [];
    dialog.addElement("div", str);
    dialog.addElement("hr");
    choicesList.forEach((string, index) => {
        const option = element("div")
            .style({
                position: "relative",
                fontSize: "30px",
                marginBottom: "0.5em",
                alignItems: "center"
            })
            .flexRow()
            .father(dialog)
            .exit();
        const theNumber = element("div")
            .innerHTML(String.fromCharCode(index + 65))
            .style({
                display: "block",
                borderRadius: "50%",
                height: "30px",
                width: "30px",
                textAlign: "center",
                border: "#FFFFE0 1.5px solid",
                marginRight: "10px",
                position: "relative"
            })
            .father(option)
            .exit();
        element("div")
            .innerHTML(string)
            .style({
                display: "block",
                position: "relative",
                fontSize: "26px",
            })
            .father(option)
        option.index = index;
        dialog.choiceList.push(option)
    })
    function updateBackStyle(ele, backColor) {
        ui.x19D6_giveStyle(ele, {
            backgroundColor: backColor
        })
    }
    dialog.addEventListener(lib.config.touchscreen ? 'touchend' : 'click', function (e) {
        if (!Array.from(dialog.getElementsByTagName("*")).includes(e.target)) return false;
        const chosen = dialog.choiceList.filter(option => {
            return (Array.from(option.getElementsByTagName("*")).includes(e.target))
        })[0];
        if (!chosen) return;
        if (dialog.chosen.includes(chosen)) {
            updateBackStyle(chosen.firstElementChild, "")
            dialog.chosenIndex = dialog.chosenIndex.filter(i => i != chosen.index);
            dialog.chosen = dialog.chosen.filter(i => i != chosen);
        } else {
            updateBackStyle(chosen.firstElementChild, "#FFFFE0")
            if (dialog.single) {
                dialog.chosen = dialog.chosen.filter(option => {
                    updateBackStyle(option.firstElementChild, "")
                    return false;
                });
                dialog.chosenIndex = [];
            }
            dialog.chosen.push(chosen)
            dialog.chosenIndex.push(chosen.index)
        }
        dialog.buttons[0].result = dialog.chosen.map(option => option.children[1].innerText);
        dialog.buttons[0].resultIndex = [...dialog.chosenIndex];
        if (single) {
            dialog.buttons[0].result = dialog.buttons[0].result[0];
            dialog.buttons[0].resultIndex = dialog.buttons[0].resultIndex[0];
        }
    })
    if (src) {
        element().setTarget(dialog.back)
            .setStyle("backgroundImage", `url(${src})`)
            .setStyle("background-size", "100% 100%")
            .setStyle("opacity", '1');
    }
    dialog.setReconstruct(game.x19D6_create.chooseAnswer, ...arguments)
    return dialog
}
//文件交互对话框
game.x19D6_create.file = function (str, type, func1, func2) {
    if (game.x19D6_create.baned) return;
    const dialog = game.x19D6_create.prompt(str, "", func1, func2)
    dialog.Mysize()
    ui.x19D6_toBeHidden(dialog.buttons[0]);
    const file = document.createElement("input")
    file.type = "file"
    ui.x19D6_giveStyle(file, {
        display: "block",
    })
    dialog.appendChild(file)
    const obj = {
        json: function () {
            file.accept = "application/json,.json"
            return document.createElement("div");
        },
        img: function () {
            const img = document.createElement("img")
            file.accept = "image/*"
            ui.x19D6_giveStyle(img, {
                width: "var(--xy-ED-skill-file-width)",
                "object-fit": "fill"
            })
            return img
        },
        video: function () {
            file.accept = "video/*"
            const video = document.createElement("video");
            ui.x19D6_giveStyle(video, {
                width: "var(--xy-ED-skill-file-width)",
                "object-fit": "fill"
            })
            video.controls = true
            video.autoplay = true
            return video
        },
        audio: function () {
            file.accept = "audio/*"
            const audio = document.createElement("audio");
            ui.x19D6_giveStyle(audio, {
                width: "var(--xy-ED-skill-file-width)",
                "object-fit": "fill"
            })
            audio.controls = true
            audio.autoplay = true
            return audio;
        },
        all: function () {
            return document.createElement('span')
        }
    }
    const showFile = obj[type]();
    dialog.appendChild(showFile);
    showFile.addEventListener('error', function () {
        ui.x19D6_toBeHidden(dialog.buttons[0]);
    });
    file.onchange = function () {
        const readingFile = this.files[0];
        if (!readingFile) {
            showFile.src = "";
            return;
        }
        ui.x19D6_toBeHidden(dialog.buttons[0])
        const reader = new FileReader();
        reader.readAsArrayBuffer(readingFile);
        reader.onload = function () {
            const fileData = this.result;
            const extn = file.value.split(".").slice(-1)[0];
            const url = URL.createObjectURL(readingFile);
            showFile.src = url;
            showFile.x19D6_type = "." + extn;
            const fileResult = {
                self: readingFile,
                result: fileData,
                type: "." + extn,
                url,
                extn
            }
            dialog.buttons[0].file = fileResult;
            dialog.buttons[1].file = fileResult;
            ui.x19D6_toBeVisible(dialog.buttons[0]);
        }
    }
    dialog.setReconstruct(game.x19D6_create.file, ...arguments)
    return dialog
}
game.x19D6_create.dir = function (str = '', path = '', func, config = {}, button) {
    let { showFile = true, showDir = true, single = true } = config;
    const getOrder = (value) => {
        if (value.startsWith("🖼️")) return 1;
        if (value.startsWith("🎵")) return 2;
        if (value.startsWith("📽️")) return 3;
        if (value.startsWith("📄")) return 4;
    }
    const dialog = game.x19D6_create.search(str, func);
    const ul = dialog.ul;
    const textarea = dialog.textarea;
    const nextButton = dialog.appendButton("上一页", false, false);
    const chosen = [];
    dialog.chosen = chosen;
    ui.x19D6_setStyle(ul, 'height', '250px');
    if (button) {
        dialog.replaceButton(button);
    }
    dialog.buttons[0].result = [];
    new Promise((res, rej) => {
        game.getFileList(path, (folders, files) => {
            res([folders, files]);
        }, rej)
    }).then(([dirNames, fileNames]) => {
        let dirTexts = dirNames, fileTexts = fileNames;
        if (showDir) {
            dirTexts = dirNames.map((dirName) => {
                return `\u{1F4C1}${dirName}`
            })
            dialog.appendLi((_, value, index) => {
                const li = document.createElement("li");
                li.innerHTML = value;
                li.isDir = true;
                li.dirName = dirNames[index];
                li.itemName = dirNames[index];
                return li;
            }, dirTexts)
        }
        if (showFile) {
            fileTexts = fileNames.map(fileName => {
                if (["jpg", "png", "gif", "ico"].some(etn => fileName.endsWith(etn))) return `🖼️${fileName}`
                else if (["mp3", "wav", "flac", "m4a", "ogg"].some(etn => fileName.endsWith(etn))) return `🎵${fileName}`
                else if (["mp4", 'mov'].some(etn => fileName.endsWith(etn))) return `📽️${fileName}`
                else return `📄${fileName}`
            }).sort((a, b) => {
                const orderA = getOrder(a)
                const orderB = getOrder(b)
                if (orderA !== orderB) return orderA - orderB;
                else {
                    const extA = a.split('.').pop().toLowerCase();
                    const extB = b.split('.').pop().toLowerCase();
                    if (extA === extB) {
                        return a.toLowerCase().localeCompare(b.toLowerCase());
                    }
                    return extA.localeCompare(extB);
                };
            })
            dialog.appendLi((_, value, index) => {
                const li = document.createElement("li");
                li.innerHTML = value;
                li.isFile = true;
                li.fileName = fileNames[index];
                li.itemName = fileNames[index];
                return li;
            }, fileTexts)
        }
    });
    ul.addEventListener(DEFAULT_EVENT, (e) => {
        if (textarea.index.includes(e.target)) e.target.classList.toggle("xy-ED-skill-chosen");
        if (e.target.classList.contains("xy-ED-skill-chosen")) {
            if (single) {
                chosen.forEach(node => {
                    node.classList.remove("xy-ED-skill-chosen");
                    chosen.remove(node);
                    dialog.buttons[0].result.remove(e.target.itemName)
                })
            }
            chosen.add(e.target);
            dialog.buttons[0].result.add(e.target.itemName)
        }
        else {
            chosen.remove(e.target);
            dialog.buttons[0].result.remove(e.target.itemName)
        }
    })
    ul.addEventListener("dblclick", (e) => {
        if (!e.target.isDir) return;
        dialog.close();
        if (!path.endsWith("/")) path += "/"
        game.x19D6_create.dir(str, path + e.target.dirName + '/', func, config, dialog.buttons[0])
    })
    nextButton.addEventListener(DEFAULT_EVENT, function (e) {
        if (path === '') {
            game.x19D6_create.alert("暂不支持访问该上级文件夹！").insertDialog(dialog);
            return;
        }
        dialog.close();
        if (path.endsWith('/')) path = path.slice(0, -1);
        path = path.split("/").slice(0, -1).join("/");
        game.x19D6_create.dir(str, path, func, config, dialog.buttons[0]);
    })
    return dialog;
}
//图片选择型对话框
game.x19D6_create.button = function (str1 = "未选择", str2, arr2, func, func2, removeCallBack) {
    if (game.x19D6_create.baned) return;
    const dialog = game.x19D6_create.confirm(`
            <div></div>
            <div>单击以选中图片，双击以删除图片。</div>
            <p>${str1}</p>
            <hr>`, func, func2);
    ui.x19D6_toBeHidden(dialog.buttons[0])
    ui.x19D6_giveStyle(dialog, {
        height: "308.4px",
        top: "-170px"
    })
    for (var i = 0; i < arr2.length; i++) {
        const img = element("div")
            .father(dialog)
            .setKey("name", arr2[i])
            .setKey("imgName", arr2[i])
            .setKey("flag", "img")
            .addClass('x19D6_ImgButton')
            .setStyle("background-image", `url(${str2 + arr2[i]})`)
            .innerHTML(arr2[i])
            .listen(DEFAULT_EVENT, function (e) {
                dialog.querySelector("p").innerHTML = this.name;
                ui.x19D6_toBeVisible(dialog.buttons[0]);
                const colorfulButton = dialog.querySelector(".x19D6_color_circle")
                colorfulButton && colorfulButton.classList.remove("x19D6_color_circle");
                img.classList.add("x19D6_color_circle")
                dialog.buttons[0].result = img.name;
            })
            .exit()
        img.ondblclick = function (e) {
            this.remove();
            dialog.rmImgs.push(this.name);
            dialog.buttons[0].rmImgs = dialog.buttons[1].rmImgs = dialog.rmImgs;
            ui.x19D6_toBeHidden(dialog.buttons[0])
            if (arr2 && arr2.includes(this.name)) {
                arr2.remove(this.name);
                if (removeCallBack) {
                    removeCallBack.apply(this, [e])
                }
            }
        }
    }
    dialog.rmImgs = [];
    dialog.imgs = dialog.querySelectorAll("div.x19D6_ImgButton")
    dialog.setReconstruct(game.x19D6_create.button, ...arguments)
    return dialog
}


//寻找信息型对话框
game.x19D6_create.search = function (
    str = "<div class=xy-ED-skill-dialog-prompt>输入关键词后，敲击回车以进行搜索,只显示前100条</div><hr>",
    func
) {
    if (game.x19D6_create.baned) return;
    const dialog = game.x19D6_create.alert(str, func)
    ui.x19D6_giveStyle(dialog, {
        height: "318.4px",
        top: "-170px",
        overflow: ""
    })
    let textarea = dialog.addElement("textarea", void 0, lib.x19D6_style.textarea1)
    textarea.placeholder = "输入关键词后，敲击回车以进行搜索,只显示前100条"
    const ul = dialog.addElement("ul", void 0, {
        overflow: "auto",
        marginTop: "0px",
        "list-style": "none",
        paddingLeft: "0px",
        height: "180px"
    })
    textarea.onkeyup = function (e) {
        if (this.value.length) return;
        const showList = this.parentNode.querySelectorAll('.x19D6_hidden');
        let count = 0;
        for (const item of showList) {
            count++;
            item.classList.toggle('x19D6_hidden');
            if (count >= 100) break;
        }
        textarea.nextElementSibling.scrollTo({
            top: 0,
            behavior: "smooth"
        })
    };
    textarea.onkeydown = function (e) {
        if (!this.value.length) return;
        if (e.key !== "Enter") return;
        e.preventDefault();
        e.stopPropagation();
        const shownLi = this.parentNode.querySelectorAll('li:not(.x19D6_hidden)');
        const hiddenLi = this.parentNode.querySelectorAll('.x19D6_hidden');
        const content = this.value
        for (const item of hiddenLi) {
            if (content.split(/[ +]/).every(keywords => item.innerText.includes(keywords)))
                item.classList.toggle("x19D6_hidden");
        }
        for (const item of shownLi) {
            if (!content.split(/[ +]/).every(keywords => item.innerText.includes(keywords)))
                item.classList.toggle("x19D6_hidden");
        }
        this.nextElementSibling.scrollTo({
            top: 0,
            behavior: "smooth"
        })
    }
    textarea.index = [];
    dialog.textarea = textarea;
    dialog.ul = ul;
    const observer = new IntersectionObserver(
        entries => {
            const shownList = entries[0].target.parentNode.querySelectorAll(':not(.x19D6_hidden)');
            const theirUl = entries[0].target.parentNode
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const target = entry.target;
                const b = target.querySelector("b")
                if (!b) return;
                if (![target.parentNode.lastElementChild, [...shownList].slice(-1)[0]].includes(target)) return;
                element("div").width("100%").height("5em").father(theirUl);
                observer.disconnect()
            })
        },
        {
            root: ul,
        }
    )
    dialog.observer = observer;
    dialog.buttons[0].observer = dialog.observer;
    dialog.buttons[0].addEventListener(lib.config.touchscreen ? 'touchend' : 'click', function (e) {
        this.observer.disconnect()
    });
    dialog.appendLi = (Generator, obj, ...args) => {
        const promises = Object.entries(obj).map(([key, value], index) => {
            return new Promise(res => {
                setTimeout(() => {
                    const li = Generator(key, value, index, ...args);
                    if (index > 100) li.classList.add("x19D6_hidden");
                    textarea.index.push(li);
                    res(li);
                }, 0)
            })
        });
        if (promises.length < 100) Promise.all(promises).then(lis => ul.append(...lis));
        else {
            Promise.all(promises.slice(0, 100)).then(lis => ul.append(...lis));
            Promise.all(promises.slice(100)).then(lis => ul.append(...lis));
        }
    }
    return dialog;
}
//数字调整型对话框
game.x19D6_create.configNumberList = function (obj = {}, func) {
    if (game.x19D6_create.baned) return;
    let dialog = game.x19D6_create.search("<div style=position:relative;overflow:auto;font-size:24px>拖动可改变数值数值。输入关键词后，敲击回车以进行搜索</div><hr>", func)
    let textarea = dialog.textarea;
    let ul = dialog.ul;
    let changedObj = {};
    dialog.changedObj = changedObj;
    /*
      演示obj
      {
          x19D6_lijingtuzhi_1:{
             counterpart:"【励精图治-红桃-7】",
             current:1,
             min:1,
             max:5,
          },
          x19D6_lijingtuzhi_2:{
             counterpart:"【励精图治-黑桃-7】",
             current:1,
             min:1,
             max:5,
          },
      }
    */
    function rangeChange() {
        changedObj[this.counterpart] = this.value;
        this.numShower.innerHTML = changedObj[this.counterpart];
    }
    for (let k in obj) {
        let li = document.createElement("li")
        li.innerHTML = "【" + obj[k].counterpart + "】";
        ul.appendChild(li);
        let range = document.createElement("input");
        range.counterpart = obj[k].counterpart;
        range.type = 'range';
        range.value = (obj[k].current || 0);
        range.min = (obj[k].min || 0);
        range.max = (obj[k].max || max);
        range.addEventListener("change", rangeChange)
        ui.x19D6_giveStyle(range, {
            float: "right"
        })
        li.appendChild(range);
        let span = document.createElement("span")
        li.appendChild(span);
        ui.x19D6_giveStyle(span, {
            float: "right"
        })
        span.innerHTML = range.value;
        range.numShower = span
    }
    return dialog;
}
game.x19D6_create.configSet = function (list, func, configObject = lib.config, cost = 0, exclude = []) {
    /**
     * @type {x19D6_Dialog}
     */
    const dialog = game.x19D6_create.search("<div style=position:relative;overflow:auto;font-size:24px>点击以下项目可进行设置。输入关键词后，敲击回车以进行搜索,只显示前100条</div><hr>", func)
    const textarea = dialog.textarea;
    const ul = dialog.ul;
    const previousConfig = configObject;
    const changedItems = [];
    configObject = get.copy(configObject);
    if (!list) return dialog;
    dialog.appendLi((key, value, index) => {
        const li = element("li")
            .setKey("configName", key)
            .setStyle("justify-content", "space-between")
            .innerHTML(`<span style="padding:3px;max-width:450px;flex-wrap:wrap">${value}</span>`)
            .appendInnerHTML(`<span class=xy-ED-skill-smaller>${configObject[key] ? "【🔓已开启】" : "【🔒已关闭】"}</span>`)
            .flexRow()
            .exit();
        return li;
    }, list)
    const judgeIsChanged = (key) => {
        return configObject[key] !== previousConfig[key];
    }
    ui.x19D6_listenDefault(ul, e => {
        const configName = e.target.parentNode.configName;
        if (e.target.innerText === "【🔓已开启】") {
            configObject[configName] = false;
            e.target.innerText = "【🔒已关闭】"
        } else if (e.target.innerText === "【🔒已关闭】") {
            configObject[configName] = true;
            e.target.innerText = "【🔓已开启】"
        }
        if (configName) {
            if (judgeIsChanged(configName) && !changedItems.includes(configName)) changedItems.push(configName);
            else if (changedItems.includes(configName)) changedItems.remove(configName);
        }
    });
    dialog.appendButton("取消");
    dialog.buttons[0].result = configObject;
    dialog.buttons[0].changedItems = changedItems;
    return dialog;
}
//这种对话框用于展示条件
game.x19D6_create.condition = function (obj = {}) {
    if (game.x19D6_create.baned) return;
    let dialog = game.x19D6_create.search()
    let textarea = dialog.textarea;
    let ul = element().setTarget(dialog.ul)
        .setStyle('height', '210px')
        .exit();
    var list = obj
    for (let i in list) {
        element("li")
            .appendInnerHTML(list[i])
            .setStyle('fontSize', '18px')
            .hook(it => {
                textarea.index.push(it);
            })
    }
    ul.append(...textarea.index);
    dialog.font = function (num) {
        textarea.index.forEach(a => {
            ui.x19D6_giveStyle(a, {
                fontSize: (num + "px")
            })
        })
        return dialog
    }
    return dialog
}
game.x19D6_create.seeDelete = function (map, seeStr = "查看", deleteStr = "删除", seeCallback = () => true, deleteCallback = () => true, func, prompt, link) {
    if (game.x19D6_create.baned) return;
    const dialog = game.x19D6_create.search(prompt, func)
    const textarea = dialog.textarea;
    const ul = dialog.ul;
    const listenType = lib.config.touchscreen ? "touchend" : "click";
    dialog.buttons[0].result = [];
    dialog.addEventListener(listenType, function (e) {
        if (e.target.innerText === deleteStr || e.target.deleteExpanding) {
            deleteCallback.apply(e.target, [e]);
            if (!e.target.notAllowRemove) e.target.parentNode.remove();
        }
        if (e.target.innerText === seeStr || e.target.seeExpanding) {
            seeCallback.apply(e.target, [e])
        }
    })
    const promises = [];
    function addLi(attr, desc) {
        const container = element('li')
            .dataset.x19D6Id = attr
            .block()
            .style({
                position: 'relative',
                width: "100%"
            })
            .exit()
        const descEle = element("div")
            .father(container)
            .innerHTML(desc)
            .block()
            .style({
                position: 'relative',
            })
            .exit()
        const seeButton = ui.create.x19D6_button(container, seeStr);
        element().setTarget(seeButton)
            .style({
                position: 'relative',
                fontSize: '1.5rem'
            })
            .exit()
        seeButton.dialog = dialog;
        seeButton.descEle = descEle;
        seeButton.container = container;
        seeButton.yesButton = dialog.buttons[0];
        seeButton.id = attr;
        const deleteButton = ui.create.x19D6_button(container, deleteStr)
        element().setTarget(deleteButton)
            .father(container)
            .style({
                position: 'relative',
                fontSize: '1.5rem',
            })
            .exit()
        deleteButton.dialog = dialog;
        deleteButton.descEle = descEle;
        deleteButton.container = container;
        deleteButton.yesButton = dialog.buttons[0];
        deleteButton.id = attr;
        textarea.index.push(container);
    }
    const entriedMap = map instanceof Map ? map.entries() : Object.entries(map)
    for (const [attr, desc] of entriedMap) {
        const promise = new Promise(res => {
            setTimeout(() => {
                addLi(attr, link ? attr + link + desc : desc);
                res();
            }, 0)
        })
        promises.push(promise);
    }
    Promise.all(promises.slice(0, 100)).then(() => {
        ul.append(...textarea.index);
    })
    Promise.all(promises.slice(100)).then((value) => {
        textarea.index.slice(100).forEach(it => {
            it.classList.add("x19D6_hidden");
        })
        ul.append(...textarea.index.slice(100));
    });
    dialog.setReconstruct(game.x19D6_create.seeDelete, ...arguments)
    return dialog;
}
game.x19D6_create.searchChoose = function (obj = {}, single, callback) {
    if (game.x19D6_create.baned) return;
    const dialog = game.x19D6_create.search()
    const textarea = dialog.textarea;
    const ul = element().setTarget(dialog.ul)
        .setStyle('height', '210px')
        .exit();
    const chosen = [];
    dialog.chosen = chosen;
    dialog.appendLi((key, cn, index) => {
        const li = element("li")
            .setAttribute("value", key)
            .innerHTML(cn)
            .style({
                marginBottom: "10px"
            })
            .exit();
        return li
    }, obj);
    ui.x19D6_listenDefault(ul, (e) => {
        if (textarea.index.includes(e.target)) e.target.classList.toggle("xy-ED-skill-chosen");
        if (e.target.classList.contains("xy-ED-skill-chosen")) {
            if (single) {
                chosen.forEach(node => {
                    node.classList.remove("xy-ED-skill-chosen");
                    chosen.remove(node);
                })
            }
            chosen.add(e.target);
        }
        else chosen.remove(e.target);
    })
    dialog.buttons[0].addEventListener(DEFAULT_EVENT, function () {
        this.result = chosen.map(node => node.getAttribute("data-value"));
        if (single) this.result = this.result.at(0);
    })
    if (callback) dialog.buttons[0].addEventListener(DEFAULT_EVENT, callback);
    return dialog
}
game.x19D6_create.range = function (str, min, max, value = 0, callback, changeValue = () => true) {
    if (game.x19D6_create.baned) return;
    const dialog = game.x19D6_create.confirm(void 0, callback);
    const prompt = element('div')
        .block()
        .setStyle('position', 'relative')
        .innerHTML(str)
        .father(dialog)
        .exit()
    const showValue = element('div')
        .block()
        .style({
            position: 'relative',
            height: '52px',
            margin: 'auto',
            width: '52px',
            textAlign: "center",
            fontSize: '50px',
            marginBottom: '32px'
        })
        .father(dialog)
        .exit()
    const range = element('input')
        .type('range')
        .value(value)
        .block()
        .style({
            position: 'relative',
            margin: 'auto',
            width: '90%',
        })
        .max(max)
        .min(min)
        .father(dialog)
        .listen('change', e => {
            dialog.buttons[0].result = parseInt(e.target.value);
            showValue.innerHTML = e.target.value;
        })
        .listen('change', changeValue)
        .exit();
    range.prompt = prompt
    dialog.buttons[0].result = parseInt(value);
    showValue.innerHTML = value;
    return dialog;
}
game.x19D6_create.promise = {
    alert: (message) => {
        return game.x19D6_createDialogEvent(game.x19D6_create.alert(message));
    },
    confirm: (message) => {
        return game.x19D6_createDialogEvent(game.x19D6_create.confirm(message));
    },
    prompt: (title, defaultValue, placeholder) => {
        const dialog = game.x19D6_create.prompt(title, defaultValue);
        if (placeholder) dialog.prompt.placeholder = placeholder;
        return game.x19D6_createDialogEvent(dialog);
    },
    range: (title, setting, changeValue) => {
        const { min, max, value } = setting
        const dialog = game.x19D6_create.range(title, min, max, value, changeValue);
        return game.x19D6_createDialogEvent(dialog);
    },
    seeDelete: (title, map, options) => {
        let {
            seeStr,
            expandingSee,
            seeCallback,
            deleteStr,
            deleteCallback,
            link
        } = options;
        if (expandingSee) {
            seeCallback = function (expandingSee) {
                if (this.innerText === "查看") {
                    const id = this.container.dataset.x19D6Id;
                    this.descEle.innerHTML += `<span>${expandingSee(id)}</span>`
                    this.innerText = "收起"
                    this.seeExpanding = true;
                } else if (this.innerText === "收起") {
                    const descEle = this.descEle
                    const span = descEle.querySelector('span')
                    span && span.remove();
                    this.innerText = '查看'
                }
            }
        }
        const dialog = game.x19D6_create.seeDelete(map, seeStr, deleteStr, seeCallback, deleteCallback, void 0, title, link);
        return game.x19D6_createDialogEvent(dialog);
    },
    searchChoose: (title, map, single) => {
        const dialog = game.x19D6_create.searchChoose(map, single);
        const titleNode = dialog.querySelector("div");
        titleNode.innerHTML = title;
        return game.x19D6_createDialogEvent(dialog);
    },
    chooseSkill: (title = "选择一项技能", single) => {
        const dialog = game.x19D6_create.searchChoose(lib.x19D6_skillDirectory, single);
        const titleNode = dialog.querySelector("div");
        titleNode.innerHTML = title;
        return game.x19D6_createDialogEvent(dialog);
    },
    chooseAnswer: (title, choices, single) => {
        return game.x19D6_createDialogEvent(game.x19D6_create.chooseAnswer(title, choices, single))
    },
    chooseFile: (title, path, config) => {
        return game.x19D6_createDialogEvent(game.x19D6_create.dir(title, path, void 0, config));
    },
    chooseImage: (title = "", folder, images, rmCallBack) => {
        const dialog = game.x19D6_create.button(void 0, folder, images, void 0, void 0, rmCallBack);
        const titleNode = dialog.querySelector("div");
        titleNode.innerHTML = title;
        return game.x19D6_createDialogEvent(dialog);
    },
    setConfig: (title, map, configObject, { cost, exclude } = {}) => {
        /**
         * @type {x19D6_Dialog}
         */
        const dialog = game.x19D6_create.configSet(map, void 0, configObject, cost, exclude);
        const titleNode = dialog.querySelector("div");
        if (title) titleNode.innerHTML = title;
        return game.x19D6_createDialogEvent(dialog);
    },
    readFile: (title, type = "all") => {
        return game.x19D6_createDialogEvent(game.x19D6_create.file(title, type, void 0, void 0));
    },
    readImg: (title) => {
        return game.x19D6_create.promise.readFile(title, "img");
    },
    readJson: (title) => {
        return game.x19D6_create.promise.readFile(title, "json");
    },
    readVideo: (title) => {
        return game.x19D6_create.promise.readFile(title, "video");
    },
    readAudio: (title) => {
        return game.x19D6_create.promise.readFile(title, "audio");
    },
};