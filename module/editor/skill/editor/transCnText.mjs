import {
    lib,
    game,
    ui,
    get,
    ai,
    _status
} from "../../../../../../noname.js";
import { chineseToArabic } from "../tool/math.js";
import { NonameCN } from "./nonameCN.js";
export function dispose(str, number, directory = lib.x19D6_translate) {
    let list1 = TransCnText.splitLine(str);
    if (number === 1) return list1;
    let list2 = TransCnText.splitWord(list1)
    if (number === 2) return list2;
    let list3 = TransCnText.translateLine(list2, directory);
    if (number === 3) return list3;
    return TransCnText.linkWords(list3);
}
export function disposeTri(str, number, directory = NonameCN.TriList) {
    let list1 = TransCnText.splitLine(str);
    if (number === 1) return list1;
    let list2 = TransCnText.splitWordTri(list1)
    if (number === 2) return list2;
    let list3 = TransCnText.translateLineTri(list2);
    return list3;
}
const adjPlayer = [
    "[魏蜀吴群晋神西键]势力",
    "群雄",
    "与你势力相同",
    "不在你攻击范围内的?",
    "在?你攻击范围内的?",
    "攻击范围内不包含你",
    "攻击范围包含你的?",
    "其他",
    "[男女]性",
    "[已未]受伤"
]
const adjCard = [
    "火属性",
    "雷属性",
    "冰属性",
    "神属性",
    "梅花",
    "方片",
    "黑桃",
    "红桃",
    "无花色",
    "黑色",
    "红色",
    "无颜色",
    "基本",
    "装备(?!区)",
    "普通锦囊",
    "非延时锦囊",
    "延时锦囊"
]
const matchNotObjColon = /(?<!\{[ \w"']+):(?![ \w"']+\})/;
const matchFromTo = /^([bcdefghlmnoprstuvwxyz]|\d+|[一两二三四五六七八九十]+)到([bcdefghlmnoprstuvwxyz]|\d+|[一两二三四五六七八九十]+)[张名点枚个]$/
const matchTriSkillKeyWords = /发动(?:技能)?(.+?)(前|时|开始|结束|后|结算后)/
const matchDamageCount = /每(受到或造成|造成或受到|受到|造成)(\d+|[一两二三四五六七八九十]+)次(?=伤害)/
const matchTriKeywords = new RegExp(`${adjCard.join("|")}|锦囊|带有?伤害标签|点数为(?:11|12|13|[AJQK1-9])|非转化|一张|一点|1张|1点|(?<=指定|成为)唯一(?=目标)|于回合[内外]|于出牌阶段内?|于出牌阶段外|不?因为?[此该本]技能而?`)
const matchCardAdj = new RegExp(`${adjCard.join("|")}`, "g")
const matchCardAdjOr = new RegExp(`(${adjCard.join("|")}|锦囊)牌?或(?=(?:${adjCard.join("|")}|锦囊)+牌)`, "g")
const matchTriDamageTowords = new RegExp(`对((?:${adjPlayer.join("|")}|一名)+角色|你)(?=造成伤害)`, "g");
const matchTriDamageFromwords = new RegExp(`(?<=受到)由?((?:${adjPlayer.join("|")}|一名)+角色|你)造成(?=伤害)`, "g");
const matchTriGainFromwords = new RegExp(`(?<=获得)((?:${adjPlayer.join("|")}|一名)+角色|你)(?=牌)`, "g");
const matchTriTypeKeywords = new RegExp(`(${adjPlayer.join("|")})+(?=角色)`);
//
const splitAdjPlayer = new RegExp(`(?<=${adjPlayer.join("|")}|一名)`)
//
const simiAddCnWords = ['增加', '增添', '添加'];
const simiAddCnWordsRegExp = new RegExp(simiAddCnWords.join("|"))
//
const triMatchesPlayer = new Map([
    [matchTriDamageTowords, "triPlayer"],
    [matchTriDamageFromwords, "triSource"],
    [matchTriGainFromwords, "triGiver"]
]);
//
const vCardObject = NonameCN.getVirtualCard();
const player = NonameCN.getVirtualPlayer();
const vPlayers = NonameCN.getVirtualPlayers();
const vGame = NonameCN.getVirtualGame();
const eventModel = NonameCN.getVirtualEvent();
const vStorage = NonameCN.getVirtualStorage();

const x19D6_PUNC = ["!", " || ", " && ", " + ", " - ", " * ", " / ", " % ",
    " += ", " -= ",
    "++", "--",
    " > ", " < ", " >= ", " <= ", " == ", " === ",
    "(", ")", "."]
const x19D6_NEED_FOLLOW_PUNC = ['++', "--"]
const x19D6_NEED_FELLOW_PUNC = ['!', '~']
const x19D6_NEED_LINK_PUNC = [' || ', ' && ', ' ?? ', ' ? ', ' + ', ' - ', ' * ', ' ** ', ' / ', ' % ', ' += ', ' -= ', ' > ', ' < ', ' >= ', ' <= ', ' == ', ' === ', '(', '.'];
export class TransCnText {
    /**
    * @param {string} text 
    * @returns {string[]|[]}
    */
    static splitLine(text) {
        if (typeof text != "string" || !text.length) return [];
        const lines = text.split('\n');
        const result = [];
        for (const [_, line] of lines.entries()) {
            if (line.startsWith("/*") && line.endsWith("*/")) continue;
            if (/^\s*$/.test(line)) continue;
            result.push(line.replace(/\t/g, ""));
        }
        return result;
    }
    /**
    * @param {string[]} lines 
    * @returns {string[][]} 
    */
    static splitWord(lines) {
        if (!Array.isArray(lines)) return [[]];
        const result = new Array(lines.length);
        for (const [num, line] of lines.entries()) {
            //全英文不分词
            if (/^[^\u4e00-\u9fa5]+$/.test(line)) {
                result[num] = [line];
                continue;
            }
            const newline = line.replace(/([,\{\}\[\]\(\)\:\.]|\.{3})/g, " $1 ");
            const words = newline.split(/[ ]/);
            //分词后若中文全带引号,则按不分词的形式进行
            if (words.filter(word => /[\u4e00-\u9fa5]/.test(word)).every(word => /["'`]/.test(word))) {
                result[num] = [line];
                continue;
            }
            result[num] = words
        }
        return result;
    }
    static splitWordTri(lines) {
        if (!Array.isArray(lines)) return [[]];
        const result = new Array(lines.length);
        for (const [num, line] of lines.entries()) {
            const words = line.split(/[ \t"'`]/).filter(word => word.length);
            result[num] = words
        }
        return result;
    }
    /**
     * @param {string} word 
     * @param {object} directory 
     * @returns {string}
     */
    static translate(word, directory = {}) {
        if (typeof word != "string") return "";
        if (matchFromTo.test(word)) {
            return `[${word.slice(0, -1).split("到").map(item => chineseToArabic(item))}]`
        }
        if (word in directory) return directory[word];
        if (/(开始)[前时]/.test(word)) {
            return TransCnText.translate(word.replace(/(开始)[前时]/, "$1"), directory);
        }
        if (/(结束)[时后]/.test(word)) {
            return TransCnText.translate(word.replace(/(结束)[前时]/, "$1"), directory);
        }
        if (/(结算完成|完成结算)[时后]/.test(word)) {
            return TransCnText.translate(word.replace(/(结算完成|完成结算)[前时]/, "$1"), directory);
        }
        if (word.includes("的")) return TransCnText.translate(word.replace(/的/g, ""), directory);
        if (simiAddCnWordsRegExp.test(word)) {
            for (const simiWord of simiAddCnWords) {
                let wordx = word.replace(simiAddCnWordsRegExp, simiWord)
                if (wordx in directory) return directory[wordx];
            }
        }
        return word;
    }
    static translateLine(lines, directory) {
        if (!Array.isArray(lines)) return [[]];
        const result = new Array(lines.length).fill().map(() => []);
        for (const [num, line] of lines.entries()) {
            //判断该行词数是否为1，且第一行全为非中文
            if (line.length === 1 && /^[^\u4e00-\u9fa5]+$/.test(line[0])) {
                result[num] = line;
                continue;
            }
            const [args, prefix] = [[], []]
            for (const word of line) {
                const translated = TransCnText.translate(word, directory);
                let processing = translated;
                processing = processing.replace(/[:;]denyPrefix/, () => {
                    prefix.push("!")
                    return ""
                })
                processing = processing.replace(/(.*?)[:;]intoFunctionWait(.*?)/, (match, p1, p2) => {
                    const concatStr = `${p1}${p2}`
                    const list = concatStr.includes(";") ? concatStr.split(";") : concatStr.split(matchNotObjColon)
                    const first = list.shift();
                    args.push(...list);
                    return first;
                })
                if (!/[:;]intoFunction/.test(processing)) {
                    result[num].push(processing)
                    continue;
                }
                const list = processing.includes(';') ? processing.split(";") : processing.split(matchNotObjColon);
                list.remove("intoFunction");
                result[num].push(...list);
            }
            result[num].unshift(...prefix);
            result[num].push(...args);
        }
        return result;
    }
    static translateTri(word) {
        if (typeof word != "string") return "";
        const directory = NonameCN.TriList;
        if (word in directory) return directory[word];

        if (/(开始)[前时]/.test(word)) {
            return TransCnText.translateTri(word.replace(/(开始)[前时]/, "$1"));
        }
        if (/(结束)[时后]/.test(word)) {
            return TransCnText.translateTri(word.replace(/(结束)[时后]/, "$1"));
        }
        if (/(结算完成|完成结算|结算结束)[时后]/.test(word)) {
            return TransCnText.translateTri(word.replace(/(结算完成|完成结算|结算结束)[时后]/, "结算后"));
        }
        if (word.includes("的")) return TransCnText.translateTri(word.replace(/的/g, ""));
        if (matchTriTypeKeywords.test(word)) {
            const decoration = [];
            let wordx = word;
            wordx = wordx.replace(/其他/, match => {
                decoration.push(`filterPlayer=other`)
                return ''
            })
            wordx = wordx.replace(/在?你攻击范围内的?/, match => {
                decoration.push(`filterPlayer=inRange`)
                return ''
            })
            wordx = wordx.replace(/攻击范围包含你的?/, match => {
                decoration.push(`filterPlayer=inRangeOf`)
                return ''
            })
            wordx = wordx.replace(/[与和]你势力([相不])同/, (_, p) => {
                decoration.push(p === "不" ? "filterPlayer=differentGroup" : "filterPlayer=sameGroup")
                return ''
            })
            wordx = wordx.replace(/[魏蜀吴群晋神西键]势力|群雄/, match => {
                decoration.push(`filterPlayerGroup=${NonameCN.getEn(match)}`)
                return ''
            })
            wordx = wordx.replace(/([已未])受伤/, (_, p) => {
                decoration.push(`triPlayer=${p === "已" ? "isDamaged" : "isHealthy"}`);
                return ''
            })
            wordx = wordx.replace(/[男女]性/, match => {
                decoration.push(`filterPlayerSex=${NonameCN.getEn(match)}`)
                return ''
            })
            if (wordx in directory || (wordx = "一名" + wordx) in directory) {
                return `${decoration.join(":")}:${directory[wordx]}`;
            }
        }
        //
        const decoration = [];
        let wordx = word;
        if (matchTriKeywords.test(wordx)) {
            wordx = wordx.replace(matchCardAdjOr, (match, p) => {
                if (p === "锦囊") decoration.push('type2=trick')
                else decoration.push(NonameCN.getEn(p));
                return ''
            });
            wordx = wordx.replace(/非装备/g, _ => {
                decoration.push('type2=trick');
                decoration.push('type2=basic');
                return '';
            })
            wordx = wordx.replace(/带有?伤害标签/g, _ => {
                decoration.push('tag=damage');
                return '';
            })
            wordx = wordx.replace(matchCardAdj, (match) => {
                decoration.push(NonameCN.getEn(match));
                return ''
            });
            wordx = wordx.replace(/锦囊/g, _ => {
                decoration.push('type2=trick');
                return '';
            })
            wordx = wordx.replace(/非转化/g, _ => {
                decoration.push('isCard');
                return '';
            })
            wordx = wordx.replace(/一张|一点|1张|1点/g, _ => {
                decoration.push('getIndex=1');
                return '';
            })
            wordx = wordx.replace(/(?<=指定|成为)唯一(?=目标)/, _ => {
                decoration.push('onlyOneTarget');
                return ''
            })
            wordx = wordx.replace(/于回合([内外])/, (_, p) => {
                decoration.push(p === "内" ? "inPhase" : "outPhase");
                return ''
            })
            wordx = wordx.replace(/于出牌阶段([内外]?)/, (_, p) => {
                decoration.push(p === "外" ? "outPhaseUse" : "inPhaseUse");
                return '';
            })
            wordx = wordx.replace(/(不?)因为?[此该本]技能/, (_, p) => {
                decoration.push(p === "不" ? "noForThisSkill" : "forThisSkill");
                return '';
            })
        }
        for (const [regexp, label] of triMatchesPlayer.entries()) {
            wordx = wordx.replace(regexp, (_, p) => {
                if (p === "你") {
                    decoration.push(label + "=player");
                    return '';
                }
                else {
                    for (const adj of p.split(splitAdjPlayer)) {
                        if (adj === "其他") decoration.push(label + "=other")
                        else if (adj === "已受伤") decoration.push(label + "=isDamaged")
                        else if (adj === "未受伤") decoration.push(label + "=isHealthy")
                        else if (/在?你攻击范围内的?/.test(adj)) decoration.push(label + "=inRange")
                        else if (/攻击范围包含你的?/.test(adj)) decoration.push(label + "=inRangeOf")
                        else if (/不在你攻击范围内的?/.test(adj)) decoration.push(label + "=noInRange")
                        else if (/攻击范围内不包含你的?/.test(adj)) decoration.push(label + "=noInRangeOf")
                        else {
                            const en = NonameCN.getEn(adj);
                            if (["male", "female"].includes(en)) decoration.push(label + `Sex=${en}`);
                            else if (["wei", "shu", "wu", "qun", "jin", "shen", "key", "western"].includes(en)) decoration.push(label + `Sex=${en}`);
                        }
                    }
                }
                return '';
            });
        }
        wordx = wordx.replace(matchDamageCount, (_, p1, p2) => {
            let historyType = '';
            if (p1 === "受到") historyType = "historyAllDamage";
            else if (p1 === "造成") historyType = "historyAllSourceDamage";
            else historyType = "historyAllDamagePlus";
            decoration.push(`${historyType}=${chineseToArabic(p2)}`);
            return p1;
        });
        if (wordx in directory) {
            if (!decoration.length) return directory[wordx];
            return `${decoration.join(":")}:${directory[wordx]}`;
        }
        //
        if (matchTriSkillKeyWords.test(wordx)) {
            const [_, p1, p2] = wordx.match(matchTriSkillKeyWords);
            let result = p1;
            if (p2 === "前") result += "Before"
            else if (p2 === "时") result += "Begin"
            else if (p2 === "开始") result += "Begin"
            else if (p2 === "结束") result += "End"
            else result += "After"
            if (!decoration.length) return result;
            return `${decoration.join(":")}:${result}`;
        }
        return word;
    }
    static translateLineTri(lines) {
        if (!Array.isArray(lines)) return [[]];
        const result = lines.map(line => line.map(word => TransCnText.translateTri(word)))
        return result;
    }
    static linkWords(lines) {
        const result = [];
        lines.forEach(i => {
            let str = '', str2 = '',
                notice = [], bool = true, index,
                players
            const watchAndWork = (body, a, b) => {
                if (body === 'storage') {
                    str += ('.' + a)
                }
                else if (body[a] || body === vStorage) {
                    if (/[^a-zA-Z0-9_$]/.test(a)) {
                        str += a;
                        notice.remove('storageLower')
                    }
                    else if (typeof body[a] === 'function') {
                        str += ('.' + a)
                        bool = false;
                        str2 = '()';
                        index = b + 1
                    }
                    else str += ('.' + a)
                }
                else if (a.includes(';')) {
                    str += NonameCN.disposeWithQuo(body, a)
                }
                else if (a.includes(':') && a.slice(-1)[0] != ',') {
                    str += NonameCN.disposeWithQuo(body, a, matchNotObjColon)
                }
                else str += a
            }
            let lastTurn;
            //组装函数前语句
            for (let b = 0; b < i.length; b++) {
                //这个bool来控制循环的进行与否
                if (!bool) break;
                const a = i[b];
                const WAW = (body) => (watchAndWork(body, a, b));
                const type = game.x19D6_judgeType(a)
                type && notice.push(type);
                if (lastTurn == 'game') WAW(vGame)
                else if (notice.includes('storageLower')) WAW(vStorage)
                else if (notice.includes('storage')) WAW('storage')
                else if (lastTurn === 'get') WAW(get)
                else if (lastTurn === 'players') { WAW(vPlayers) }
                else if (lastTurn === 'player') { WAW(player) }
                else if (lastTurn === 'event') WAW(eventModel)
                else if (lastTurn === 'Math') WAW(Math)
                else if (lastTurn === 'card') WAW(vCardObject)
                else if (lastTurn === 'variable') WAW({})
                else if (lastTurn === 'array') WAW(new Array(1).fill())
                else WAW(new Array(1).fill());
                lastTurn = type;
                if (type === 'players') players = a;
                if (['player', 'card'].some(viewer => notice.includes(viewer)) && a === "storage") notice.push('storage') && notice.remove('player');
                else if (notice.includes('storage')) notice.push('storageLower') && notice.remove('storage');
            }
            if (notice.includes("Math") && index) {
                const replacer = [];
                const cache = [];
                const toReplaced = i.slice(index);
                for (const word of toReplaced) {
                    const watcher = game.x19D6_judgeType(cache.join(''));
                    if (['player', 'game'].includes(watcher)) {
                        if (watcher === 'player' && player[word]
                            || watcher === 'game' && game[word]) {
                            replacer.push(replacer.pop() + "." + word)
                            continue;
                        }
                        else if (word.includes(";")) {
                            replacer.push(replacer.pop() + NonameCN.disposeWithQuo(player, word))
                            continue;
                        }
                        else if (word.includes(":") && word.slice(-1)[0] !== ",") {
                            replacer.push(replacer.pop() + NonameCN.disposeWithQuo(player, word, matchNotObjColon))
                            continue;
                        }
                    }
                    replacer.push(word)
                    cache.push(word)
                    if (x19D6_PUNC.includes(word)) {
                        cache.length = 0;
                        continue;
                    }
                }
                i.splice(index, Infinity, ...replacer);
            }
            //填写参数
            if (index) {
                const stack = [];
                const puncs = x19D6_NEED_LINK_PUNC;
                const fePuncs = x19D6_NEED_FELLOW_PUNC;
                const foPuncs = x19D6_NEED_FOLLOW_PUNC;
                let lastIsPunc = false;
                const toOrder = i.splice(index).map(word => {
                    if (word.includes(";")) return NonameCN.disposeWithQuo("ignore", word);
                    return word;
                }).filter(word => word);
                for (const word of toOrder) {
                    let param = word;
                    if ((param.startsWith(".") || lastIsPunc || puncs.includes(param) || foPuncs.includes(param)) && stack.length) {
                        let last = stack.pop();
                        param = `${last}${param}`;
                        lastIsPunc = false;
                    }
                    if (puncs.some(punc => param.endsWith(punc) || fePuncs.includes(param))) {
                        lastIsPunc = true;
                    }
                    stack.push(param);
                }
                const parameters = stack.map(word => word.replace(/(?<!\.)\.\.(?!\.)/g, "."))
                str2 = `(${parameters})`;
            }
            let sentence = str + str2;
            if (players && notice.includes('players')) {
                sentence = NonameCN.disposePlayers(sentence, players);
            }
            if (notice.includes('player') && sentence.includes('.when(')) {
                sentence = NonameCN.disposeWhen(sentence, players);
            }
            if (notice.includes('get') && sentence.includes('//!?')) {
                sentence = NonameCN.disposeNeedTrans(sentence);
            }
            result.push(sentence);
        });
        return result;
    }
}
