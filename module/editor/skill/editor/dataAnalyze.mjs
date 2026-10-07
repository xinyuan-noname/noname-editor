import { lib } from "../../../../../../noname.js";

const suit = ['club', 'spade', 'diamond', 'heart', 'none'];
const color = ['red', 'black'];
const nature = Array.from(lib.nature.keys());
const number = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const type = ["basic", "equip", "trick", "delay"];
const subtype = ["equip1", "equip2", "equip3", "equip4", "equip5"];
const position = "hejxs"
const testTriTypeGlobal = /:global/;
const testTypePlayer = /^player:|:player(?=:)/
const testTypeSource = /^source:|:source(?=:)/
const testTypeSourcePlus = /^source\+:|:source\+(?=:)/
const testTypeTarget = /^target:|:target(?=:)/
const testTypeTargetPlus = /^target\+:|:target\+(?=:)/
const testTypeGlobal = /^global:|:global(?=:)/
export class EditorDataAnalyze {
    static select(line) {
        let result = line, ok = false;
        switch (true) {
            case line.includes('atLeast'): {
                result = `[${line.replace('atLeast', '')},Infinity]`;
                ok = true;
            }; break;
            case line.includes('atMost'): {
                result = `[1,${line.replace('atMost', '')}]`;
                ok = true;
            }; break;
            case (/^\[\d+,\d+\]$/.test(line) || /^\[[0-9],Infinity\]$/.test(line) || !isNaN(Number(result))): {
                ok = true;
            }; break;
        }
        return [ok, result];
    };
    static trigger(lines) {
        const result = {
            player: [],
            source: [],
            target: [],
            global: []
        };
        const triFilterMap = {
            player: {},
            source: {},
            target: {},
            global: {}
        };
        const getIndexMap = {
            player: [],
            source: [],
            target: [],
            global: []
        }
        let triLoseReason = "";
        // console.log(lines)
        //预处理
        for (const line of lines) {
            if (!line.length) continue;
            for (const item of line.slice(0)) {
                if (item.includes("|")) {
                    line.remove(item);
                    const splited = item.split(/:(?=[^:]*$)/);
                    if (splited.length === 1) {
                        const [triggersStr] = splited;
                        line.addArray(triggersStr.split("|").map(trigger => trigger));
                    } else {
                        const [decoration, triggersStr] = splited;
                        line.addArray(triggersStr.split("|").map(trigger => `${decoration}:${trigger}`));
                    }
                }
            }
        }
        //sort 注意这里不会判断一点从而判断getIndex 这需要搭配后续的一些处理
        //添加受到一点伤害/获得/摸一张牌的判断函数
        for (const line of lines) {
            if (!line.length) continue;
            if (line.includes("roundStart")) {
                line.remove("roundStart");
                result.global.push("roundStart");
            }
            let [triType] = line;
            let decorationG = '';
            if (triType in result) {
                line.remove(triType)
            }
            else if (testTriTypeGlobal.test(triType)) {
                line.remove(triType);
                decorationG = triType.replace("global", "");
                triType = "global";
            }
            else triType = "player";
            for (let item of line) {
                if (item.endsWith("damageSource")) {
                    if (triType !== "global") {
                        result.source.push(item);
                        continue;
                    }
                }
                if (testTypeSource.test(item)) {
                    if (triType !== "global") {
                        item = item.replace(testTypeSource, "")
                        result.source.push(item);
                        continue;
                    }
                }
                if (testTypeSourcePlus.test(item)) {
                    if (triType !== "global") {
                        item = item.replace(testTypeSourcePlus, "")
                        result.target.push(item);
                        result.player.push(item);
                        continue;
                    }
                }
                if (testTypeTarget.test(item)) {
                    if (triType !== "global") {
                        item = item.replace(testTypeTarget, "")
                        result.target.push(item);
                        continue;
                    }
                }
                if (testTypeTargetPlus.test(item)) {
                    if (triType !== "global") {
                        item = item.replace(testTypeTargetPlus, "")
                        result.target.push(item);
                        result.player.push(item);
                        continue;
                    }
                }
                if (testTypePlayer.test(item)) {
                    if (triType !== "global") {
                        item = item.replace(testTypePlayer, "")
                        result.player.push(item);
                        continue;
                    }
                }
                if (testTypeGlobal.test(item)) {
                    item = item.replace(testTypeGlobal, "")
                    result.global.push(item);
                    continue;
                }
                if (decorationG && triType === "global") {
                    result[triType].push(decorationG + item);
                    continue;
                }
                result[triType].push(item);
            }
        }
        for (const triType of ["player", "source", "target", "global"]) {
            result[triType] = result[triType].map(item => {
                if (!item.includes(":")) return item;
                const [triggername, ...filterList] = item.split(":").reverse();
                const filterParts = [];
                for (const filter of filterList) {
                    if (filter in lib.card) {
                        filterParts.push(`name=${filter}`)
                    } else if (suit.includes(filter)) {
                        filterParts.push(`suit=${filter}`);
                    } else if (nature.includes(filter)) {
                        filterParts.push(`nature=${filter}`);
                    } else if (color.includes(filter)) {
                        filterParts.push(`color=${filter}`);
                    } else if (number.includes(Number(filter))) {
                        filterParts.push(`number=${Number(filter)}`);
                    } else if (type.includes(filter)) {
                        filterParts.push(`type=${filter}`);
                    } else if (subtype.includes(filter)) {
                        filterParts.push(`subtype=${filter}`);
                    } else if (position.includes(filter)) {
                        filterParts.push(`position=${filter}`);
                    } else if (filter.startsWith("getIndex=")) {
                        getIndexMap[triType].push(triggername);
                    } else if (filter.startsWith("loseFor=")) {
                        triLoseReason = filter.replace("loseFor=", "")
                    } else if (/^[\w\d]+=[\w\d]+$/.test(filter)) {
                        filterParts.push(filter);
                    } else {
                        filterParts.push(`unknown=${filter}`)
                    }
                }
                if (!triFilterMap[triType][triggername]) triFilterMap[triType][triggername] = filterParts.join("&");
                else triFilterMap[triType][triggername] += '&' + filterParts.join("&")
                return triggername;
            }).toUniqued();
        }
        for (const triName in triFilterMap.global) {
            ["player", "source", "target"].forEach(triType => {
                if (triName in triFilterMap[triType]) triFilterMap[triType][triName] += '&' + triFilterMap.global[triName]
            })
        }
        const triLength = result.player.length + result.target.length + result.global.length + result.source.length;
        return [result, triFilterMap, triLength, getIndexMap, triLoseReason]
    };
    static triLimitUrl(search) {
        const result = {}
        for (const [attr, value] of new URLSearchParams(search)) {
            if (!result[attr]) result[attr] = [];
            if (["number", "unknown", 'position',
                "linked", "turnedOver",
                "triPlayer", "triTarget", "triSource", "triGiver",
                "useSkillFilter",
                'filterPlayer'].includes(attr)) result[attr].push(value)
            else if (attr.startsWith("history")) result[attr].push(value);
            else result[attr].push(`"${value}"`)
        };
        if (result.type && result.type2) {
            if ((result.type.includes('"trick"') || result.type.includes('"delay"')) && result.type2.includes('"trick"')) {
                result.type.remove('"trick"', '"delay"');
            }
            if (result.type2.includes('"trick"') && result.type.length) {
                result.type2.addArray(result.type);
                delete result.type;
            }
        }
        return result;
    }
}
