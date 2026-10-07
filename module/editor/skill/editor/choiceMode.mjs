"use script"
import {
    lib,
    game,
    ui,
    get,
    _status
} from "../../../../../../noname.js";
import { element } from "../tool/ui.js";
import { arrayToString, getOppositingOperator, objectToString } from "../tool/string.js";
import { NonameCN } from "./nonameCN.js";
import { TransCnText, dispose } from "./transCnText.mjs";
import { EditorParameterList, parameterJudge } from "./parameter.mjs";
import { EditorInteraction } from "./interaction.mjs";
const x19D6_DEFAULT_EVENT = lib.config.touchscreen ? "touchend" : "click"
function getVar(str, directory) {
    const lines = dispose(str, void 0, directory);
    const result = {};
    for (const line of lines) {
        line.replace(findVarRegexp, function (...arr) {
            result[arr[3].replace(/[ ]/g, "")] = arr[4].replace(/[ ]/g, "");
        })
    }
    return result;
}
function getVarOfTextarea(textarea, type, hook = str => str, directory) {
    const str = hook(textarea.value);
    const vars = getVar(str, directory);
    return Object.entries(vars).filter(([varName, varValue]) => {
        for (const judge in parameterJudge) {
            if (judge === type) continue;
            if (parameterJudge[judge](varName, varValue)) return false;
        }
        return true
    }).map(arr => arr[0]);
}
/**
 * 
 * @param {HTMLTextAreaElement} textarea 
 */
function getVarOfContent(type) {
    const content = game.x19D6_back.querySelector(".xy-ED-skill-contentTextarea");
    return getVarOfTextarea(content, type, str => {
        let result = str;
        return result;
    }, NonameCN.ContentList);
}

const getSkillID = () => {
    return game.x19D6_back.getID();
}
const getSourceID = () => {
    return game.x19D6_back.getSourceID();
}

const playerList = ["你", "玩家", "主公", "当前回合角色"];
const playersList = ["所有角色"];
const phaseList = ["phaseZhunbei", "phaseJudge", "phaseDraw", "phaseDiscard", "phaseJieshu"];
const positionMap = { h: "手牌区", e: "装备区", j: "判定区", s: "特殊区(木牛流马区在内)", x: "武将牌上/旁" }
const triggerTypeList = [["player", "你"], ["global", "一名角色/全局"], ["source", "你作为来源"], ["target", "你作为目标"]];
const colorMap = {
    "红色": "red",
    "黑色": "black"
};
const suitMap = {
    "红桃": "heart",
    "方片": "diamond",
    "梅花": "club",
    "黑桃": "spade"
};
const typeMap = {
    "基本": "basic",
    "装备": "equip",
    "普通锦囊": "trick",
    "延时锦囊": "delay"
};
const subtypeMap = {
    "武器": "equip1",
    "防具": "equip2",
    "+1马": "equip3",
    "-1马": "equip4",
    "宝物": "equip5"
};
const natureMap = {
    "雷属性": "thunder",
    "火属性": "fire",
    "冰属性": "ice",
    "神属性": "kami",
    "毒属性": "poison"
}
const getCardNameMap = () => {
    const result = {}
    for (const name of lib.inpile) {
        result[get.translation(name)] = name;
    }
    return result;
}
const getPlayerList = () => {
    const result = [...playerList];
    if (game.x19D6_back.skill.kind === "trigger") {
        result.push("触发事件的角色");
        result.push("触发事件的来源");
    }
    else if (game.x19D6_back.skill.kind === 'enable:"phaseUse"'
        && game.x19D6_back.skill.type.includes("filterTarget")) {
        result.push(game.x19D6_back.skill.contentAsync ? "事件的目标" : "目标")
    }
    result.push(...getVarOfContent("Player"));
    return result;
}
const getPlayersList = () => {
    if (game.x19D6_back.skill.kind === 'enable:"phaseUse"'
        && game.x19D6_back.skill.type.includes("filterTarget")) {
        result.push(game.x19D6_back.skill.contentAsync ? "事件的目标组" : "目标组")
    }
    const result = [...playersList];
    result.push(...getVarOfContent("Players"));
    return result;
}

const getCardList = () => {
    const result = [];
    result.push(...getVarOfContent("card"));
    return result;
}
const getCardsList = () => {
    const result = [];
    if (game.x19D6_back.skill.kind === "trigger") {
        result.push("触发事件的牌组")
    }
    result.push(...getVarOfContent("cards"));
    return result;
}

