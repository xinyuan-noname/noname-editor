"use script"
import {
    lib,
    game,
    ui,
    get,
    _status
} from "../../../../../../noname.js";
import { element, textareaTool } from "../tool/ui.js";
import { getLineRangeOfInput, pointInWhichLine } from "../tool/string.js";
import { NonameCN } from "./nonameCN.js";
const x19D6_DEFAULT_EVENT = lib.config.touchscreen ? "touchend" : "click"
function tabChange(type) {
    let list = [];
    let tabMode = false;
    return function (e) {
        if (e.key != 'Tab') {
            if (!tabMode) return;
            if (e.key === 'Backspace') return;
            this.arrange();
            this.submit();
            tabMode = false;
            return;
        }
        if (!tabMode) tabMode = true;
        e.preventDefault();
        const range = getLineRangeOfInput(this);
        const start = range[0];
        const end = range[1];
        const content = this.value;
        const subStr = content.slice(start, end).replace('\t', '');
        if (this.selectionEnd === this.selectionStart) {
            list = [...Object.keys(NonameCN.giveSentence[type]), ...Object.keys(NonameCN.giveSentence['unshown_' + type])].filter(item => item.startsWith(subStr));
        }
        if (!list.length) {
            this.selectionStart = start;
            this.selectionEnd = end;
            return;
        }
        const replacer = list.shift();
        this.value = content.slice(0, start) + replacer + content.slice(end);
        this.selectionStart = start;
        this.selectionEnd = start + replacer.length;
    }
}
export class EditorInteraction {
    /**
     * @param {HTMLInputElement} input 
     * @param {string} str 
     */
    static insertPhrase(input, str) {
        const { selectionEnd: preEnd, selectionStart: preStart, value: preValue } = input;
        if (preEnd != preStart) return;
        input.value = `${preValue.slice(0, preEnd)}${str}${preValue.slice(preEnd)}`;
        input.setSelectionRange(preEnd + str.length, preEnd + str.length);
        return preEnd + str.length;
    }
    /**
     * @param {HTMLElement} trigger 
     * @param {HTMLElement} insertTarget 
     * @param {string} insertContent 
     * @param {Object<string,any>} config 
     */
    static bindInsert(trigger, insertTarget, insertContent, config = {}) {
        let { eventType = x19D6_DEFAULT_EVENT, changLine = true, arrange = true, tab } = config;
        trigger.addEventListener(eventType, async () => {
            if (typeof insertContent === "function") {
                insertContent = (await insertContent(trigger, insertTarget));
            }
            if (changLine && insertTarget.value[insertTarget.selectionStart - 1] != "\n" && insertTarget.selectionStart !== 0) {
                EditorInteraction.insertPhrase(insertTarget, "\n");
            }
            EditorInteraction.insertPhrase(insertTarget, insertContent);
            if (changLine) EditorInteraction.insertPhrase(insertTarget, "\n");
            if (arrange) insertTarget.arrange();
            if (tab) insertTarget.adjustTab();
            insertTarget.submit()
        })
    }
    static get editorBack() {
        return ui.window.querySelector(".xy-ED-skill-interact-back.xy-ED-skill-editor");
    }
    //通用快捷键设置
    static addAllOrder(ele) {
        const back = this.editorBack
        textareaTool().setTarget(ele)
            .clearOrder()
            .dittoOrder()
            .dittoUnderOrder()
            .listen('keydown', tabChange(ele.toPart))
            .listen('keyup', function () {
                if (!this.value.includes('引入')) return;
                for (const [regexp, result] of NonameCN.editorInbuiltSkillMap.entries()) {
                    if (!regexp.test(this.value)) continue;
                    this.value = this.value.replace(regexp, '');
                    const { kind, position, filter, filterCard, filterTarget, contentAsync, content, trigger } = result;
                    back.skill.contentAsync = !(!contentAsync);
                    if ('phaseUse' in result) {
                        back.skill.kind = 'enable:"phaseUse"';
                    }
                    if ('position' in result) {
                        back.skill.position = position;
                    }
                    if ('filter' in result) {
                        back.ele.filter.value = filter;
                        back.ele.filter.arrange()
                        back.ele.filter.submit();
                    }
                    if ('filterCard' in result) {
                        back.ele.filterCard.value = filterCard;
                        back.skill.type.push("filterCard");
                        back.ele.filterCard.arrange();
                        back.ele.filterCard.submit();
                    }
                    if ('filterTarget' in result) {
                        back.ele.filterTarget.value = filterTarget;
                        back.skill.type.push("filterTarget");
                        back.ele.filterTarget.arrange();
                        back.ele.filterTarget.submit();
                    }
                    if ('content' in result) {
                        back.ele.content.value = content;
                        back.ele.content.arrange()
                        back.ele.content.submit();
                    }
                    if ('trigger' in result) {
                        back.skill.kind = 'trigger';
                        back.ele.trigger.value = trigger;
                        back.ele.trigger.arrange();
                        back.ele.trigger.submit();
                    }
                    break;
                }
            })
            .listen('keyup', (e) => {
                if (!e.shiftKey || !e.altKey || e.key !== 'ArrowUp') return;
                /**
                 * @type {HTMLTextAreaElement}
                 */
                const node = e.target;
                const { selectionStart: preStart, selectionEnd: preEnd } = node
                const lineNumStart = pointInWhichLine(node.value, preStart)
                const lineNumEnd = pointInWhichLine(node.value, preEnd)
                const lines = node.value.split("\n");
                let targetPhrase;
                if (lineNumStart === lineNumEnd) targetPhrase = lines.at(lineNumEnd);
                else {
                    targetPhrase = lines.slice(lineNumStart, lineNumEnd + 1).join("\n");
                }
                lines.splice(lineNumStart, 0, targetPhrase)
                node.value = lines.join("\n");
                node.setSelectionRange(preStart, preEnd);
                node.blur();
                node.focus();
                node.submit();
            })
            .listen('keyup', (e) => {
                if (!e.shiftKey || !e.altKey || e.key !== 'ArrowDown') return;
                /**
                 * @type {HTMLTextAreaElement}
                 */
                const node = e.target;
                const { selectionStart: preStart, selectionEnd: preEnd } = node
                const lineNumStart = pointInWhichLine(node.value, preStart)
                const lineNumEnd = pointInWhichLine(node.value, preEnd)
                const lines = node.value.split("\n");
                let targetPhrase;
                if (lineNumStart === lineNumEnd) targetPhrase = lines.at(lineNumEnd);
                else {
                    targetPhrase = lines.slice(lineNumStart, lineNumEnd + 1).join("\n");
                }
                lines.splice(lineNumEnd + 1, 0, targetPhrase)
                node.value = lines.join("\n");
                node.setSelectionRange(preStart + targetPhrase.length + 1, preEnd + targetPhrase.length + 1);
                node.blur();
                node.focus();
                node.submit();
            })
            .listen('keyup', e => {
                if (!e.shiftKey || !e.altKey || e.key !== 'D') return;
                const node = e.target;
                const { selectionStart: preStart, selectionEnd: preEnd } = node
                const lineNumStart = pointInWhichLine(node.value, preStart)
                const lineNumEnd = pointInWhichLine(node.value, preEnd)
                const lines = node.value.split("\n");
                let targetPhrase;
                if (lineNumStart === lineNumEnd) targetPhrase = lines.at(lineNumEnd);
                else {
                    targetPhrase = lines.slice(lineNumStart, lineNumEnd + 1).join("\n");
                }
                lines.splice(lineNumStart, lineNumEnd - lineNumStart + 1);
                node.value = lines.join("\n");
                node.setSelectionRange(preEnd - targetPhrase.length, preEnd - targetPhrase.length);
                node.blur();
                node.focus();
            })
            .listen('keyup', e => {
                if (!e.shiftKey || !e.altKey || e.key !== 'C') return;
                ele.value = '';
                ele.submit();
            })
            .listen('keyup', e => {
                if (!e.shiftKey || !e.altKey || e.key !== 'F') return;
                ele.arrange();
                ele.submit();
            })
            .listen('keyup', e => {
                if (!e.shiftKey || !e.altKey || e.key !== 'S') return;
                EditorInteraction.GivenSentenceDialog(ele);
            })
            .clearThenOrder("整理", ele.arrange)
            .replaceOrder(/(本|此|该)技能id/g, back.getID)
    }
    //普遍用快捷键设置
    static addCommonOrder(ele) {
        const back = this.editorBack;
        textareaTool().setTarget(ele)
            .listen("keyup", function (e) {
                if (e.key !== "Enter") return;
                const position = this.selectionStart;
                const initialValue = this.value;
                if (!initialValue.includes("\n")) return;
                const tabs = this.value.slice(0, position).split("\n").at(-2).match(/^\t/g);
                if (tabs) {
                    this.value = `${initialValue.slice(0, position)}${"\t".repeat(tabs.length)}${initialValue.slice(position)}`;
                    this.selectionStart = this.selectionEnd = position + tabs.length;
                }
            })
            .replaceOrder(/访\*(\d+)/g, (_, ...p) => {
                return '访  '.repeat(parseInt(p[0]))
            })
            .replaceThenOrder('新如果', "如果\n\n那么\n分支开始\n\n分支结束", ele.adjustTab)
            .replaceThenOrder('新否则', "否则\n分支开始\n\n分支结束", ele.adjustTab)
            .replaceThenOrder(/^新函数/mg, "函数 参数表头 参数表尾 函数开始\n\n函数结束", ele.adjustTab)
            .replaceOrder(/\bdo-while\b/g, "do{\n\n}\nwhile(  )")
            .replaceOrder(/\bwhile-/g, "while(  ){\n\n}")
            .replaceOrder(/\bfor-in\b/g, "for( 常量 k in  ){\n\n}")
            .replaceOrder(/\bfor-of\b/g, "for( 常量 k of  ){\n\n}")
            .replaceOrder(/\bfor-;;/g, "for( 块变 i 令为 0 ; i< ; i++ ){\n\n}")
            .replaceOrder(/\bswitch-case\*(\d+)/g, (_, ...p) => {
                return `switch (  ){\n${"case ():{\n\n}\nbreak;\n".repeat(parseInt(p[0]))}default:{\n\n}\nbreak;\n}`
            }, ele.adjustTab)
            .replaceThenOrder(
                /^新?花色分支$/mg,
                '变量 花色 令为 获取 花色 卡牌\n分岔 ( 花色 ) \n分支开始\n\t情况 红桃 :\n\t分支开始\n\t\t\n\t分支结束\n\t打断\n\t情况 方片 :\n\t分支开始\n\t\t\n\t分支结束\n\t打断\n\t情况 黑桃 :\n\t分支开始\n\t\t\n\t分支结束\n\t打断\n\t情况 梅花 :\n\t分支开始\n\t\t\n\t分支结束\n\t打断\n分支结束',
                ele.adjustTab
            )
            .replaceOrder("新虚拟牌", '变量 虚拟牌 令为\n{\n牌名 : 杀 ,\n花色 : 梅花 ,\n点数 : A点 ,\n属性 : 火属性\n}')
    }
    static addContentOrder_setting(ele) {
        const back = this.editorBack;
        textareaTool().setTarget(ele)
            .replaceThenOrder(/(?<![/][*])[ ]*back.skill.contentAsync[ ]*\=[ ]*true[ ]*(?![*][/])/g, "/*back.skill.contentAsync=true*/", () => { back.skill.contentAsync = true })
            .clearThenOrder(/([/][*])[ ]*back.skill.contentAsync[ ]*\=false[ ]*[ ]*([*][/])/g, () => { back.skill.contentAsync = false })
            .replaceThenOrder(/(?<![/][*])back.ContentInherit[ ]*\=[ ]*true[ ]*(?![*][/])/g, "/*back.ContentInherit=true*/", () => { back.ContentInherit = false })
            .clearThenOrder(/([/][*])[ ]*back.ContentInherit[ ]*\=[ ]*false[ ]*([*][/])/g, () => { back.ContentInherit = false })
    }
    static addContentOrder_area(ele) {
        const back = this.editorBack;
        textareaTool().setTarget(ele)
            .replaceOrder(/^<([$_a-zA-Z0-9]+)[>]?->$/mg, '<$1>\n\n</$1>')
            .replaceOrder(/^(模组|mod)[区域]?->$/mg, '<mod>\n\n</mod>')
            .replaceThenOrder(/^f-([$_a-zA-Z0-9]+)->$/mg, '$1( ){\n\n\n},', ele.adjustTab)
            .replaceThenOrder(/^f-+[>]/mg, 'function( ){\n\n\n}', ele.adjustTab)
            .replaceThenOrder(/^f-(卡牌)?可使?用性(模组)?->$/mg, 'cardEnabled(card){\n\n\n},', ele.adjustTab)
            .replaceThenOrder('新判定回调', '#判定回调区头\n函数 参数表头 参数表尾 函数开始\n新步骤\n\n函数结束\n#判定回调区尾\n', ele.adjustTab)
    }

