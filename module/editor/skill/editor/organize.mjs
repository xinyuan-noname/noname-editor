import { findPrefix } from "../tool/string.js";
import { EditorDataAnalyze } from "./dataAnalyze.mjs";
import { NonameCN } from "./nonameCN.js";
const format = (text) => {
    let result = text
        .replace(/\n (\|\||&&) \n/g, " $1 ")
        .replace(/\n(?=[ ]*[><]=?[ ]*)/g, "")
        .replace(/(?<=[ ]*[><]=?[ ]*)\n/g, "")
        .replace(/\n(?=[ ]*={2,3}[ ]*)/g, "")
        .replace(/(?<=[ ]*={2,3}[ ]*)\n/g, "")
        .replace(/\n(?=[ ]*\!={1,2}[ ]*)/g, "")
        .replace(/(?<=[ ]*\!={1,2}[ ]*)\n/g, "")
        .replace(/^if\(\n(.*)\n\)\n{/mg, "if($1){")
        .replace(/^else[ ]+if\(\n(.*)\n\)\n{/mg, "else if($1){")
        .replace(/^if\(\n(.*)\n\)/mg, "if($1)")
        .replace(/^else[ ]+if\(\n(.*)\n\)/mg, "else if($1)")
        .replace(/\belse[ ]*\n{/g, "else{")
    return result;
}

const orderSteps = (str) => {
    let result = str, step = 0;
    result = result.replace(/(?<="step[ ]*\d*"|'step[ ]*\d*')(\s*"step[ ]*\d*"|\s*'step[ ]*\d*')+/g, "")
    result = result.replace(/('step[ ]*\d*'|"step[ ]*\d*")/g, () => {
        return `"step ${step++}"`;
    });
    return result;
}

const getStrFormConst = ({ costName, costNature, costColor, costSuit }) => {
    let result = ''
    if (costName) result += `const name = "${costName}";\n`;
    if (costNature) result += `const nature = "${costNature}";\n`;
    if (costColor) result += `const color = "${costColor}";\n`;
    if (costSuit) result += `const suit = "${costSuit}";\n`;
    return result;
}
const getStrFormFunc = (key, value, noplayer) => {
    if (Array.isArray(value)) {
        value = value.map(k => `"${k}"`)
        return `[${value}].includes(get.${key}(card,${key == "type" ? "false," : ""}player))`.replace(noplayer ? ",player" : "", "")
    }
    return `get.${key}(card,${key == "type" ? "false," : ""}player) === "${value}"`.replace(noplayer ? ",player" : "", "")
}

const getStrNormalFunc = (inputData) => {
    let result = '';
    if (!Array.isArray(inputData) && typeof inputData != 'string') return result;
    if (typeof inputData === 'string') inputData = inputData.split('\n');
    for (const [index, line] of inputData.entries()) {
        switch (true) {
            case (index === inputData.length - 1): {
                result += `${line}`
            }; break;
            default: {
                result += `${line}\n`
            }; break;
        }
    }
    result = format(result)
    return result;
}

const analyzeViewAsData = (back, i = 0) => {
    const { viewAs, viewAsCondition, id, viewAsFrequency } = back.skill;
    const condition = viewAsCondition[i]
    let asCard = viewAs[i]
    if (!condition || !asCard) return {};
    let asCardType;
    let asNature;
    let costName = condition.startsWith("cardName-") && condition.slice(9)
    let costNature, costColor, costSuit;
    let position = get.type(costName) == "type" ? "'hes'" : "'hs'"
    let needCard = true;
    let preEve;
    let selectCard;
    let conditionBool;
    if (asCard.startsWith('cardType-')) {
        asCardType = asCard.slice(9);
    }
    if (asCard.startsWith("nature-")) {
        let list = asCard.slice(7).split(":")
        asNature = list[0];
        asCard = list[1];
    }
    if (costName && costName.startsWith("nature-")) {
        let list = costName.slice(7).split(":")
        costNature = list[0];
        costName = list[1];
    }
    if (condition.startsWith("color-pos-")) {
        let list = condition.slice(10).split(":");
        position = list[0]
        costColor = list[1];
    }
    if (condition.startsWith("suit-pos-")) {
        let list = condition.slice(9).split(":");
        position = list[0]
        costSuit = list[1];
    }
    if (condition.startsWith("preEve-link-")) {
        conditionBool = condition.slice(12);
        preEve = "link"
        selectCard = '-1'
        needCard = false
    }
    return {
        asCard, asCardType, asNature,
        costName, costNature, costColor, costSuit, position, needCard,
        preEve, selectCard, conditionBool, condition,
        viewAsFrequency, id
    }
}
const triUnkonwn = (value, player, id) => {
    switch (value) {
        case "inPhase":
            return `${player} !== _status.currentPhase`;
        case "outPhase":
            return `${player} === _status.currentPhase`;
        case "inPhaseUse":
            return `!${player}.isPhaseUsing()`;
        case "outPhaseUse":
            return `${player}.isPhaseUsing()`;
        //
        case "onlyOneTarget":
            return `event.targets.length > 1`;
        // 
        case "addSkills":
            return `event.addSkill.length > 0`;
        case "removeSkills":
            return `event.removeSkill.length > 0`;
        //
        case "forThisSkill":
            return (`event.getParent("${id}", true) === null`);
        case "noForThisSkill":
            return (`event.getParent("${id}", true) !== null`);
        //
        case "yescard":
            return "!event.card";
        case "isCard":
            return "!event.card?.isCard";
    }
}
const triPlayerFilter = (value, player, attr) => {
    if (attr && attr.endsWith("Group")) {
        return value.length === 1 ? `${player}.group !== ${value}` : `![${value}].includes(${player}.group)`;
    }
    if (attr && attr.endsWith("Sex")) {
        return value.length === 1 ? `!${player}.hasSex(${value})` : `[${value}].every(sex => !${player}.hasSex(sex))`;
    }
    switch (value) {
        case 'player':
            return `${player} !== player`;
        case 'other':
            return `${player} === player`;
        case 'inRange':
            return `!player.inRange(${player})`;
        case 'inRangeOf':
            return `!player.inRangeOf(${player})`;
        case 'noInRange':
            return `player.inRange(${player})`;
        case 'noInRangeOf':
            return `player.inRangeOf(${player})`;
        case "isDamaged":
            return `!${player}.isDamaged()`;
        case "isHealthy":
            return `!${player}.isHealthy()`;
        case "sameGroup": {
            return `player.group === ${player}.group`;
        }
        case "differentGroup": {
            return `player.group === ${player}.group`;
        }
        case "sameSex":
            return `!player.sameSexAs(${player})`;
        case "differentSex":
            return `!player.differentSexFrom(${player})`;
    }
}
const triCardsFilter = (attr, values, player) => {
    const para = [];
    if (attr === "tag") {
        if (values.length === 1) return `!get.tag(card, ${values})`;
        else return `[${values}].some(tag => !get.tag(card, tag))`;
    } else if (attr === "type") {
        para.push("card", "null");
    } else {
        para.push("card");
    }
    if (player) para.push(player);
    if (values.length === 1) return `get.${attr}(${para.join(", ")}) !== ${values}`;
    return `![${values}].includes(get.${attr}(${para.join(", ")}))`
}
const triCardsFilter2 = (attr, values, player) => {
    const para = [];
    if (attr === "tag") {
        if (values.length === 1) return `get.tag(card, ${values})`;
        else return `[${values}].some(tag => get.tag(card, tag))`;
    } else if (attr === "type") {
        para.push("card", "null");
    } else {
        para.push("card");
    }
    if (player) para.push(player);
    if (values.length === 1) return `get.${attr}(${para.join(", ")}) === ${values}`;
    return `[${values}].includes(get.${attr}(${para.join(", ")}))`
}
const testSentenceIsOk = (str) => {
    try {
        new Function(str);
    } catch (err) {
        if (err) return false;
    }
    return true;
}

const testLoseRegExp = /^lose(?!MaxHp|Hp)/
const testGainRegExp = /^gain(?!MaxHp)/
export class EditorOrganize {
    static opening(back) {
        let result = '';
        const { mode, id } = back.skill
        if (mode === 'mt') {
            result = '"' + id + '":{\n'
        } else if (mode === 'mainCode') {
            result = 'lib.skill["' + id + '"]={\n'
        }
        return result;
    }

    static kind(back) {
        let result = '';
        const { kind, trigger, triLoseEvts, triGainEvts, triGameStart, triLoseReason } = back.skill;
        if (kind === 'trigger') {
            const triggerCopy = get.copy(trigger);
            result += 'trigger:{\n';
            if (triGameStart) {
                triggerCopy.global.push("phaseBefore")
            }
            else if (triGainEvts && triGainEvts.length === 1) {
                triggerCopy.global.push("loseAsyncAfter")
            }
            else if (triLoseEvts && triLoseEvts.length === 1) {
                if (triLoseReason === "noUseToDiscardPile") {
                    triggerCopy.global.push("equipAfter", "loseAsyncAfter", "cardsDiscardAfter")
                } if (triLoseReason === "discardToDiscardPile" || triLoseReason === "discardInDiscardPhase") {
                    triggerCopy.global.push("loseAsyncAfter")
                } else {
                    triggerCopy.global.push("equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter")
                }
            }
            for (const triType of ["player", "source", "target", "global"]) {
                if (!triggerCopy[triType].length) continue;
                if (triggerCopy[triType].length === 1) result += `${triType}:"${triggerCopy[triType]}",\n`;
                else result += `${triType}:[${triggerCopy[triType].map(tri => `"${tri}"`)}],\n`;
            }
            /*结束*/
            result += '},\n';
        }
        else if (kind) {
            result += kind + ',\n';
        }
        return result;
    }
    static skillTag(back) {
        const { marktext, markName, markContent,
            prompt, prompt2, content,
            type, kind, filterTarget, filterCard,
            uniqueList } = back.skill
        let result = ''
        if (marktext && marktext.length) {
            result += `marktext:"${marktext}",\n`
        };
        if (markName && markContent) {
            result += 'intro:{\n';
            result += `name:"${markName}",\n`
            result += `content:"${markContent}",\n`
            result += '},\n';
        }
        if (prompt) {
            result += `prompt:"${prompt}",\n`
        }
        if (prompt2) {
            result += `prompt2:"${prompt2}",\n`
        }
        //遍历技能类别
        type.forEach(tagItem => {
            if (tagItem === 'filterTarget'
                && (kind != 'enable:"phaseUse"' || filterTarget.length > 0)) return;
            else if (tagItem === 'filterCard'
                && (kind != 'enable:"phaseUse"' || filterCard.length > 0)) return;
            else if (tagItem === 'groupSkill') {
                const group = findPrefix(uniqueList, "group").map(k => k.slice(6))
                if (group.length > 0) {
                    result += `groupSkill:"${group[0]}",\n`;
                    return;
                }
            }
            else if (/\-\d+$/.test(tagItem)) {
                result += `${tagItem.replace("-", ":")},\n`
                return;
            }
            else if (["lose-false", "discard-false", "delay-false"].includes(tagItem)) {
                result += `${tagItem.replace('-false', '')}:false,\n`
                return;
            }
            result += `${tagItem}:true,\n`;
        })
        if (content) {
            if (content.some(line => line.includes("game.swapSeat"))) {
                result += `changeSeat:true,\n`;
                result += `seatRelated:true,\n`;
            }
        }
        if (type.includes("locked-false")) {
            //pass
            result = result.replace(/locked\-false\:true/g, "locked:false")
            result = result.replace(/locked\:true\,\n/g, "")
        }
        if (uniqueList.some(tag => tag.includes("animation-"))) {
            const animation = findPrefix(uniqueList, "animation").map(k => k.slice(10))
            result += `animationColor:"${animation}",\n`
        }
        return result;
    }

    static init(back) {
        let result = ''
        const bool1 = back.skill.type.includes("mainSkill");
        const bool2 = back.skill.type.includes("viceSkill");
        if (!bool1 && !bool2) return result;
        result += "init:function(player,skill){\n"
        if (bool1) {
            result += `const bool = player.checkMainSkill("${back.skill.id}");\n`
        }
        if (bool2) {
            result += `const bool = player.checkViceSkill("${back.skill.id}")\n&& !player.viceChanged;\n`
        }
        if (back.skill.uniqueList.includes("mainVice-remove1")) {
            result += `bool && player.removeMaxHp();\n`
        }
        result += '},\n'
        return result
    }


    static mod(back) {
        const { mod, custom } = back.skill;
        let result = '';
        if (!mod.length && !custom.mod) return result;
        result += "mod:{\n";
        const getFilter = function (line, ...label) {
            if ([' || ', ' && '].includes(line)) result += '\n'
            if (label.includes("playerIsTarget")) line = line.replace(/player/g, "target")
            result += line;
            if (['{', '}'].includes(line)) result += '\n';
        }
        if (mod.lengthOfCardUsable) {
            result += "cardUsable:function(card,player,num){\n"
            mod.cardUsable_Infinity.forEach(condition => {
                if (condition === "all") result += "return Infinity;\n";
                else if (condition.includes(':')) {
                    let list = condition.split(":");
                    let cdt0 = list[0];
                    let cdt1 = list[1]
                    if (cdt1.includes('-')) {
                        cdt1 = cdt1.split('-')
                    }
                    result += `if(${getStrFormFunc(cdt0, cdt1)}) return Infinity;\n`
                }
                else getFilter(condition)
            })
            result += "},\n"
        }
        if (mod.lengthOfCardEnabled) {
            result += "cardEnabled:function(card){\n"
            mod.cardEnabled_false.forEach(condition => {
                if (condition === "all") result += "return false;\n";
                else if (condition.includes(':')) {
                    let list = condition.split(":");
                    let cdt0 = list[0];
                    let cdt1 = list[1]
                    if (cdt1.includes('-')) {
                        cdt1 = cdt1.split('-')
                    }
                    result += `if(${getStrFormFunc(cdt0, cdt1, true)}) return false;\n`
                }
                else getFilter(condition)
            })
            result += "},\n"
        }
        if (mod.lengthOfTargetInRange) {
            result += "targetInRange:function(card,player,target,now){\n"
            mod.targetInRange_Infinity.forEach(condition => {
                if (condition === "all") result += "return true;\n";
                else if (condition.includes(':')) {
                    let list = condition.split(":");
                    let cdt0 = list[0];
                    let cdt1 = list[1]
                    if (cdt1.includes('-')) {
                        cdt1 = cdt1.split('-')
                    }
                    result += `if(${getStrFormFunc(cdt0, cdt1)}) return true;\n`
                }
                else getFilter(condition)
            })
            result += "},\n"
        }
        if (mod.lengthOfTargetEnabled) {
            result += "targetEnabled:function(card,player,target,now){\n"
            mod.targetEnabled_false.forEach(condition => {
                if (condition === "all") result += "return false;\n";
                else if (condition.includes(':')) {
                    let list = condition.split(":");
                    let cdt0 = list[0];
                    let cdt1 = list[1];
                    if (cdt1.includes('-')) {
                        cdt1 = cdt1.split('-');
                    }
                    result += `if(${getStrFormFunc(cdt0, cdt1)}) return false;\n`;
                }
                else getFilter(condition, "playerIsTarget")
            })
            result += "},\n";
        }
        if (mod.lengthOfGlobalFrom) {
            result += `globalFrom:function(from,to,current){\n`
            if (mod.globalFrom.every(line => line.includes(':'))) {
                let number = mod.globalFrom.reduce((acc, cur) => {
                    let list = cur.split(":");
                    let cdt0 = list[0];
                    let cdt1 = parseInt(list[1]);
                    return cdt0 === "+" ? acc + cdt1 : acc - cdt1;
                }, 0);
                if (!number) number = `+0`
                if (number > 0) number = `+${number}`
                result += `return distance${number};\n`
            } else {
                mod.globalFrom.forEach(condition => {
                    if (condition.includes(':')) {
                        let list = condition.split(":");
                        let cdt0 = list[0];
                        let cdt1 = list[1];
                        result += `return distance${cdt0}${cdt1};\n`;
                    }
                    else getFilter(condition)
                })
            }
            result += "},\n"
        }
        if (mod.lengthOfGlobalTo) {
            result += `globalTo:function(from,to,current){\n`
            if (mod.globalTo.every(line => line.includes(':'))) {
                let number = mod.globalTo.reduce((acc, cur) => {
                    let list = cur.split(":");
                    let cdt0 = list[0];
                    let cdt1 = parseInt(list[1]);
                    return cdt0 === "+" ? acc + cdt1 : acc - cdt1;
                }, 0);
                if (!number) number = `+0`
                if (number > 0) number = `+${number}`
                result += `return distance${number};\n`
            } else {
                mod.globalTo.forEach(condition => {
                    if (condition.includes(':')) {
                        let list = condition.split(":");
                        let cdt0 = list[0];
                        let cdt1 = list[1];
                        result += `return distance${cdt0}${cdt1};\n`;
                    }
                    else getFilter(condition)
                })
            }
            result += "},\n"
        }
        if (custom.mod) result += getStrNormalFunc(custom.mod)
        result += "},\n";
        return result
    }

    static getIndex(back) {
        let result = 'getIndex:function(event,player,triggername){\n';
        const { getIndex, triggerFilter, trigger } = back.skill;
        const { player, global, target, source } = getIndex;
        if (player.length + global.length + target.length + source.length === 0) {
            if (trigger.global.includes("loseAfter")) {
                result += `if(event.name === "loseAsync") return game.filterPlayer(curr => event.getl(curr).length > 0).sortBySeat();\n`
                result += `return [event.player];\n`
            }
            else if (trigger.global.includes("gainAfter")) {
                result += `if(event.name === "loseAsync") return game.filterPlayer(curr => event.getg(curr).length > 0).sortBySeat();\n`
                result += `return [event.player];\n`
            }
            else return '';
        } else {
            outer: for (const triType in getIndex) {
                for (const triName of getIndex[triType]) {
                    if (testLoseRegExp.test(triName) && triType === "player") {
                        const who = "player"
                        for (const triType in triggerFilter) {
                            for (const [_, search] of Object.entries(triggerFilter[triType])) {
                                const map = EditorDataAnalyze.triLimitUrl(search);
                                result += `if(!event.getl?.(${who})) return false;\n`
                                let cards = `event.getl(${who}).cards2`;
                                if (map.position) {
                                    const [position] = map.position;
                                    if (position.length === 1) {
                                        cards = (`event.getl(${who}).${position}s`);
                                    }
                                    delete map.position;
                                }
                                const filterParts = [];
                                for (const [attr, values] of Object.entries(map)) {
                                    if (attr === "unknown") continue;
                                    if (values.length === 1) filterParts.push(`get.${attr}(card) === ${values}`)
                                    else filterParts.push(`[${values}].includes(get.${attr}(card))`)
                                }
                                if (filterParts.length) result += `return ${cards}.filter(card => ${filterParts.join(" && ")}).length\n`
                                else result += `return ${cards}.length;\n`;
                            }
                        }
                    }
                    else {
                        result += "return event.num;\n"
                    };
                    break outer;
                };
            }
        }

        result += `},\n`
        return result;
    }
    static triFilter_noLose(triggerFilter, triLength, trigger, id) {
        let result = ''
        let triggerNameNeedBool = trigger.global.length > 0 && triLength !== 1;
        if (!triggerNameNeedBool) {
            const record = []
            for (const triType of ["player", "source", "target"]) {
                for (const triName of trigger[triType]) {
                    record.add(triggerFilter[triType][triName]);
                    if (record.length > 1) {
                        triggerNameNeedBool = true;
                    }
                }
            }
        }
        for (const triType of ["global", "player", "source", "target"]) {
            for (const [triName, search] of Object.entries(triggerFilter[triType])) {
                if (!search) continue;
                let globalAs = "player";
                const preParts = [];
                const parts0 = [];
                const parts = [];
                const map = EditorDataAnalyze.triLimitUrl(search);
                const boolCardsDiscard = map.cardsDiscardFor;
                if (triggerNameNeedBool) {
                    preParts.add(`triggername === "${triName}"`);
                }
                if (triType === "global") {
                    if (trigger.player.includes(triName)) {
                        preParts.add(`event.player !== player`)
                    }
                    if (trigger.source.includes(triName)) {
                        preParts.add(`event.source !== player`)
                    }
                    if (trigger.target.includes(triName)) {
                        preParts.add(`event.target !== player`)
                    }
                } else if (trigger.global.includes(triName)) {
                    preParts.add(`event.${triType} === player`)
                }
                if (triName === "damageSource" && triType === "global") {
                    globalAs = "source";
                }
                if (boolCardsDiscard) {
                    const values = map.cardsDiscardFor;
                    if (values.length === 1) parts0.add(`event.getParent()?.relatedEvent?.name !== ${values}`)
                    else parts0.add(`[${values}].includes(event.getParent()?.relatedEvent?.name)`);
                    delete map.cardsDiscardFor
                }
                if (map.unknown) {
                    for (const value of map.unknown) {
                        if (["source", "target"].includes(value) && triType === "global") {
                            globalAs = value
                        } else {
                            parts.add(triUnkonwn(value, global ? `event.${globalAs}` : "player", id))
                        }
                    }
                    delete map.unknown
                }
                for (const [attr, values] of Object.entries(map)) {
                    if (attr === "respondName") {
                        if (values.length === 1) {
                            parts.add(`!event.filterCard({ name: ${values}, isCard: true }, player, event)`)
                            parts.add(`event.responded`)
                        }
                    }
                    //
                    else if (attr.startsWith("triPlayer")) {
                        if (attr === "triPlayer") for (const triPlayer of values) {
                            parts.add(triPlayerFilter(triPlayer, "event.player"))
                        } else {
                            parts.add(triPlayerFilter(values, "event.player", attr))
                        }
                    } else if (attr.startsWith("triSource")) {
                        if (attr === "triSource") for (const triSource of values) {
                            parts.add(triPlayerFilter(triSource, "event.source"))
                        } else {
                            parts.add(triPlayerFilter(values, "event.source", attr))
                        }
                    } else if (attr.startsWith("triTarget")) {
                        if (attr === "triTarget") for (const triTarget of values) {
                            parts.add(triPlayerFilter(triTarget, "event.target"))
                        } else {
                            parts.add(triPlayerFilter(values, "event.target", attr))
                        }
                    }
                    //
                    else if (attr.startsWith("filterPlayer") && triType === "global") {
                        if (attr === "filterPlayer") for (const value of values) {
                            parts.add(triPlayerFilter(value, boolCardsDiscard ? "event.getParent()?.relatedEvent?.player" : `event.${globalAs}`))
                        } else {
                            parts.add(triPlayerFilter(values, boolCardsDiscard ? "event.getParent()?.relatedEvent?.player" : `event.${globalAs}`, attr))
                        }
                    }
                    else if (attr === "historyAllDamage") {
                        if (values.length === 1) parts.add(`player.getAllHistory("damage").length % ${values} !== 0`)
                    } else if (attr === "historyAllSourceDamage") {
                        if (values.length === 1) parts.add(`player.getAllHistory("sourceDamage").length % ${values} !== 0`)
                    } else if (attr === "historyAllDamagePlus") {
                        if (values.length === 1) parts.add(`(player.getAllHistory("damage").length + player.getAllHistory("sourceDamage").length) % ${values} !== 0`)
                    }
                    else if (attr === "useSkillFilter") {
                        for (const filter of values) {
                            //神孙权考虑了charlotte技 这里暂时这样写
                            if (filter === "isLocked") {
                                parts.add(`!get.is.locked(get.sourceSkillFor(event))`);
                            }
                            if (filter === "noLocked") {
                                parts.add(`get.is.locked(get.sourceSkillFor(event))`);
                            }
                        }
                    }
                    else if (attr === "linked") {
                        if (values.length === 1) parts.add(`player.isLinked() !== ${values}`)
                    } else if (attr === "turnedOver") {
                        if (values.length === 1) parts.add(`player.isTurnedOver() !== ${values}`)
                    }
                    else {
                        if (boolCardsDiscard) {
                            parts.add(`event.cards.some(card => ${triCardsFilter(attr, values)})`)
                        } else if (attr === "tag") {
                            if (values.length === 1) parts.add(`!get.tag(event.card, ${values})`)
                            else parts.add(`[${values}].some(tag => !get.tag(event.card, tag))`)
                        } else {
                            if (values.length === 1) parts.add(`get.${attr}(event.card) !== ${values}`)
                            else parts.add(`![${values}].includes(get.${attr}(event.card))`)
                        }
                    }
                }
                if (parts.some(logicJudge => logicJudge.includes("event.source"))) {
                    parts0.push("!event.source");
                }
                if (triggerNameNeedBool) {
                    if (parts0.length > 1) result += `if(${preParts.join(' && ')} && (${parts0.join(' || ')})) return false;\n`
                    else result += `if(${preParts.join(' && ')} && ${parts0.join(' || ')}) return false;\n`
                    if (parts.length > 1) result += `if(${preParts.join(' && ')} && (${parts.join(' || ')})) return false;\n`
                    else result += `if(${preParts.join(' && ')} && ${parts.join(' || ')}) return false;\n`
                } else {
                    if (parts0.length) result += `if(${parts0.join(' || ')}) return false;\n`
                    if (parts.length) result += `if(${parts.join(' || ')}) return false;\n`;
                    return result;
                }
            }
        }
        return result;
    }
    static triFilter_gain(triggerFilter, global) {
        let result = ''
        const parts = [];
        const getgParts = [];
        const filterParts = [];
        let who = global ? "target" : "player";
        let cards = `event.getg(${who})`;
        const map = EditorDataAnalyze.triLimitUrl(global ? triggerFilter.global.gainAfter : triggerFilter.player.gainAfter);
        if (map.unknown) {
            for (const value of map.unknown) {
                parts.add(triUnkonwn(value, who))
            }
        }
        if (map.noCard) {
            parts.push(`player.countCards(${map.noCard})`)
        }
        if (map.position) delete map.position;
        for (const [attr, values] of Object.entries(map)) {
            if (["unknown", "noCard"].includes(attr)) continue;
            if (attr.startsWith("triGiver")) {
                if (attr === "triGiver") for (const value of values) {
                    parts.add(triPlayerFilter(value, `event.giver`))
                } else {
                    parts.add(triPlayerFilter(values, `event.giver`, attr))
                }
            }
            else if (attr.startsWith("filterPlayer") && global) {
                if (attr === "filterPlayer") for (const value of values) {
                    parts.add(triPlayerFilter(value, `${who}`))
                } else {
                    parts.add(triPlayerFilter(values, `${who}`, attr))
                }
            }
            else {
                filterParts.push(triCardsFilter2(attr, values, who))
            }
        }
        if (filterParts.length) getgParts.push(`${cards}.some(card => ${filterParts.join(" && ")})`)
        else if (!global) getgParts.push(`${cards}.length`)
        if (parts.length) result += `if(${parts.join(' || ')}) return false;\n`
        if (getgParts.length === 1) result += `if(!${getgParts.join(" && ")}) return false;\n`
        else if (getgParts.length > 1) result += `if(!(${getgParts.join(" && ")})) return false;\n`
        return result;
    }
    static triFilter_lose(triggerFilter, global, triReason) {
        let result = ''
        const parts = [];
        const getlParts = [];
        const filterParts = [];
        let who = global ? "target" : "player";
        let cards = '';
        if (triReason === "discardToDiscardPile") parts.push(`event.type !== "discard"`);
        else if (triReason === "discardInDiscardPhase") {
            parts.push(`event.type !== "discard"`)
            parts.push(`event.getParent("phaseDiscard", true)?.player !== ${who}`);
        }
        const map = EditorDataAnalyze.triLimitUrl(global ? triggerFilter.global.loseAfter : triggerFilter.player.loseAfter);
        if (map.unknown) {
            for (const value of map.unknown) {
                parts.add(triUnkonwn(value, who))
            }
        }
        if (map.noCard) {
            parts.push(`player.countCards(${map.noCard})`)
        }
        if (map.position) {
            const [position] = map.position;
            if (position.length === 1) {
                cards = `event?.getl?.(${who})?.${position}s`;
            } else {
                cards = `event?.getl?.(${who})?.cards2`;
                filterParts.push(`"${position}".includes(get.position(card))`)
            }
            delete map.position;
        } else {
            cards = `event?.getl?.(${who})?.cards2`;
        }
        for (const [attr, values] of Object.entries(map)) {
            if (["unknown", "noCard"].includes(attr)) continue;
            if (attr.startsWith("filterPlayer")) {
                if (attr === "filterPlayer") for (const value of values) {
                    parts.add(triPlayerFilter(value, `${who}`))
                } else {
                    parts.add(triPlayerFilter(values, `${who}`, attr))
                }
            }
            else {
                filterParts.push(triCardsFilter2(attr, values, who))
            }
        }
        if (filterParts.length) getlParts.push(`${cards}?.some?.(card => ${filterParts.join(" && ")})`)
        else if (!global) getlParts.push(`${cards}?.length`)
        if (parts.length) result += `if(${parts.join(' || ')}) return false;\n`
        if (getlParts.length === 1) result += `if(!${getlParts.join(" && ")}) return false;\n`
        else if (getlParts.length > 1) result += `if(!(${getlParts.join(" && ")})) return false;\n`
        return result;
    }
    static triFilter_lose_noUseToDiscardPile(triggerFilter, global) {
        let result = ''
        const who = global ? "target" : "player";
        const commonFilter = [];
        const getdFilter = [];
        const disFilter = [];
        const cardFilter = [];
        let getdCards = `event.getd(${who}, "cards2")`, disCards = `event?.getl?.(${who}, "cards2")`;
        for (const triType in triggerFilter) {
            for (const [_, search] of Object.entries(triggerFilter[triType])) {
                if (!search) continue;
                const map = EditorDataAnalyze.triLimitUrl(search);
                if (map.unknown) {
                    for (const value of map.unknown) {
                        parts.add(triUnkonwn(value, who))
                    }
                }
                if (map.position) {
                    const [position] = map.position;
                    if (position.length === 1) {
                        getdCards = `event.getd(${who}, "${position}s")`;
                        disCards = `event.getl(${who}, "${position}s")`
                    } else {
                        cardFilter.push(`"${position}".includes(get.position(card))`)
                    }
                    delete map.position;
                }
                for (const [attr, values] of Object.entries(map)) {
                    if (["unknown", "noCard"].includes(attr)) continue;
                    cardFilter.push(triCardsFilter(attr, values, who))
                }
            }
        }
        disFilter.push(`event.getParent()?.relatedEvent?.name === "useCard"`)
        if (!global) {
            disFilter.push(`event.getParent()?.relatedEvent?.player !== player`)
            disFilter.push(`!player.hasHistory(evt => event.getParent()?.relatedEvent === (evt.relatedEvent || evt.getParent()))`)
        }
        if (cardFilter.length) {
            if (commonFilter.length) {
                result += `if(${commonFilter.join(" || ")}) return false;\n`;
            }
            getdFilter.push(`${getdCards}.every(card => ${cardFilter.join(" && ")})`);
            disFilter.push(`${disCards}?.every?.(card => ${cardFilter.join(" && ")})`);
        }
        if (getdFilter.length) {
            result += `if(event.name !== "cardsDiscard" && ${getdFilter.length > 1 ? '(' + getdFilter.join(" || ") + ')' : getdFilter}) return false;\n`;
        }
        result += `if(event.name === "cardsDiscard" && ${disFilter.length > 1 ? '(' + disFilter.join(" || ") + ')' : disFilter}) return false;\n`;
        return result;
    }
    static filter(back, asCardType) {
        const { id, type, uniqueList, trigger, filter,
            variableArea_filter, filter_ignoreIndex,
            triGameStart, triLoseReason,
            mod, triggerFilter, triLength } = back.skill;
        const triLose_player = trigger.player.filter(triName => testLoseRegExp.test(triName));
        const triLose_global = trigger.global.filter(triName => testLoseRegExp.test(triName));
        const triGain_player = trigger.player.filter(triName => testGainRegExp.test(triName));
        const triGain_global = trigger.global.filter(triName => testGainRegExp.test(triName));
        const boolZhuSkill = type.includes("zhuSkill");
        const boolGroupSkill = type.includes("groupSkill");
        const boolLose = triLose_global.length + triLose_player.length > 0;
        const boolfilterHasContent = filter.length > 0;
        const booltriggerFilter = Object.values(triggerFilter).flat().length > 0;
        const boolOnlyMod = mod.length > 0
            && [boolZhuSkill, boolGroupSkill,
                booltriggerFilter, boolLose,
                boolfilterHasContent].every(bool => bool === false);
        if (boolOnlyMod) return ''
        let result = '';
        if (triLose_global.length || triGain_global.length) result += 'filter:function(event, player, triggername, target){\n'
        else result += 'filter:function(event, player, triggername){\n'
        if (variableArea_filter.length) result += variableArea_filter.join("\n") + "\n"
        //主公技
        if (boolZhuSkill) {
            result += `if(! player.hasZhuSkill("${id}")) return false;\n`;
        }
        //势力技
        if (boolGroupSkill) {
            const group = findPrefix(uniqueList, "group").map(k => k.slice(6))
            if (group.length > 0) {
                result += `if(player.group != "${group[0]}") return false;\n`;
            }
        }
        if (triGameStart) {
            result += `if(event.name === "phase" && game.phaseNumber !== 0) return false;\n`;
        }
        else if (triGain_global.length) {
            result += EditorOrganize.triFilter_gain(triggerFilter, true);
        } else if (triGain_player.length) {
            result += EditorOrganize.triFilter_gain(triggerFilter, false);
        }
        else if (triLose_global.length) {
            if (triLoseReason === "noUseToDiscardPile") {
                result += EditorOrganize.triFilter_lose_noUseToDiscardPile(triggerFilter, true, triLoseReason)
            } else {
                result += EditorOrganize.triFilter_lose(triggerFilter, true, triLoseReason);
            }
        } else if (triLose_player.length) {
            if (triLoseReason === "noUseToDiscardPile") {
                result += EditorOrganize.triFilter_lose_noUseToDiscardPile(triggerFilter, false, triLoseReason)
            } else {
                result += EditorOrganize.triFilter_lose(triggerFilter, false, triLoseReason);
            }
        } else if (triggerFilter) {
            result += EditorOrganize.triFilter_noLose(triggerFilter, triLength, trigger, id);
        }
        if (asCardType) {
            result += `if(!get.info("${id}").buttonRequire(player,event)) return false;\n`
        }
        if (boolfilterHasContent) {
            const stack = [], subStack = [];
            for (const [k, i] of filter.entries()) {
                if (filter_ignoreIndex.includes(k)) break;
                //如果是空字符，则不处理
                if (i === "") break;
                if (/^[ ]+$/.test(i)) break;
                subStack.push(i)
                const str = subStack.join("\n")
                if (testSentenceIsOk(str)) {
                    subStack.length = 0;
                    stack.push(str);
                } else if (stack.length) {
                    const temp = [];
                    for (let n = 0; n < stack.length; n++) {
                        temp.unshift(stack.pop());
                        const funStr = `${temp.join("\n")}\n${str}`
                        if (testSentenceIsOk(funStr)) {
                            stack.push(funStr);
                            subStack.length = 0;
                            temp.length = 0;
                            break;
                        }
                    }
                    stack.push(...temp);
                }
            }
            if (subStack.length) {
                result += filter.join("\n");
            } else if (stack.length) {
                result += stack.map(line => {
                    const testStr = `if(!(${line})) return false;`
                    if (testSentenceIsOk(testStr)) return testStr;
                    return line;
                }).join("\n");
                result = format(result);
            }
            result += "\n";
        }
        if (!back.returnIgnore && !result.endsWith('\n')) result += '\n';
        if (!back.returnIgnore && !result.split("\n").at(-2).startsWith("return")) result += 'return true;\n';
        result += '},\n';
        return result;
    }
    static position(back) {
        const { position } = back.skill;
        if (!position.length || position.toString() === "h") return '';
        return `position:"${position.join("")}",\n`
    }
    static filterTarget(back) {
        let result = '';
        let IF = false;
        let branch = 0
        const { id, type, filterTarget } = back.skill
        result += 'filterTarget:function(card,player,target){\n'
        filterTarget.forEach((i, k) => {
            //如果是空字符，则不处理
            if (i === "") return;
            const previousLine = k ? filterTarget[k - 1] : ''
            const nextLine = k < filterTarget.length - 1 ? filterTarget[k + 1] : ''
            const logicWords = [" > ", " < ", " >= ", " <= ", " == ", " != ", " === ", " !== ", " || ", " && "]
            //如果含赋值语句或本身就有return，则不添加return
            if (i.includes("return")
                || i.includes("var ") || i.includes("let ") || i.includes("const ")
                || i.includes(" = ") || i.includes(" += ") || i.includes(" -= ")
                || i.includes(" /= ") || i.includes(" *= ") || i.includes(" %= ")
                || i.includes(" >>= ") || i.includes(" <<= ") || i.includes(" **= ")
                || i.includes("++") || i.includes("--")) {
                result += i + '\n'
            }
            else if (i === 'if(') {
                result += i;
                IF = true
            }
            else if (i === ")") {
                result += i;
                IF = false;
            }
            else if (IF === true) {
                if ([' || ', ' && '].includes(i)) result += '\n'
                result += i;
            }
            else if (i === '{') {
                result += '{\n';
                branch++;
            }
            else if (i === '}') {
                result += '}\n';
                branch--;
            }
            else if (branch > 0) {
                result += i + '\n'
            }
            else if (!logicWords.includes(previousLine)
                && logicWords.includes(nextLine)) {
                result += 'if(! ('
                result += i
            }
            else if (logicWords.includes(previousLine)
                && !logicWords.includes(nextLine)) {
                result += i
                result += ')) return false;\n'
            }
            else if (logicWords.includes(previousLine)
                && logicWords.includes(nextLine)) {
                result += i
            }
            else if ([' || ', ' && '].includes(i)) {
                result += '\n' + i
            }
            else if (logicWords.includes(i)) {
                result += i
            }
            else {
                result += 'if(! (' + i + ')) return false;\n'
            }
        });
        if (!result.endsWith('\n')) result += '\n'
        result += 'return true;\n';
        result += '},\n';
        return result
    }
    static filterCard(back) {
        let result = '';
        let IF = false;
        let branch = 0
        const { id, type, filterCard } = back.skill
        result += 'filterCard:function(card){\n'
        filterCard.forEach((i, k) => {
            //如果是空字符，则不处理
            if (i === "") return;
            const previousLine = k ? filterCard[k - 1] : ''
            const nextLine = k < filterCard.length - 1 ? filterCard[k + 1] : ''
            const logicWords = [" > ", " < ", " >= ", " <= ", " == ", " != ", " === ", " !== ", " || ", " && "]
            //如果含赋值语句或本身就有return，则不添加return
            if (i.includes("return")
                || i.includes("var ") || i.includes("let ") || i.includes("const ")
                || i.includes(" = ") || i.includes(" += ") || i.includes(" -= ")
                || i.includes(" /= ") || i.includes(" *= ") || i.includes(" %= ")
                || i.includes(" >>= ") || i.includes(" <<= ") || i.includes(" **= ")
                || i.includes("++") || i.includes("--")) {
                result += i + '\n'
            }
            else if (i === 'if(') {
                result += i;
                IF = true
            }
            else if (i === ")") {
                result += i;
                IF = false;
            }
            else if (IF === true) {
                if ([' || ', ' && '].includes(i)) result += '\n'
                result += i;
            }
            else if (i === '{') {
                result += '{\n';
                branch++;
            }
            else if (i === '}') {
                result += '}\n';
                branch--;
            }
            else if (branch > 0) {
                result += i + '\n'
            }
            else if (!logicWords.includes(previousLine)
                && logicWords.includes(nextLine)) {
                result += 'if(! ('
                result += i
            }
            else if (logicWords.includes(previousLine)
                && !logicWords.includes(nextLine)) {
                result += i
                result += ')) return false;\n'
            }
            else if (logicWords.includes(previousLine)
                && logicWords.includes(nextLine)) {
                result += i
            }
            else if ([' || ', ' && '].includes(i)) {
                result += '\n' + i
            }
            else if (logicWords.includes(i)) {
                result += i
            }
            else {
                result += 'if(! (' + i + ')) return false;\n'
            }
        });
        if (!result.endsWith('\n')) result += '\n'
        result += 'return true;\n';
        result += '},\n';
        return result
    }
    static enablePart(back) {
        const { kind, type, filterTarget, filterCard, selectCard, selectTarget } = back.skill;
        let result = ''
        if (kind !== 'enable:"phaseUse"') return result
        if (filterTarget.length > 0 && type.includes('filterTarget')) {
            result += EditorOrganize.filterTarget(back);
        }
        if (filterCard.length > 0 && type.includes('filterCard')) {
            result += EditorOrganize.filterCard(back);
        }
        if (selectTarget.length > 0) result += `selectTarget:${selectTarget},\n`
        if (selectCard.length > 0) result += `selectCard:${selectCard},\n`
        result += EditorOrganize.position(back);
        return result;
    }

    static buttonRequire(back, i = 0) {
        const {
            asCardType,
            costName, costNature, costColor, costSuit,
            position, needCard,
            preEve, conditionBool, id, viewAsFrequency
        } = analyzeViewAsData(back, i)
        let result = '';
        result += `buttonRequire:function(player,event){\n`
        result += `const hasCardCanUse = lib.inpile.some(cardName=>{\n`
        result += `if(get.type(cardName${asCardType === "tirck2" ? ',"trick"' : ""}) !== "${asCardType.replaceAll(/\d/g, '')}") return false;\n`
        result += `if(!event.filterCard({name:cardName},player,event)) return false;\n`;
        if (viewAsFrequency.some(condition => {
            return NonameCN.viewAsFrequencyList.includes(condition);
        })) {
            result += `if(player.storage["${id}_used"]\n`
            result += ` && player.storage["${id}_used"].includes(cardName)) return false;\n`;
        }
        result += `return true;\n`;
        result += `})\n`;
        result += `if(!hasCardCanUse) return false;\n`;
        result += EditorOrganize.viewAsFilter({ costName, costNature, costColor, costSuit, needCard, preEve, conditionBool, position })
        result += `},\n`
        return result;
    }
    static backup({ id, needCard, costName, costNature, costColor, costSuit, preEve, selectCard, viewAsFrequency }) {
        let result = '';
        result += "filterCard:";
        if (needCard) result += NonameCN.getStrFormVcard({ costName, costNature, costColor, costSuit })
        else result += `()=>false`
        result += `,\n`
        if (preEve || viewAsFrequency.length) {
            const frequencyCardName = viewAsFrequency.find(condition => {
                return NonameCN.viewAsFrequencyList.includes(condition);
            })
            result += `precontent:function(){\n`
            if (preEve === "link") result += `player.link()\n`
            if (frequencyCardName) {
                if (frequencyCardName in NonameCN.viewAsFrequencyMap) {
                    result += `player.storage["${id}_used"]\n`
                    result += ` && player.when(${NonameCN.viewAsFrequencyMap[frequencyCardName]}).then(()=>{\n`;
                    result += `delete player.storage["${id}_used"];\n`
                    result += `})\n`
                }
                result += `player.markAuto("${id}_used",event.result.card.name);\n`
            }
            result += `},\n`
        };
        if (selectCard) result += `selectCard:${selectCard},\n`;
        return result;
    }
    static viewAsFilter({ costName, costNature, costColor, costSuit, needCard, preEve, conditionBool, position }) {
        let result = ''
        result += getStrFormConst({ costName, costNature, costColor, costSuit });
        if (needCard) result += `if(!player.countCards("${position.replace(/[']/g, "")}",{${costName ? "name," : ""}${costNature ? "nature," : ""}${costColor ? "color," : ""}${costSuit ? "suit," : ""}})) return false;\n`
        if (preEve) {
            if (preEve === "link") result += `if(player.isLinked() === ${conditionBool}) return false;\n`
        }
        result += `return true;\n`
        return result;
    }
    static viewAs(back, i = 0) {
        const { id } = back.skill;
        let result = '';
        const {
            asCard, asCardType, asNature,
            costName, costNature, costColor, costSuit,
            position, needCard,
            preEve, selectCard, conditionBool, viewAsFrequency
        } = analyzeViewAsData(back, i)
        if (!asCardType || !asCardType.length) {
            result += "viewAs:";
            result += NonameCN.getStrFormVcard({
                'costName': asCard,
                'costNature': asNature
            });
            result += ",\n";
            result += "viewAsFilter:function(player){\n"
            result += EditorOrganize.viewAsFilter({ costName, costNature, costColor, costSuit, needCard, preEve, conditionBool, position })
            result += "},\n"
            result += EditorOrganize.backup({ id, needCard, costName, costNature, costColor, costSuit, preEve, selectCard, viewAsFrequency })
            if (asCard === "tao") {
                if (i === 0) back.skill.ai.push("save:true,");
            }
        } else {
            result += `chooseButton:{\n`
            result += `dialog:function(event,player){\n`
            result += `const list = [];\n`
            if (asCardType === 'basic') {
                result += `if(event.filterCard({name:"sha"},player,event)){\n`
                result += `list.push(["基本","","sha"])\n`
                result += `for(const nature of lib.inpile_nature){\n`
                result += `if(event.filterCard({name:"sha",nature},player,event)) list.push(["基本","","sha",nature])\n`
                result += `}\n`
                result += `}\n`
            }
            result += `for(const i of lib.inpile){\n`
            if (asCardType === 'basic') result += `if(i === "sha") continue;\n`
            result += `if(get.type(i${asCardType == 'trick2' ? ',"trick"' : ""}) !== "${asCardType.replace(/\d/, '')}") continue;\n`
            result += `if(!event.filterCard({name:i},player,event)) continue;\n`
            if (asCardType === 'delay') result += `if(!game.countPlayer(cur=>player.canUse({name:i},cur))) continue;\n`
            if (viewAsFrequency.some(condition => {
                return NonameCN.viewAsFrequencyList.includes(condition);
            })) {
                result += `if(player.storage["${id}_used"]\n`
                result += ` && player.storage["${id}_used"].includes(i)) continue;\n`
            }
            result += `list.push([${asCardType === "basic" ? '"基本"' : '"锦囊"'},"",i]);\n`
            result += `}\n`
            result += `return ui.create.dialog(get.translation("${id}"),[list,'vcard']);\n`
            result += `},\n`
            result += `backup:function(links,player){\n`
            result += `return {\n`
            result += EditorOrganize.backup({ id, needCard, costName, costNature, costColor, costSuit, preEve, selectCard, viewAsFrequency })
            result += `viewAs:{\n`
            result += `name:links[0][2],\n`
            if (asCardType === 'basic') result += `nature:links[0][3],\n`
            result += `},\n`
            result += `}\n`
            result += `},\n`
            result += `prompt:function(links,player){\n`
            result += `return "视为使用一张【"+get.translation(links[0][2])+"】"\n`
            result += `},\n`
            result += `},\n`
        }
        return result;
    }

    static cost(back) {
        const { custom } = back.skill
        if (!custom.cost) return '';
        let result = `cost:${getStrNormalFunc(custom.cost).slice(0, -1)},\n`;
        return result;
    }
    static judgeCallback(back) {
        const { custom } = back.skill;
        if (!custom.judgeCallback) return '';
        let result = `judgeCallback:${getStrNormalFunc(custom.judgeCallback).slice(0, -1)},\n`;
        return orderSteps(result);
    }
    static content(back) {
        const { contentAsync, type, content,
            id, mod, kind, content_ignoreIndex } = back.skill;
        const boolIsAwakeSkill = type.filter(i => {
            return ["limited", "juexingji", "dutySkill"].includes(i)
        }).length > 0;
        const boolIsZhuanhuanSkill = type.includes('zhuanhuanji');
        const boolHasContent = content.length > 0;
        const boolOnlyMod = mod.length > 0
            && [boolIsAwakeSkill, boolIsZhuanhuanSkill, boolHasContent].every(bool => bool === false)
        if (boolOnlyMod) return ''
        let result = ''
        let step = -1, bool;
        result += contentAsync ? 'content:async function(event,trigger,player){\n' : 'content:function(){\n';
        if (!contentAsync) {
            result += '"step 0"\n';
            step = 0;
        }
        if (boolIsAwakeSkill) result += 'player.awakenSkill("' + id + '");\n';
        if (boolIsZhuanhuanSkill) result += 'player.changeZhuanhuanji("' + id + '");\n';
        if (boolHasContent) back.skill.content.forEach((i, lineNum) => {
            if (content_ignoreIndex.includes(lineNum)) return;
            if (back.ContentInherit) return (result += `${i}\n`);
            let modifiedLine = i;
            if (i.includes('chooseTarget')) {
                if (modifiedLine.includes('other')) {
                    modifiedLine = modifiedLine.replace(/,?other/, '')
                    modifiedLine += '\n.set("filterTarget",function(card,player,target){return player!=target})'
                }
            }
            if (i.includes('atLeast')) {
                modifiedLine = modifiedLine.replace('atLeast', '')
                modifiedLine = modifiedLine.replace(/([0-9]+)/, '[$1,Infinity]')
            } else if (i.includes('atMost')) {
                modifiedLine = modifiedLine.replace('atMost', '')
                modifiedLine = modifiedLine.replace(/([0-9]+)/, '[1,$1]')
            }
            if (i.includes("addToExpansion") && i.includes("gaintag.add")) {
                modifiedLine += '.gaintag.add( "' + back.skill.id + '")';
            }
            if ([/\.chooseToUse/, /\.useCard\(\{/].some(regexp => regexp.test(i))) {
                modifiedLine = modifiedLine.replace(/(.*?)(?<!\[)([0-9]|\b[a-zA-Z]\b)(?!\])(?!\=\>)(?!\.)(.*)/, 'new Array($2).fill().forEach(()=>$1$3)')
            }
            else result += modifiedLine + "\n"
        })
        result += '},\n'
        if (!back.ContentInherit && back.skill.kind === 'trigger') {
            if (back.skill.boolList.includes("jianxiong_gain")) {
                result = addPSFix(result, /[a-z\.]+gain\(.*trigger.cards.*\)/g, `if(get.itemtype(trigger.cards)==="cards"\n&&get.position(trigger.cards[0])==="o"){\n`, '\n}\n')
                /**
                 * @type {Map}
                 */
                const map = back.skill.variable_content;
                let p = map.get("trigger.cards")
                result = addPSFix(result, new RegExp(`[a-z\.]+gain\(.*${p}.*\)`, "g"), `if(get.itemtype(${p})==="cards"\n&&get.position(${p}[0])=="o"){\n`, '\n}\n')
            }
            if (/[此该本]【?杀】?(造成)?的?伤害(\+|-|\*|改为)/.test(result)) {
                result = result.replace(/\s+$/gm, "")
                let regexp = /[此该本]【?杀】?(造成的)?伤害(\+|-|\*|改为)(?=[0-9a-z_$]+)/g
                result = result.replace(regexp, function (match, ...p) {
                    const symbol = p[1] === "改为" ? '' : p[1]
                    return `var id = trigger.target.playerid;\n` +
                        `var map=trigger.getParent("useCard",void 0,true).customArgs;\n` +
                        `if(!map[id]) map[id]={};\n` +
                        `if(typeof map[id].extraDamage != 'number'){\n` +
                        `map[id].extraDamage=0;\n` +
                        `}\n` +
                        `map[id].extraDamage ${symbol}=`
                })
            }
            if (/[此该本]【?杀】?需要的?【?闪】?(的数量)?(\+|-|\*|改为)/.test(result)) {
                result = result.replace(/\s+$/gm, "")
                let regexp = /[此该本]【?杀】?需要的?【?闪】?(的数量)?(\+|-|\*|改为)(?=[0-9a-z_$]+)/g
                result = result.replace(regexp, function (match, ...p) {
                    const symbol = p[1] === "改为" ? '' : p[1]
                    return `var id = trigger.target.playerid;\n` +
                        `var map = trigger.getParent("useCard",void 0,true).customArgs;\n` +
                        `if(!map[id]) map[id]={};\n` +
                        `if(typeof map[id].shanRequired != 'number'){\n` +
                        `map[id].shanRequired=1;\n` +
                        `}\n` +
                        `map[id].shanRequired ${symbol}= `
                })
            }
            if (/[此该本]【?决斗】?需要的?【?杀】?(的数量)?(\+|-|\*|改为)/.test(result)) {
                result = result.replace(/\s+$/gm, "")
                let regexp = /[此该本]【?决斗】?需要的?【?杀】?(的数量)?(\+|-|\*|改为)(?=[0-9a-z_$]+)/g
                result = result.replace(regexp, function (match, ...p) {
                    const symbol = p[1] === "改为" ? '' : p[1]
                    return `var id = (player == trigger.player ? trigger.target : trigger.player)["playerid"];\n` +
                        `var idt = trigger.target.playerid;\n` +
                        `var map = trigger.getParent("useCard",void 0,true).customArgs;\n` +
                        `if(!map[idt]) map[idt]={};\n` +
                        `if(!map[idt].shaReq) map[idt].shaReq={};\n` +
                        `if(!map[idt].shaReq[id])map[idt].shaReq[id]=1\n` +
                        `map[idt].shaReq[id] ${symbol}= `
                })
            }
            if (/(你令)?[此该本]牌额外结算([0-9a-z_$一二三四五六七八九十]+)次/.test(result)) {
                result = result.replace(/\s+$/gm, "")
                let regexp = /(你令)?[此该本]牌额外结算([0-9a-z_$一二三四五六七八九十])次/g
                result = result.replace(regexp, function (match, ...p) {
                    let number = p[1]
                    if ('一二三四五六七八九十'.includes(p[1])) number = "零一二三四五六七八九十".indexOf(p[1])
                    return `trigger.getParent("useCard",void 0,true).effectCount += ${number};`
                })
            }
            if (/(造成|受到)(的)?伤害(\+|-|\*|改为)/.test(result)) {
                result = result.replace(/\s+$/gm, "")
                let regexp = /(造成|受到)的?伤害(\+|-|\*|改为)(?=[0-9a-z_$]+)/g
                result = result.replace(regexp, function (match, ...p) {
                    const symbol = p[1] === "改为" ? '' : p[1]
                    return `trigger.num ${symbol}= `
                })
            }
        }
        if (/^令?[此该本]技能发动次数[减-]\d+$/m.test(result)) {
            result = result.replace(/^[此该本]技能发动次数[减-]/mg, kind === "trigger" ? `player.storage.counttrigger["${id}"]-=` : `player.getStat().skill["${id}"]-=`)
        }
        if (/^令?[此该本]技能发动次数令为\d+$/m.test(result)) {
            result = result.replace(/^[此该本]技能发动次数令为/mg, kind === "trigger" ? `player.storage.counttrigger["${id}"]=` : `player.getStat().skill["${id}"]=`)
        }
        if (!result.endsWith("\n")) result += "\n"
        result = format(result);
        result = orderSteps(result);
        return result;
    }

    static group(back) {
        let result = ''
        if (!back.skill.group.length) return result;
        const group = back.skill.group.map(id => `"${id}"`);
        result += `group:[${group}],\n`;
        return result;
    }

    static ai(back) {
        const { ai } = back.skill
        let result = ''
        result += 'ai:{\n'
        ai.forEach(line => {
            result += line + '\n'
        })
        result += '},\n'
        return result;
    }

    static oneSubSkill(back, name, ...content) {
        let { id } = back.skill
        if (back.skill.subSkillEditing) id = back.skill.primarySkillCache.skill.id;
        let result = ''
        result += `"${name}":{\n`;
        result += content.join('');
        result += '\nsub:true,\n';
        result += `sourceSkill:"${id}",\n`
        result += '},\n';
        return result;
    }
    static subSkill(back) {
        let result = ''
        const { subSkill } = back.skill
        if (!subSkill || !Object.keys(subSkill).length) return result
        result += 'subSkill:{\n';
        for (const [subSkillName, content] of Object.entries(subSkill)) {
            result += content.result;
        }
        result += '},\n';
        return result
    }

    static ending(back) {
        const { mode } = back.skill
        let result = ''
        if (mode === 'mt') result += '},'
        else if (mode === 'mainCode') result += '}'
        return result;
    }
    static custom = {
        researchCardsDif() {
            return [
                "custom_researchCardsDif:function(bool,kind,num){",
                "const cards = [], records = [];",
                "for(const card of bool ? ui.cardPile.childNodes : ui.discardPile.childNodes){",
                "const record = get[kind](card);",
                "if(!records.includes(record)){",
                "cards.push(card);",
                "records.push(record);",
                "}",
                "if(cards.length===num) break;",
                "}",
                "return cards;",
                "},\n"
            ].join('\n')
        },
        selectedIsSameCard() {
            return [
                "custom_selectedIsSameCard:function(card,kind){",
                "const mode = get.itemtype(card)==='button'?'buttons':'cards';",
                "if(!ui.selected[mode].length) return true;",
                "if(mode === 'buttons') return ui.selected[mode].every(selected=>{",
                "return get[kind](selected.link)===get[kind](card);",
                "})",
                "else return ui.selected[mode].every(selected=>{",
                "return get[kind](selected)===get[kind](card);",
                "})",
                "},\n"
            ].join('\n')
        },
        selectedIsDifCard() {
            return [
                "custom_selectedIsDifCard:function(card,kind){",
                "const mode = get.itemtype(card)==='button'?'buttons':'cards';",
                "if(!ui.selected[mode].length) return true;",
                "if(mode === 'buttons') return ui.selected[mode].every(selected=>{",
                "return get[kind](selected.link)===get[kind](card);",
                "})",
                "else return ui.selected[mode].every(selected=>{",
                "return get[kind](selected)===get[kind](card);",
                "})",
                "},\n"
            ].join('\n')
        }
    }
}