const getBoolList = (cnTrue = "是", cnFalse = "无") => {
    const result = [cnTrue, cnFalse];
    result.push(...getVarOfContent("bool"));
    return result;
}
const getNumberVarList = (...defaultValues) => {
    const result = [...defaultValues, Infinity, NaN]
    return result.concat(getVarOfContent("number"));
}
const getSkillList = () => {
    return getVarOfContent("skill");
}
const getSkillsList = () => {
    return getVarOfContent("skills");
}
const getTriggerList = (type) => {
    const list = NonameCN.groupedList.triggerList;
    const result = [];
    for (let cn in list) {
        if (list[cn] === "damageSource") {
            if (["source", "global"].includes(type)) result.push(cn);
        }
        else if (list[cn] === "roundStart") {
            if (type === "global") result.push(cn)
        }
        else if (!list[cn].includes(":")) result.push(cn);
        else if (list[cn].includes(":")) {
            const splited = list[cn].split(":");
            if (splited.includes(type)
                && splited.every(word => !(word in lib.card) && ![...lib.suit, 'red', 'none', 'black'].includes(word)))
                result.push(cn);
        }
    }
    return result.sort((a, b) => a.localeCompare(b, 'zh'));
}
const methodsList = Object.values(EditorParameterList).map(item => item[0].mission);
const findVarRegexp = /(var|const|let)(\s)+(.+)\=\s*(.+)/;
const isTemplateRegexp = /\$\{[^}]+\}/g
class UlList {
    /**
     * @type {Map<HTMLElement,HTMLElement>}
     */
    map
    constructor() {
        this.map = new Map();
    }
    add(key, value) {
        this.map.set(key, value);
    }
    call(key, callback, ...args) {
        const item = this.map.get(key);
        if (typeof callback === 'function' && item) {
            callback.call(item, ...args);
        }
    }
    showOnly(key) {
        const target = this.map.get(key);
        for (const ul of this.list) {
            if (target === ul) ul.classList.remove("x19D6_hidden");
            else ul.classList.add("x19D6_hidden");
        }
    }
    hide(key) {
        const target = this.map.get(key);
        target.classList.add("x19D6_hidden")
    }
    get list() {
        for (const [host, ul] of this.map.entries()) {
            if (!document.contains(ul) || !document.contains(host)) this.map.delete(host);
        }
        return Array.from(this.map.values());
    }
}
const ED_UlList = new UlList()
export class choiceMode {
    static updateDataListRegular(datalist, getList, interval = 500) {
        let lastToStr = '';
        const timer = setInterval(() => {
            if (!datalist || !document.contains(datalist)) {
                clearInterval(timer)
                return;
            }
            const list = getList();
            const listToStr = list.toString();
            if (listToStr === lastToStr) return;
            let innerHTML = '';
            for (const data of list) {
                innerHTML += `<option value=${data}>`;
            }
            datalist.innerHTML = innerHTML;
            lastToStr = listToStr;
        }, interval)
    }
    static giveDataList(input, list, id, father) {
        input.setAttribute("list", id);
        let innerHTML = '';
        for (const data of list) {
            innerHTML += `<option value=${data}>`
        }
        const dataList = document.createElement("datalist");
        dataList.setAttribute('id', id);
        dataList.innerHTML = innerHTML;
        father.append(dataList);
        return dataList
    }
    static reloadDataArea(ele) {
        ele.replaceChildren();
    }
    static init(ele) {
        const firstLine = element("div")
            .setStyle("position", "relative")
            .block()
            .exit()
        const DataArea = element("div")
            .style({
                "position": "relative",
                "height": "165px",
            })
            .addClass("xy-ED-skill-contentDataInput")
            .block()
            .exit()
        const submitArea = element()
            .setTarget(ui.create.x19D6_button(void 0, "生成"))
            .setStyle("position", "relative")
            .listen(x19D6_DEFAULT_EVENT, () => {
                const player = TransCnText.translate(firstLine.whoEle.value, NonameCN.ContentList);
                const event = TransCnText.translate(firstLine.doWhatEle.value, NonameCN.ContentList);
                const lefts = [];
                const rights = [];
                const set = [];
                for (const [index, node] of Array.from(DataArea.children).entries()) {
                    if (submitArea.NaPIndex && submitArea.NaPIndex.includes(index)) {
                        let [keySet, valueSet] = node.getData();
                        if (Array.isArray(valueSet)) valueSet = arrayToString(valueSet);
                        if (typeof valueSet === "object" && valueSet.toString() === "[object Object]") valueSet = objectToString(valueSet);
                        if (valueSet !== undefined) set.push(`.set("${keySet}",${valueSet})`);
                        continue;
                    }
                    const [left, right] = node.getData();
                    if (Array.isArray(left)) {
                        lefts.push(...left);
                        rights.push(...right);
                    }
                    else {
                        lefts.push(left);
                        rights.push(right);
                    }
                }
                if (submitArea.order) {
                    while (rights.length && rights.slice(-1)[0] === undefined) {
                        rights.pop();
                    }
                } else {
                    while (rights.includes(void 0)) {
                        rights.remove(void 0);
                    }
                }
                let argsStr = '';
                const addToArgStr = (arg, last) => {
                    if (Array.isArray(arg)) {
                        argsStr += "[";
                        arg.forEach((lowerArg, index) => { addToArgStr(lowerArg, index === arg.length - 1) })
                        argsStr += "]";
                    }
                    else if (typeof arg === "object" && arg.toString() === "[object Object]") {
                        argsStr += objectToString(arg)
                    }
                    else if (arg === undefined) {
                        argsStr += `void 0`
                    }
                    else {
                        argsStr += `${arg}`;
                    }
                    if (!last) argsStr += ',';
                }
                rights.forEach((arg, index) => addToArgStr(arg, index === rights.length - 1));
                const sentence = `${player}.${event}(${argsStr})${set.join("")}`;
                const content = game.x19D6_back.querySelector(".xy-ED-skill-contentTextarea");
                EditorInteraction.insertPhrase(content, "\n")
                EditorInteraction.insertPhrase(content, sentence)
                EditorInteraction.insertPhrase(content, "\n")
                content.arrange();
                content.submit();
                {
                    firstLine.whoEle.value = "";
                    firstLine.doWhatEle.value = "";
                    choiceMode.reloadDataArea(DataArea);
                }
            })
            .exit();
        const whoText = element("div").innerHTML("对象(谁)：").setStyle("position", "relative").block().exit();
        const who = element("input").type("search")
            .setStyle("position", "relative")
            .block()
            .addClass("xy-ED-skill-contentWho")
            .listen("change", () => {
                doWhat.value = "";
                choiceMode.reloadDataArea(DataArea);
            })
            .exit()
        const doWhatText = element("div").block().setStyle("position", "relative").innerHTML("方法(干什么)：").exit();
        const doWhat = element("input").block()
            .setStyle("position", "relative")
            .type("search")
            .addClass("xy-ED-skill-contentDoWhat")
            .listen("change", () => {
                choiceMode.reloadDataArea(DataArea);
                const methodName = TransCnText.translate(doWhat.value, NonameCN.ContentList);
                if (!(methodName in EditorParameterList)) return;
                if (EditorParameterList[methodName][0].order) submitArea.order = true;
                if (EditorParameterList[methodName][0].NaPIndex) submitArea.NaPIndex = Array.from(EditorParameterList[methodName][0].NaPIndex)
                for (const data of EditorParameterList[methodName]) {
                    choiceMode.pushControlOnData(DataArea, data);
                }
            })
            .exit()
        firstLine.whoEle = who;
        firstLine.doWhatEle = doWhat;
        firstLine.append(whoText, who, doWhatText, doWhat);
        const playerDataList = choiceMode.giveDataList(who, playerList, "xy-ED-skill-contentWho-list", firstLine);
        choiceMode.updateDataListRegular(playerDataList, getPlayerList)
        choiceMode.giveDataList(doWhat, methodsList, "xy-ED-skill-contentDoWhat-list", firstLine);
        ele.append(firstLine, DataArea, submitArea);
    }
    static pushControlOnData(DataArea, data = {}) {
        switch (data.type) {
            case "Player": return choiceMode.pushPlayerControl(DataArea, data);
            case "Players": return choiceMode.pushPlayersControl(DataArea, data);
            case "card": return choiceMode.pushCardControl(DataArea, data);
            case "cards": return choiceMode.pushCardsControl(DataArea, data);
            case "position": return choiceMode.pushPositionControl(DataArea, data);

            case "phase": return choiceMode.pushPhaseControl(DataArea, data);
            case "group": return choiceMode.pushGroupControl(DataArea, data);
            case "skill": return choiceMode.pushSkillControl(DataArea, data);
            case "expire": return choiceMode.pushExpireControl(DataArea, data);

            case "cardName": return choiceMode.pushCardNameControl(DataArea, data);
            case "suit": return choiceMode.pushSuitControl(DataArea, data);
            case "color": return choiceMode.pushColorControl(DataArea, data);
            case "type": return choiceMode.pushTypeControl(DataArea, data);
            case "subtype": return choiceMode.pushSubtypeControl(DataArea, data);
            case "nature": return choiceMode.pushNatureControl(DataArea, data);

            case "number": return choiceMode.pushNumControl(DataArea, data);
            case "numberArray": return choiceMode.pushNumArrayControl(DataArea, data);
            case "boolean": return choiceMode.pushBooleanControl(DataArea, data);
            case "string": return choiceMode.pushStringControl(DataArea, data);
            case "stringArray": return choiceMode.pushStringArrayControl(DataArea, data);

            case "stringToChoose": return choiceMode.pushStringChooseControl(DataArea, data);
            case "freeInput": return choiceMode.pushFreeInputControl(DataArea, data);
            case "otherArgs": return choiceMode.pushOtherArgsControl(DataArea, data);
            case "heArray": return choiceMode.pushHeArrayControl(DataArea, data);
            case "filterCard": return choiceMode.pushFilterCardControl(DataArea, data);
            default: return;
        }
    }