    static GivenSentenceDialog(node) {
        game.x19D6_create.seeDelete(
            NonameCN.giveSentence[node.toPart],
            '使用',
            '隐藏',
            function () {
                const id = this.container.dataset.x19D6_id;
                EditorInteraction.insertPhrase(node, "\n");
                EditorInteraction.insertPhrase(node, id);
                EditorInteraction.insertPhrase(node, "\n");
                node.arrange();
                node.submit();
                node.focus();
            },
            function () {
            },
            function () {
            }
        )
    }
    static footerButtonList = [
        ["如果", "如果\n\n那么\n分支开始\n\n分支结束", { arrange: false, tab: true }],
        ["否则-如果", "否则 如果\n\n那么\n分支开始\n\n分支结束", { arrange: false, tab: true }],
        ["否则", "否则\n分支开始\n\n分支结束", { arrange: false, tab: true }]
    ]
    static addFootButton(father, input, config = {}) {
        let { banList = [] } = config;
        const container = element("div").flexRow().setStyle("position", "relative").father(father).exit();
        for (const item of EditorInteraction.footerButtonList) {
            if (banList.includes(item[0])) continue;
            const button = ui.create.x19D6_button2(container, item[0]);
            button.classList.add("xy-ED-skill-footerButton");
            EditorInteraction.bindInsert(button, input, item[1], item[2]);
        }
    }

    static whenChangeLineHas_content(that) {
        textareaTool().setTarget(that)
            .whenChangeLineHas(/(?<!变量).+?选择.*?(卡牌|角色)/, function (e) {
                //之后这里添加条件可以取消,自行设置
                if (false) return;
                this.value += [
                    "",
                    "新步骤",
                    "如果",
                    "有选择结果",
                    "那么",
                    "分支开始",
                    "所选角色 ",
                    "分支结束"
                ].join("\n");
                this.adjustTab();
                this.toLastLine();
            })
    }
}