    static pushPlayerControl(father, { cn, value }) {
        const controlPlayerContainer = element("div")
            .block()
            .setStyle("position", "relative")
            .exit()
        const controlPlayerText = element("div").block().innerHTML(cn).setStyle("position", "relative").exit();
        const controlPlayer = element("input")
            .type("search")
            .block()
            .exit();
        const datalist = choiceMode.giveDataList(controlPlayer, getPlayerList(), `${cn}-${value}`, controlPlayerContainer);
        choiceMode.updateDataListRegular(datalist, getPlayerList);
        controlPlayerContainer.getData = () => {
            return [value, TransCnText.translate(controlPlayer.value, NonameCN.ContentList) || undefined];
        }
        controlPlayerContainer.append(controlPlayerText, controlPlayer);
        father.appendChild(controlPlayerContainer);
    }
    static pushPlayersControl(father, { cn, value }) {
        const controlContainer = element("div")
            .block()
            .setStyle("position", "relative")
            .exit()
        const controlText = element("div").block().innerHTML(cn).setStyle("position", "relative").exit();
        const playerContainer = element("div").block().innerHTML("选择角色").fontSize("0.8em").setStyle("position", "relative").exit();
        const playersContainer = element("div").block().innerHTML("选择角色组").fontSize("0.8em").addClass("x19D6_hidden").setStyle("position", "relative").exit();
        const playerInput = element("input").father(playerContainer).type("search").block().exit();
        const playersInput = element("input").father(playersContainer).type("search").block().exit();
        const addButton = (inner, buttonColor2) => {
            const button = element()
                .setTarget(ui.create.x19D6_button(controlContainer, inner))
                .setKey("Ptype", inner)
                .style({
                    margin: "",
                    marginRight: "1em",
                })
                .exit();
            element()
                .setTarget(ui.create.x19D6_button(button, "×", button, void 0, true))
                .style({ margin: "0 0.3em" })
                .exit();
            button.classList.add(`xy-ED-skill-button-color${buttonColor2 ? 2 : 1}`)
            return button;
        }
        element()
            .setTarget(ui.create.x19D6_button(controlText, "切换"))
            .shiftClassWhenWith(x19D6_DEFAULT_EVENT, "xy-ED-skill-chosen",
                [playerContainer, playersContainer], "x19D6_hidden")
            .exit();
        element().setTarget(playerInput)
            .listenTransEvent("keydown", "change", function () {
                if (!this.value) return;
                if (document.activeElement !== this) return;
                addButton(this.value).classList.add("xy-ED-skill-chosen");
                this.value = "";
            }, e => e.key === "Enter")
        element().setTarget(playersInput)
            .listenTransEvent("keydown", "change", function () {
                if (!this.value) return;
                if (document.activeElement !== this) return;
                addButton(this.value, true).classList.add("xy-ED-skill-chosen");
                this.value = "";
            }, e => e.key === "Enter")
        const datalistP = choiceMode.giveDataList(playerInput, getPlayerList(), `${cn}-${value}-player`, playerContainer);
        choiceMode.updateDataListRegular(datalistP, getPlayerList);
        const datalistPs = choiceMode.giveDataList(playersInput, getPlayersList(), `${cn}-${value}-players`, playerContainer);
        choiceMode.updateDataListRegular(datalistPs, getPlayersList);
        controlContainer.addEventListener(x19D6_DEFAULT_EVENT, e => {
            if (!e.target.classList.contains("x19D6_dialogButton")) return;
            e.target.Ptype && e.target.classList.toggle("xy-ED-skill-chosen");
        })
        controlContainer.getData = () => {
            const buttonsP = controlContainer.querySelectorAll(".x19D6_dialogButton.xy-ED-skill-chosen.xy-ED-skill-button-color1");
            const buttonsPs = controlContainer.querySelectorAll(".x19D6_dialogButton.xy-ED-skill-chosen.xy-ED-skill-button-color2");
            const playerArr = [...buttonsP].map(node => TransCnText.translate(node.Ptype, NonameCN.ContentList)).toUniqued();
            const playersArr = [...buttonsPs].map(node => TransCnText.translate(node.Ptype, NonameCN.ContentList)).toUniqued();
            if (!playerArr.length && !playersArr.length) return [value, void 0];
            if (!playersArr.length) return [value, playerArr];
            if (!playerArr.length && playersArr.length === 1) return [value, playersArr[0]];
            if (!playerArr.length) return [value, `[...${playersArr.join(",...")}]`];
            return [value, `[${playerArr},...${playersArr.join(",...")}]`];
        }
        controlContainer.append(controlText, playerContainer, playersContainer);
        father.appendChild(controlContainer);
    }
    static pushCardControl(father, { cn, value }) {
        const controlContainer = element("div")
            .block()
            .setStyle("position", "relative")
            .exit()
        const controlText = element("div").block().innerHTML(cn).setStyle("position", "relative").exit();
        const controlSearch = element("input")
            .type("search")
            .block()
            .exit();
        const datalist = choiceMode.giveDataList(controlSearch, getCardList(), `${cn}-${value}`, controlContainer);
        choiceMode.updateDataListRegular(datalist, getCardList);
        controlContainer.getData = () => {
            return [value, TransCnText.translate(controlSearch.value, NonameCN.ContentList) || undefined];
        }
        controlContainer.append(controlText, controlSearch);
        father.appendChild(controlContainer);
        return controlContainer;
    }
    static pushCardsControl(father, { cn, value }) {
        const controlContainer = element("div")
            .block()
            .setStyle("position", "relative")
            .exit()
        const controlText = element("div").block().innerHTML(cn).setStyle("position", "relative").exit();
        const cardsContainer = element("div").block().innerHTML("选择卡牌组").fontSize("0.8em").setStyle("position", "relative").exit();
        const cardsInput = element("input").father(cardsContainer).type("search").block().exit();
        const cardContainer = element("div").block().innerHTML("选择卡牌").fontSize("0.8em").addClass("x19D6_hidden").setStyle("position", "relative").exit();
        const cardInput = element("input").father(cardContainer).type("search").block().exit();
        const addButton = (inner, buttonColor2) => {
            const button = element()
                .setTarget(ui.create.x19D6_button(controlContainer, inner))
                .setKey("Ptype", inner)
                .style({
                    margin: "",
                    marginRight: "1em",
                })
                .exit();
            element()
                .setTarget(ui.create.x19D6_button(button, "×", button, void 0, true))
                .style({ margin: "0 0.3em" })
                .exit();
            button.classList.add(`xy-ED-skill-button-color${buttonColor2 ? 2 : 1}`)
            return button;
        }
        element()
            .setTarget(ui.create.x19D6_button(controlText, "切换"))
            .shiftClassWhenWith(x19D6_DEFAULT_EVENT, "xy-ED-skill-chosen",
                [cardContainer, cardsContainer], "x19D6_hidden")
            .exit();
        element().setTarget(cardInput)
            .listenTransEvent("keydown", "change", function () {
                if (!this.value) return;
                if (document.activeElement !== this) return;
                addButton(this.value).classList.add("xy-ED-skill-chosen");
                this.value = "";
            }, e => e.key === "Enter")
        element().setTarget(cardsInput)
            .listenTransEvent("keydown", "change", function () {
                if (!this.value) return;
                if (document.activeElement !== this) return;
                addButton(this.value, true).classList.add("xy-ED-skill-chosen");
                this.value = "";
            }, e => e.key === "Enter")
        const datalistP = choiceMode.giveDataList(cardInput, getCardList(), `${cn}-${value}-card`, cardContainer);
        choiceMode.updateDataListRegular(datalistP, getCardList);
        const datalistPs = choiceMode.giveDataList(cardsInput, getCardsList(), `${cn}-${value}-cards`, cardContainer);
        choiceMode.updateDataListRegular(datalistPs, getCardsList);
        controlContainer.addEventListener(x19D6_DEFAULT_EVENT, e => {
            if (!e.target.classList.contains("x19D6_dialogButton")) return;
            e.target.Ptype && e.target.classList.toggle("xy-ED-skill-chosen");
        })
        controlContainer.getData = () => {
            const buttonsP = controlContainer.querySelectorAll(".x19D6_dialogButton.xy-ED-skill-chosen.xy-ED-skill-button-color1");
            const buttonsPs = controlContainer.querySelectorAll(".x19D6_dialogButton.xy-ED-skill-chosen.xy-ED-skill-button-color2");
            const cardArr = [...buttonsP].map(node => TransCnText.translate(node.Ptype, NonameCN.ContentList)).toUniqued();
            const cardsArr = [...buttonsPs].map(node => TransCnText.translate(node.Ptype, NonameCN.ContentList)).toUniqued();
            if (!cardArr.length && !cardsArr.length) return [value, void 0];
            if (!cardsArr.length) return [value, cardArr];
            if (!cardArr.length && cardsArr.length === 1) return [value, cardsArr[0]];
            if (!cardArr.length) return [value, `[...${cardsArr.join(",...")}]`];
            return [value, `[${cardArr},...${cardsArr.join(",...")}]`];
        }
        controlContainer.append(controlText, cardContainer, cardsContainer);
        father.appendChild(controlContainer);
        return controlContainer;
    }

    static pushCardNameControl(father, data) {
        if (data.cn == null) data.cn = "牌名";
        if (data.stringMap == null) data.stringMap = getCardNameMap();
        if (data.autoDearray == null) data.autoDearray = true;
        return choiceMode.pushStringArrayControl(father, data);
    }
    static pushSuitControl(father, data) {
        if (data.cn == null) data.cn = "花色";
        if (data.stringMap == null) data.stringMap = suitMap;
        if (data.autoDearray == null) data.autoDearray = true;
        return choiceMode.pushStringArrayControl(father, data);
    }
    static pushColorControl(father, data) {
        if (data.cn == null) data.cn = "颜色";
        if (data.stringMap == null) data.stringMap = colorMap;
        if (data.autoDearray == null) data.autoDearray = true;
        return choiceMode.pushStringArrayControl(father, data);
    }
    static pushTypeControl(father, data) {
        if (data.cn == null) data.cn = "类别";
        if (data.stringMap == null) data.stringMap = typeMap;
        if (data.autoDearray == null) data.autoDearray = true;
        return choiceMode.pushStringArrayControl(father, data);
    }
    static pushSubtypeControl(father, data) {
        if (data.cn == null) data.cn = "副类别";
        if (data.stringMap == null) data.stringMap = subtypeMap;
        if (data.autoDearray == null) data.autoDearray = true;
        return choiceMode.pushStringArrayControl(father, data);
    }
    static pushNatureControl(father, { cn = "属性", value, single }) {
        const controlContainer = choiceMode.pushStringChooseControl(father, { cn, value, single, choices: Object.entries(natureMap) })
        controlContainer.getData = () => {
            const nodes = controlContainer.querySelectorAll(".x19D6_dialogButton.xy-ED-skill-chosen");
            const natures = [...nodes].map(node => node.value);
            return [value, natures.length ? `"${natures.join("|")}"` : void 0];
        }
        return controlContainer;
    }


    static pushOtherArgsControl(father, { cn = "其他设置", args = [] }) {
        const controlArgsContainer = element("div")
            .block()
            .setStyle("position", "relative")
            .exit()
        const controlArgsText = element("div").block().innerHTML(cn).setStyle("position", "relative").father(controlArgsContainer).exit();
        for (const arg of args) {
            const button = element()
                .setTarget(ui.create.x19D6_button(controlArgsContainer, arg.cn))
                .style({
                    margin: "",
                    marginRight: "1em"
                })
                .exit();
            button.value = arg.value;
            if (!button.key) button.key = arg.key;
            if (arg.defaultValue) {
                button.classList.add("xy-ED-skill-chosen");
            }
        }
        controlArgsContainer.addEventListener(x19D6_DEFAULT_EVENT, e => {
            if (!e.target.classList.contains("x19D6_dialogButton")) return;
            e.target.classList.toggle("xy-ED-skill-chosen");
        })
        controlArgsContainer.getData = () => {
            const nodes = controlArgsContainer.querySelectorAll(".x19D6_dialogButton");
            const keys = [...nodes].map(node => node.key), values = [];
            nodes.forEach((node, index) => {
                if (node.classList.contains("xy-ED-skill-chosen")) {
                    values[index] = `"${node.value}"`;
                }
            })
            return [keys, values];
        }
        father.appendChild(controlArgsContainer);
    }
    static pushHeArrayControl(father, { cn, value, eles = [] }) {
        const controlContainer = element("div")
            .block()
            .setStyle("position", "relative")
            .exit()
        let controlText = null
        if (cn) {
            controlText = element("div").block().innerHTML(cn).setStyle("position", "relative").father(controlContainer).exit();
        }
        for (const data of eles) {
            choiceMode.pushControlOnData(controlContainer, data);
        }
        controlContainer.getData = () => {
            const heArray = [];
            for (const node of controlContainer.children) {
                const [left, right] = node.getData();
                if (Array.isArray(left)) {
                    heArray.push(...right);
                }
                else {
                    heArray.push(right);
                }
            }
            if (eles[0].order) {
                while (heArray.slice(-1)[0] === void 0) {
                    heArray.pop();
                }
            } else {
                while (heArray.includes(void 0)) {
                    heArray.remove(void 0);
                }
            }
            return [value, heArray];
        }
        controlContainer.getSetData = () => {
            const lefts = [], rights = [];
            for (const node of controlContainer.children) {
                const [left, right] = node.getData();
                if (Array.isArray(left)) {
                    lefts.push(...left);
                    rights.push(...right);
                }
                else {
                    lefts.push(left);
                    rights.push(right);
                }
            }
            return [lefts, rights];
        }
        father.appendChild(controlContainer);
    }
    static pushFreeInputControl(father, { cn, value, choices = [] }) {
        const controlContainer = element("div")
            .block()
            .setStyle("position", "relative")
            .exit()
        const controlText = element("div").block().innerHTML(cn).setStyle("position", "relative").exit();
        const control = element("input")
            .type("search")
            .block()
            .exit();
        const getFreeInputList = () => {
            return [...Object.keys(choices), ...getVarOfContent()];
        }
        const datalist = choiceMode.giveDataList(control, getFreeInputList(), `${cn}-${value}`, controlContainer);
        choiceMode.updateDataListRegular(datalist, getFreeInputList);
        controlContainer.getData = () => {
            let trans = choices[control.value] || TransCnText.translate(control.value, NonameCN.ContentList);
            return [value, trans || undefined];
        }
        controlContainer.append(controlText, control);
        father.appendChild(controlContainer);
    }


    static pushBooleanControl(father, { cn, value, defaultValue, cnTrue = "是", cnFalse = "否" }) {
        const controlBoolContainer = element("div")
            .block()
            .setStyle("position", "relative")
            .exit()
        const controlBoolText = element("div").block().innerHTML(cn).setStyle("position", "relative").exit();
        const controlBool = element("input")
            .type("search")
            .hook(ele => {
                if (defaultValue === true) ele.value = cnTrue;
                if (defaultValue === false) ele.value = cnFalse;
            })
            .block()
            .exit();
        const datalist = choiceMode.giveDataList(controlBool, getBoolList(cnTrue, cnFalse), `${cn}-${value}`, controlBoolContainer);
        choiceMode.updateDataListRegular(datalist, () => getBoolList(cnTrue, cnFalse));
        controlBoolContainer.getData = () => {
            let data = controlBool.value || undefined
            if (data === cnTrue) data = true;
            if (data === cnFalse) data = false;
            return [value, data];
        }
        controlBoolContainer.append(controlBoolText, controlBool);
        father.appendChild(controlBoolContainer);
    }
    static pushNumControl(father, { cn, value, defaultVars = [], max = Infinity, min = -Infinity }) {
        const controlNumContainer = element("div")
            .block()
            .setStyle("position", "relative")
            .exit()
        const controlNumText = element("div").block().innerHTML(`${cn}：<span></span>`).setStyle("position", "relative").exit();
        const varButton = ui.create.x19D6_button(controlNumText, "使用变量");
        const controlNum = element("input")
            .type("number")
            .block()
            .min(min)
            .max(max)
            .listen("change", e => {
                const num = parseInt(e.target.value)
                if (isNaN(num)) e.target.value = "";
                if (num > e.target.max) e.target.value = e.target.max;
                if (num < e.target.min) e.target.value = e.target.min;
                const node = controlNumText.querySelector("span");
                node.textContent = e.target.value;
            })
            .exit();
        const controlNumVar = element("input")
            .type("search")
            .block()
            .addClass("x19D6_hidden")
            .listen("change", e => {
                const node = controlNumText.querySelector("span");
                node.textContent = e.target.value.split(":").at(0);
            })
            .exit();
        const datalist = choiceMode.giveDataList(controlNumVar, getNumberVarList(...defaultVars), `${cn}-${value}`, controlNumContainer);
        choiceMode.updateDataListRegular(datalist, () => getNumberVarList(...defaultVars));
        varButton.addEventListener(x19D6_DEFAULT_EVENT, () => {
            varButton.classList.toggle("xy-ED-skill-chosen");
            controlNum.classList.toggle("x19D6_hidden");
            controlNumVar.classList.toggle("x19D6_hidden");
            controlNumContainer.useVar = !controlNumContainer.useVar;
            const node = controlNumText.querySelector("span");
            node.textContent = (controlNumContainer.useVar ? controlNumVar : controlNum).value;
        })
        controlNumContainer.getData = () => {
            let data = (controlNumContainer.useVar ? controlNumVar : controlNum).value
            return [value, data || undefined];
        }
        controlNumContainer.append(controlNumText, controlNum, controlNumVar);
        father.appendChild(controlNumContainer);
        return controlNumContainer;
    }
    static pushNumArrayControl(father, { cn, value, select, autoDearray, defaultVars = [], max = Infinity, min = -Infinity }) {
        const controlNumContainer = element("div")
            .block()
            .setStyle("position", "relative")
            .exit()
        const controlNumText = element("div").block().innerHTML(`${cn}：<span></span>`).setStyle("position", "relative").exit();
        const controlButtonContainer = element("div").block().setStyle("position", "relative").exit();
        const varButton = ui.create.x19D6_button(controlNumText, "使用变量");
        const outputNumberArray = [];
        const adjustBiggerAndSmaller = () => {
            if (!outputNumberArray.length) return;
            while (outputNumberArray.length > 2) {
                const number = outputNumberArray.shift();
                const node = controlButtonContainer.querySelector(`[data-number="${number}"]`);
                node.classList.remove("xy-ED-skill-chosen");
                outputNumberArray.remove(number);
            }
            const span = controlNumText.querySelector("span");
            if (outputNumberArray.length === 0) span.innerText = ''
            if (outputNumberArray.length === 1) span.innerText = (outputNumberArray[0] == Infinity ? '∞' : outputNumberArray[0]);
            if (outputNumberArray.length === 2) {
                const num1 = Number(outputNumberArray[0]), num2 = Number(outputNumberArray[1]);
                if (!isNaN(num1) && !isNaN(num2) && num1 > num2) outputNumberArray.reverse();
                span.innerText = (outputNumberArray.map(word => word == Infinity ? '∞' : word).join("到"));
            }
        }
        const addButton = (inner) => {
            if (controlButtonContainer.querySelector(`[data-number="${inner}"]`)) return;
            const button = element()
                .setTarget(ui.create.x19D6_button(controlButtonContainer, inner))
                .setAttribute("number", inner)
                .style({
                    margin: "",
                    marginRight: "1em",
                })
                .exit();
            element()
                .setTarget(ui.create.x19D6_button(button, "×", button, () => {
                    outputNumberArray.remove(inner)
                    if (select) {
                        adjustBiggerAndSmaller()
                    }
                }, true))
                .style({ margin: "0 0.3em" })
                .exit();
            button.classList.add("xy-ED-skill-chosen");
            outputNumberArray.push(inner);
            if (select) adjustBiggerAndSmaller()
            return button;
        }
        const controlNum = element("input")
            .type("number")
            .block()
            .min(min)
            .max(max)
            .listenTransEvent("keydown", "blur", function (e) {
                if (!this.value) return;
                const num = parseInt(e.target.value)
                if (isNaN(num)) e.target.value = "";
                if (num > e.target.max) e.target.value = e.target.max;
                if (num < e.target.min) e.target.value = e.target.min;
                addButton(e.target.value);
                this.value = "";
            }, e => e.key === "Enter")
            .exit();
        const controlNumVar = element("input")
            .type("search")
            .block()
            .setKey("placeholder", "输入后请敲击回车")
            .addClass("x19D6_hidden")
            .listenTransEvent("keydown", "change", function (e) {
                if (!this.value) return;
                if (document.activeElement !== this) return;
                addButton(e.target.value);
                this.value = "";
            }, e => e.key === "Enter")
            .exit();
        const datalist = choiceMode.giveDataList(controlNumVar, getNumberVarList(...defaultVars), `${cn}-${value}`, controlNumContainer);
        choiceMode.updateDataListRegular(datalist, () => getNumberVarList(...defaultVars));
        varButton.addEventListener(x19D6_DEFAULT_EVENT, () => {
            varButton.classList.toggle("xy-ED-skill-chosen");
            controlNum.classList.toggle("x19D6_hidden");
            controlNumVar.classList.toggle("x19D6_hidden");
            controlNumContainer.useVar = !controlNumContainer.useVar;
        })
        controlNumContainer.addEventListener(x19D6_DEFAULT_EVENT, e => {
            if (!e.target.classList.contains("x19D6_dialogButton")) return;
            const number = e.target.getAttribute("data-number")
            if (number) {
                if (e.target.classList.contains("xy-ED-skill-chosen")) {
                    outputNumberArray.remove(number);
                    e.target.classList.remove("xy-ED-skill-chosen")
                } else {
                    outputNumberArray.push(number);
                    e.target.classList.add("xy-ED-skill-chosen")
                }
            }
            if (select) adjustBiggerAndSmaller();
        })
        controlNumContainer.getData = () => {
            if (!outputNumberArray.length) return [value, undefined];
            if (outputNumberArray.length === 1 && autoDearray) return [value, outputNumberArray.at(0)];
            return [value, outputNumberArray];
        }
        controlNumContainer.append(controlNumText, controlNum, controlNumVar, controlButtonContainer);
        father.appendChild(controlNumContainer);
        return controlNumContainer;
    }
    static pushStringControl(father, { cn, value, longStr, skillIdToList, stringDefaultList = [], stringMap }) {
        const controlContainer = element("div")
            .block()
            .setStyle("position", "relative")
            .exit()
        const controlText = element("div").block().innerHTML(cn).setStyle("position", "relative").exit();
        const control = element(longStr ? "textarea" : "input")
            .type("search")
            .addClassUnder(longStr, "xy-ED-skill-longInput")
            .block()
            .exit();
        const stringList = [...stringDefaultList];
        if (stringMap) {
            stringList.push(...Object.keys(stringMap))
        }
        if (skillIdToList) {
            const sourceId = getSourceID(), id = getSkillID();
            stringList.push(id);
            if (sourceId !== id) stringList.push(sourceId);
        }
        choiceMode.giveDataList(control, stringList, `${cn}-${value}`, controlContainer);
        controlContainer.getData = () => {
            if (!control.value.length) return [value, void 0]
            let output = control.value;
            if (stringMap && stringMap[control.value]) output = stringMap[output];
            if (isTemplateRegexp.test(output)) return [value, `\`${output}\``]
            return [value, `"${output}"`];
        }
        controlContainer.append(controlText, control);
        father.appendChild(controlContainer);
        return controlContainer;
    }
    static pushStringArrayControl(father, { cn, value, autoDearray, uniqueElement = true, skillIdToList, stringDefaultList = [], stringMap }) {
        const controlContainer = element("div")
            .block()
            .setStyle("position", "relative")
            .exit()
        const controlText = element("div").block().innerHTML(cn).setStyle("position", "relative").exit();
        const control = element("input")
            .type("search")
            .setKey("placeholder", "输入后请敲击回车")
            .block()
            .exit();
        const controlButtonContainer = element("div").block().setStyle("position", "relative").exit();
        const outputStringArray = [];
        const stringList = [...stringDefaultList];
        const addButton = (inner) => {
            if (uniqueElement !== false && controlButtonContainer.querySelector(`[data-string="${inner}"]`)) return;
            const button = element()
                .setTarget(ui.create.x19D6_button(controlButtonContainer, inner))
                .setAttribute("string", inner)
                .style({
                    margin: "",
                    marginRight: "1em",
                })
                .exit();
            element()
                .setTarget(ui.create.x19D6_button(button, "×", button, () => {
                    outputStringArray.remove(inner);
                }, true))
                .style({ margin: "0 0.3em" })
                .exit();
            button.classList.add("xy-ED-skill-chosen")
            outputStringArray.push(inner)
            return button;
        }
        if (stringMap) {
            stringList.push(...Object.keys(stringMap))
        }
        if (skillIdToList) {
            const sourceId = getSourceID(), id = getSkillID();
            stringList.push(id);
            if (sourceId !== id) stringList.push(sourceId);
        }
        choiceMode.giveDataList(control, stringList, `${cn}-${value}`, controlContainer);
        element().setTarget(control)
            .listenTransEvent("keydown", "change", function () {
                if (!this.value) return;
                if (document.activeElement !== this) return;
                addButton(this.value);
                this.value = "";
            }, e => e.key === "Enter")
        controlContainer.addEventListener(x19D6_DEFAULT_EVENT, e => {
            if (!e.target.classList.contains("x19D6_dialogButton")) return;
            const string = e.target.getAttribute("data-string");
            if (string) {
                if (e.target.classList.contains("xy-ED-skill-chosen")) {
                    outputStringArray.remove(string);
                    e.target.classList.remove("xy-ED-skill-chosen")
                } else {
                    outputStringArray.push(string);
                    e.target.classList.add("xy-ED-skill-chosen")
                }
            }
        })
        controlContainer.getData = () => {
            if (!outputStringArray.length) return [value, void 0]
            const untransStrings = stringMap ? outputStringArray.map(word => stringMap[word]) : outputStringArray
            const strings = untransStrings.map(stringValue => isTemplateRegexp.test(stringValue) ? `\`${stringValue}\`` : `"${stringValue}"`)
            if (outputStringArray.length === 1 && autoDearray) return [value, strings.at(0)];
            return [value, strings];
        }
        controlContainer.append(controlText, control, controlButtonContainer);
        father.appendChild(controlContainer);
        return controlContainer;
    }
    static pushStringChooseControl(father, { cn, value, choices = [], directChoices = [], single = true }) {
        const controlContainer = element("div")
            .block()
            .setStyle("position", "relative")
            .exit()
        const controlText = element("div").block().innerHTML(cn).setStyle("position", "relative").exit();
        const controlButtonContainer = element("div").block().setStyle("position", "relative").exit();
        for (const [cn, StrValue] of choices) {
            const button = element()
                .setTarget(ui.create.x19D6_button(controlButtonContainer, cn))
                .style({
                    margin: "",
                    marginRight: "1em"
                })
                .exit();
            button.value = StrValue;
        }
        for (const choice of directChoices) {
            const button = element()
                .setTarget(ui.create.x19D6_button(controlButtonContainer, choice))
                .style({
                    margin: "",
                    marginRight: "1em"
                })
                .exit();
            button.value = choice;
        }
        controlButtonContainer.addEventListener(x19D6_DEFAULT_EVENT, e => {
            if (!e.target.classList.contains("x19D6_dialogButton")) return;
            if (single) controlButtonContainer.querySelectorAll(".x19D6_dialogButton.xy-ED-skill-chosen")
                .forEach(node => e.target !== node && node.classList.remove("xy-ED-skill-chosen"));
            e.target.classList.toggle("xy-ED-skill-chosen");
        })
        controlContainer.getData = () => {
            const nodes = controlContainer.querySelectorAll(".x19D6_dialogButton.xy-ED-skill-chosen");
            const chosen = [...nodes].map(node => node.value)
            return [value, chosen.length ? `"${chosen}"` : void 0];
        }
        controlContainer.append(controlText, controlButtonContainer)
        father.appendChild(controlContainer);
        return controlContainer;
    }

    static pushPositionControl(father, { cn = "区域", value, single, defaultValue = [], positionList = "he" }) {
        const controlContainer = element("div")
            .block()
            .setStyle("position", "relative")
            .exit()
        const controlText = element("div").block().innerHTML(cn).setStyle("position", "relative").father(controlContainer).exit();
        for (const position of positionList) {
            const button = element()
                .setTarget(ui.create.x19D6_button(controlContainer, positionMap[position]))
                .style({
                    margin: "",
                    marginRight: "1em"
                })
                .exit();
            button.value = position;
            if (defaultValue.includes(position)) {
                button.classList.add("xy-ED-skill-chosen");
            }
        }
        controlContainer.addEventListener(x19D6_DEFAULT_EVENT, e => {
            if (!e.target.classList.contains("x19D6_dialogButton")) return;
            if (single) {
                controlContainer.querySelectorAll(".x19D6_dialogButton.xy-ED-skill-chosen")
                    .forEach(node => e.target !== node && node.classList.remove("xy-ED-skill-chosen"));
            }
            e.target.classList.toggle("xy-ED-skill-chosen");
        })
        controlContainer.getData = () => {
            const nodes = controlContainer.querySelectorAll(".x19D6_dialogButton.xy-ED-skill-chosen");
            const position = [...nodes].map(node => node.value).join("")
            return [value, position.length ? `"${position}"` : void 0];
        }
        father.appendChild(controlContainer);
        return controlContainer;
    }
    static pushPhaseControl(father, { cn = "阶段", value, single, defaultValue = [], mustBeArray }) {
        const controlContainer = element("div")
            .block()
            .setStyle("position", "relative")
            .exit()
        const controlText = element("div").block().innerHTML(cn).setStyle("position", "relative").father(controlContainer).exit();
        for (const phase of phaseList) {
            const button = element()
                .setTarget(ui.create.x19D6_button(controlContainer, lib.translate[phase]))
                .style({
                    margin: "",
                    marginRight: "1em"
                })
                .exit();
            button.value = phase;
            if (defaultValue.includes(phase)) {
                button.classList.add("xy-ED-skill-chosen");
            }
        }
        controlContainer.addEventListener(x19D6_DEFAULT_EVENT, e => {
            if (!e.target.classList.contains("x19D6_dialogButton")) return;
            if (single) {
                controlContainer.querySelectorAll(".x19D6_dialogButton.xy-ED-skill-chosen")
                    .forEach(node => e.target !== node && node.classList.remove("xy-ED-skill-chosen"));
            }
            e.target.classList.toggle("xy-ED-skill-chosen");
        })
        controlContainer.getData = () => {
            const nodes = controlContainer.querySelectorAll(".x19D6_dialogButton.xy-ED-skill-chosen");
            const phases = [...nodes].map(node => `"${node.value}"`)
            if (mustBeArray) return [value, phases];
            if (!phases.length) return [value, void 0]
            return [value, phases.length === 1 ? phases[0] : phases]
        }
        father.appendChild(controlContainer);
    }
    static pushGroupControl(father, { cn = "势力", value, single, defaultValue = [], mustBeArray }) {
        const controlContainer = element("div")
            .block()
            .setStyle("position", "relative")
            .exit()
        const controlText = element("div").block().innerHTML(cn).setStyle("position", "relative").father(controlContainer).exit();
        for (const group of lib.group) {
            const groupTranslation = get.plainText(lib.translate[group])
            if (!groupTranslation) continue;
            const button = element()
                .setTarget(ui.create.x19D6_button(controlContainer, groupTranslation))
                .style({
                    margin: "",
                    marginRight: "1em"
                })
                .exit();
            button.value = group;
            if (defaultValue.includes(group)) {
                button.classList.add("xy-ED-skill-chosen");
            }
        }
        controlContainer.addEventListener(x19D6_DEFAULT_EVENT, e => {
            if (!e.target.classList.contains("x19D6_dialogButton")) return;
            if (single) {
                controlContainer.querySelectorAll(".x19D6_dialogButton.xy-ED-skill-chosen")
                    .forEach(node => e.target !== node && node.classList.remove("xy-ED-skill-chosen"));
            }
            e.target.classList.toggle("xy-ED-skill-chosen");
        })
        controlContainer.getData = () => {
            const nodes = controlContainer.querySelectorAll(".x19D6_dialogButton.xy-ED-skill-chosen");
            const groups = [...nodes].map(node => `"${node.value}"`)
            if (mustBeArray) return [value, groups];
            if (!groups.length) return [value, void 0]
            return [value, groups.length === 1 ? groups[0] : groups]
        }
        father.appendChild(controlContainer);
    }
    static pushSkillControl(father, { cn = "技能", value, filter, single, defaultValue = [], mustBeArray }) {
        const controlContainer = element("div")
            .block()
            .addClass("xy-ED-skill-skillControl")
            .setStyle("position", "relative")
            .setStyle("margin-bottom", "0.4em")
            .exit()
        const controlText = element("div").block().innerHTML(cn).setStyle("position", "relative").exit();
        const controlSearchContainer = element("div").block().setStyle("position", "relative").exit();
        const controlSearch = element("input").type("search").setKey("placeholder", "回车可搜索技能").setStyle("position", "relative").exit();
        const controlSearchSubmit = element("button").innerHTML("提交").addClass("xy-ED-skill-button").exit();
        const controlSearch2 = element("input").type("search").addClass("x19D6_hidden").width("12em").setKey("placeholder", "回车以增加变量").setStyle("position", "relative").exit();
        const controlSkillInfo = element("ul").exit();
        ED_UlList.add(controlSearch, controlSkillInfo)
        let controlVarTypeShift
        const addButton = (skill, deletable = true, isVar, isSkillsVar) => {
            const button = element()
                .setTarget(ui.create.x19D6_button(controlContainer, get.plainText(lib.translate[skill] || skill)))
                .style({
                    margin: "",
                    marginRight: "1em",
                })
                .exit();
            button.value = skill;
            if (deletable) {
                element()
                    .setTarget(ui.create.x19D6_button(button, "×", button, e => {
                        const node = e.target;
                        const li = node.parentNode.li;
                        if (li) {
                            li.button = null
                            li && li.classList.toggle("xy-ED-skill-chosen");
                        }
                    }, true))
                    .style({ margin: "0 0.3em" })
                    .exit();
            }
            if (isVar && isSkillsVar) {
                button.classList.add("xy-ED-skill-isVarAnother");
            } else if (isVar) {
                button.classList.add("xy-ED-skill-isVar");
            }
            return button;
        }
        const toggleButtonStatus = (button) => {
            if (single) {
                controlContainer.querySelectorAll(".xy-ED-skill-skillControl>.x19D6_dialogButton.xy-ED-skill-chosen")
                    .forEach(node => button != node && node.classList.remove("xy-ED-skill-chosen"));
            }
            button.classList.toggle("xy-ED-skill-chosen");
        }
        if (!single) {
            controlVarTypeShift = element("button")
                .innerHTML("技能组变量")
                .addClass("xy-ED-skill-button", "x19D6_hidden")
                .setStyle("margin", "auto 1px")
                .listen(x19D6_DEFAULT_EVENT, e => {
                    if (!e.target.classList.contains("xy-ED-skill-chosen")) controlSearch2.setAttribute("list", `${cn}-${value}-skills`)
                    if (e.target.classList.contains("xy-ED-skill-chosen")) controlSearch2.setAttribute("list", `${cn}-${value}-skill`)
                    e.target.classList.toggle("xy-ED-skill-chosen")
                })
                .exit()
            const datalistSkills = choiceMode.giveDataList(controlSearch2, getSkillsList(), `${cn}-${value}-skills`, controlSearchContainer)
            choiceMode.updateDataListRegular(datalistSkills, getSkillsList);
        }
        element().setTarget(ui.create.x19D6_button(controlText, "使用变量"))
            .shiftClassWhenWith(x19D6_DEFAULT_EVENT, "xy-ED-skill-chosen",
                [controlSearchSubmit, controlSearch, controlSearch2, controlVarTypeShift], "x19D6_hidden")
        element().setTarget(controlSearch2)
            .listenTransEvent("keydown", "change", function () {
                if (!this.value) return;
                if (document.activeElement !== this) return;
                const id = this.value;
                const button = addButton(id, true, true, controlVarTypeShift && controlVarTypeShift.classList.contains("xy-ED-skill-chosen"));
                toggleButtonStatus(button);
                this.value = "";
            }, e => e.key === "Enter")
        const datalist = choiceMode.giveDataList(controlSearch2, getSkillList(), `${cn}-${value}-skill`, controlSearchContainer)
        choiceMode.updateDataListRegular(datalist, getSkillList);
        controlContainer.addEventListener(x19D6_DEFAULT_EVENT, e => {
            if (!e.target.classList.contains("x19D6_dialogButton")) return;
            if (e.target.parentNode !== controlContainer) return;
            toggleButtonStatus(e.target);
        })
        controlSearchSubmit.addEventListener(x19D6_DEFAULT_EVENT, e => {
            if (!controlSearch.value || controlSearch.value == " ") return;
            const id = controlSearch.value;
            const button = addButton(id, true);
            toggleButtonStatus(button);
            controlSearch.value = "";
        })
        controlSearch.addEventListener("change", e => {
            if (!e.target.value.length) return controlSkillInfo.replaceChildren();
            ED_UlList.showOnly(controlSearch);
            const keywords = e.target.value.split(" ");
            const result = [];
            const firstturnWord = keywords.shift();
            for (const id in lib.skill) {
                if (filter && !filter(lib.skill[id])) continue;
                if (id.includes(firstturnWord)) result.push(id);
                else if ((lib.translate[id] || '').includes(firstturnWord)) result.push(id);
                else if ((lib.translate[id + "_info"] || '').includes(firstturnWord)) result.push(id);
                if (result.length > 100) break;
            }
            for (const keyword of keywords) {
                for (const id of [...result]) {
                    const bool1 = !id.includes(keyword);
                    const bool2 = !(lib.translate[id] || '').includes(keyword)
                    const bool3 = !(lib.translate[id + "_info"] || '').includes(keyword)
                    bool1 && bool2 && bool3 && result.remove(id);
                }
            }
            const nodes = result.map(id => {
                let inner = `${get.plainText(get.translation(id))}(${id}):${get.plainText(get.translation(lib.translate[id + "_info"] || ""))}`;
                inner = inner.replace(firstturnWord, `<span>${firstturnWord}</span>`)
                for (const word of keywords) {
                    inner = inner.replace(word, `<span>${word}</span>`)
                }
                const node = element("li")
                    .innerHTML(inner)
                    .listenNotScroll(x19D6_DEFAULT_EVENT, function (e) {
                        this.classList.toggle("xy-ED-skill-chosen");
                        if (this.button) {
                            this.button.remove();
                            this.button = null;
                            return;
                        }
                        const button = addButton(this.dataset.id);
                        button.li = this;
                        this.button = button;
                        toggleButtonStatus(button)
                    }, { passive: true })
                    .exit();
                node.dataset.id = id;
                const button = [...controlContainer.querySelectorAll(".x19D6_dialogButton")].find(btn => btn.value === id)
                if (button) {
                    node.button = button;
                    button.li = node;
                    node.classList.toggle("xy-ED-skill-chosen");
                }
                return node;
            })
            controlSkillInfo.replaceChildren(...nodes);
        })
        if (lib.config.touchscreen) {
            controlSearch.addEventListener("change", e => {
                if (!e.target.value.length) {
                    ui.x19D6_noStyle(game.x19D6_back);
                } else if (controlSkillInfo.childNodes.length) {
                    ui.x19D6_centerToLeft(game.x19D6_back)
                }
            })
        }
        controlContainer.getData = () => {
            const nodes = controlContainer.querySelectorAll(".xy-ED-skill-skillControl>.x19D6_dialogButton.xy-ED-skill-chosen");
            const skills = [];
            const skillVars = [];
            const skillsVars = [];
            for (const node of nodes) {
                if (node.classList.contains("xy-ED-skill-isVar")) skillVars.push(node.value);
                else if (node.classList.contains("xy-ED-skill-isVarAnother")) skillsVars.push(node.value);
                else skills.push(`"${node.value}"`);
            }
            const skillArray = [...skills, ...skillVars]
            if (skillsVars.length) {
                if (skillArray.length) return [value, `[${skillArray},...${skillsVars.join(",...")}]`]
                if (skillsVars.length === 1) return [value, skillsVars.at(0)];
                return [value, `[...${skillsVars.join(",...")}]`]
            }
            if (mustBeArray) return [value, skillArray];
            if (!skillArray.length) return [value, void 0];
            if (skillArray.length === 1) return [value, skillArray[0]]
            return [value, skillArray]
        }
        father.appendChild(controlContainer);
        controlContainer.append(controlText, controlSearchContainer, controlSkillInfo);
        controlSearchContainer.append(controlSearch, controlSearchSubmit, controlSearch2);
        if (!single) controlSearchContainer.append(controlVarTypeShift)
        const ID = getSkillID(), sourceID = getSourceID();
        addButton(ID, false);
        if (ID !== sourceID) addButton(sourceID, false);
        if (defaultValue && defaultValue.length) {
            defaultValue.forEach(id => addButton(id, false));
        }
    }
    static pushExpireControl(father, { cn, value, defaultValue }) {
        const controlContainer = element("div")
            .block()
            .setStyle("position", "relative")
            .setStyle("margin-bottom", "0.4em")
            .exit()
        const controlText = element("div").block().innerHTML(cn).setStyle("position", "relative").exit();
        const controlExpire = element("div").block().setStyle("position", "relative").exit();
        const interfaces = [];
        const addButton = (parentNode, inner) => {
            const button = element()
                .setTarget(ui.create.x19D6_button(parentNode, inner))
                .setKey("triggerCn", inner)
                .style({
                    margin: "",
                    marginRight: "1em",
                })
                .exit();
            element()
                .setTarget(ui.create.x19D6_button(button, "×", button, void 0, true))
                .style({ margin: "0 0.3em" })
                .exit();
            return button;
        }
        for (const [index, [triType, triCn]] of triggerTypeList.entries()) {
            const interfaceEle = element("div")
                .block().fontSize("0.8em").style({ "position": "relative", "margin": "10px 0" })
                .setKey("type", triType)
                .exit();
            const who = element("div").block().innerHTML(triCn).setKey("type", triType)
                .style({ "position": "relative" }).exit();
            const triggerEle = element("input").type("search")
                .setKey("placeholder", "输入时机回车以添加").fontSize("0.8em")
                .width("90%").block().setStyle("position", "relative")
                .listenTransEvent("keydown", "change", function (e) {
                    if (document.activeElement !== this) return;
                    if (!this.value.length) return;
                    const str = this.value
                    const buttons = interfaceEle.querySelectorAll(".x19D6_dialogButton");
                    if ([...buttons].every(button => button.innerText.replace("×", "") !== str))
                        addButton(interfaceEle, this.value).classList.add("xy-ED-skill-chosen");
                    this.value = '';
                }, e => e.key === "Enter")
                .exit();
            element()
                .setTarget(ui.create.x19D6_button(controlText, index))
                .style({
                    margin: "0 0.3em",
                    "border-radius": "50%",
                    backgroundColor: "yellow",
                    width: "0.8em",
                    height: "0.8em",
                    lineHeight: "0.8",
                    position: "relative"
                })
                .fontSize("0.8em")
                .setKey("myInterfaceEle", interfaceEle)
                .listen(x19D6_DEFAULT_EVENT, e => {
                    controlExpire.childNodes.forEach(node => {
                        node.classList.add("x19D6_hidden")
                    })
                    e.target.myInterfaceEle.classList.remove("x19D6_hidden")
                })
                .exit()
            choiceMode.giveDataList(triggerEle, getTriggerList(triType), `${cn}-${value}-${triType}`, interfaceEle);
            if (index > 0) interfaceEle.classList.add("x19D6_hidden");
            interfaceEle.append(who, triggerEle);
            interfaces.push(interfaceEle);
        }
        controlContainer.addEventListener(x19D6_DEFAULT_EVENT, e => {
            if (!e.target.classList.contains("x19D6_dialogButton")) return;
            e.target.classList.toggle("xy-ED-skill-chosen");
        })
        controlContainer.getData = () => {
            const result = {}; let forever = false;
            for (const interfaceEle of interfaces) {
                const type = interfaceEle.type;
                const buttons = interfaceEle.querySelectorAll(".x19D6_dialogButton.xy-ED-skill-chosen");
                const triggers = [...buttons]
                    .map(button => TransCnText.translate(button.triggerCn, { ...NonameCN.TriList, "无期": '"forever"' }).split(":").slice(-1)[0]);
                if (!triggers.length) continue;
                if (triggers.includes('"forever"')) { forever = true; break; }
                result[type] = triggers.length === 1 ? triggers[0] : triggers;
            }
            if (forever) return [value, '"forever"']
            if (!Object.keys(result).length) return [value, void 0];
            return [value, result];
        }
        father.appendChild(controlContainer);
        controlContainer.append(controlText, controlExpire);
        controlExpire.append(...interfaces)
        if (defaultValue && defaultValue.length) {
            defaultValue.forEach(cn => addButton(interfaces[0], cn));
        }
    }

    static pushFilterCardControl(father, { cn, filterCardSetting, value, funcType }) {
        if (funcType === "button") value = "filterButton";
        const controlContainer = element("div")
            .block()
            .setStyle("position", "relative")
            .exit()
        const controlText = element("div").block().innerHTML(cn).setStyle("position", "relative").exit();
        const controlButton = element("button").exit();
        const controlButtonClose = element("button").exit();
        const controlUl = element("ul").addClass("x19D6_hidden").exit();
        const ULTitile = element("div").block().innerHTML("设置选牌条件").fontSize("0.9em").setStyle("position", "relative").father(controlUl).exit();
        ED_UlList.add(controlButton, controlUl);
        element().setTarget(controlButton)
            .block()
            .innerHTML("编辑")
            .setStyle("position", "relative")
            .setStyle("display", "inline-block")
            .addClass("xy-ED-skill-button")
            .listen(x19D6_DEFAULT_EVENT, () => {
                ED_UlList.showOnly(controlButton);
            })
        element().setTarget(controlButtonClose)
            .block()
            .innerHTML("关闭")
            .setStyle("position", "relative")
            .setStyle("display", "inline-block")
            .addClass("xy-ED-skill-button")
            .listen(x19D6_DEFAULT_EVENT, () => {
                ED_UlList.hide(controlButton);
            })
        for (const setting of filterCardSetting) {
            const node = choiceMode.pushControlOnData(controlUl, setting);
            const title = node.querySelector("div");
            const newTitile = element("div").block().innerHTML(setting.cn).setStyle("position", "relative").exit();
            const select = element("select").father(newTitile).exit();
            const options = [
                element("option").setKey("value", "===").innerHTML("是").exit(),
                element("option").setKey("value", "!==").innerHTML("不是").exit()
            ];
            if (setting.value === "number") {
                node.querySelector("input[type=search].x19D6_hidden").remove();
                node.querySelector("datalist").remove();
                [[">", "大于"], [">=", "大于等于"], ["<", "小于"], ["<=", "小于等于"]].forEach(entry => {
                    options.push(element("option").setKey("value", entry.at(0)).innerHTML(entry.at(1)).exit())
                })
            }
            select.append(...options);
            node.insertBefore(newTitile, title);
            title.remove();
        }
        controlContainer.getData = () => {
            const { record, isEmpty, AllIs } = controlContainer.getOutputRecord();
            if (isEmpty) return [value, void 0];
            if (AllIs && !("tag" in record) && !("gaintag" in record)) {
                const result = ['{']
                const entries = Object.entries(record);
                for (const [index, [attribute, { data }]] of entries.entries()) {
                    if (Array.isArray(data)) {
                        result.push(`${attribute}:${arrayToString(data)}${index === entries.length - 1 ? "" : ","}`);
                        continue;
                    }
                    result.push(`${attribute}:${data}${index === entries.length - 1 ? "" : ","}`)
                }
                result.push('}')
                return [value, result.join("")];
            }
            return [value, controlContainer.getOutputFunc(record)];
        }
        controlContainer.getOutputRecord = () => {
            const record = {};
            let AllIs = true, isEmpty = true;
            const nodes = [...controlUl.childNodes].slice(1);
            for (const container of nodes) {
                let [attribute, data] = container.getData();
                const select = container.querySelector("select");
                if (data && data.length) {
                    isEmpty = false
                    const operateValue = select.options[select.selectedIndex].value;
                    if (operateValue !== "===") AllIs = false;
                    if (attribute === "cardName") attribute = "name";
                    record[attribute] = {
                        data,
                        operate: operateValue
                    }
                }
            }
            return { record, AllIs, isEmpty };
        }
        controlContainer.getOutputFunc = (record) => {
            if (!record) record = controlContainer.getOutputRecord().record;
            const outputFunc = ['card=>{'];
            for (const [attribute, { operate, data }] of Object.entries(record)) {
                if (Array.isArray(data)) {
                    if (attribute === "gaintag") outputFunc.push(`if(${arrayToString(data)}.some(gaintag=>!card.hasGaintag(gaintag))) return false;`);
                    else if (attribute === "tag") outputFunc.push(`if(${arrayToString(data)}.some(tag=>!get.tag(card,tag))) return false;`);
                    else outputFunc.push(`if(${arrayToString(data)}.some(${attribute}=>get.${attribute}(card)${getOppositingOperator(operate)}${attribute})) return false;`)
                } else {
                    if (attribute === "gaintag") outputFunc.push(`if(!card.hasGaintag(${data})) return false;`);
                    else if (attribute === "tag") outputFunc.push(`if(!get.tag(card,${data})) return false;`);
                    else outputFunc.push(`if(get.${attribute}(card)${getOppositingOperator(operate)}${data}) return false;`)
                }
            }
            outputFunc.push("return true")
            outputFunc.push("}")
            let outputFuncJoinedString = outputFunc.join("\n");
            //pass
            if (funcType === "button") {
                outputFuncJoinedString = outputFuncJoinedString.replace(/card/g, "button");
            }
            return outputFuncJoinedString;
        }
        controlContainer.append(controlText, controlButton, controlButtonClose, controlUl)
        father.appendChild(controlContainer);
        return controlContainer;
    }
}