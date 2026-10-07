const cardNumberMap = {
    A: 1,
    J: 11,
    Q: 12,
    K: 13
}
export class ImplicitTextTool {
    static common(text) {
        let result = text
            .replace(/^(.*?牌|card)[ ]*(颜色)?(不?[为是])[ ]*(黑|红|无)色$/mg, '获取 颜色 $1 \n $3 \n $4色')
            .replace(/^(.*?牌|card)[ ]*(花色)?(不?[为是])[ ]*(梅花|黑桃|方片|红桃)$/mg, '获取 花色 $1 \n $3 \n $4')
            .replace(/^(.*?牌|card)[ ]*(类别)?(不?[为是])[ ]*(非延时锦囊牌|延时锦囊牌|普通锦囊牌|基本牌|装备牌)$/mg, '获取 类别 $1 \n $3 \n $4')
            .replace(/^(.*?牌|card)[ ]*(类别)?(不?[为是])[ ]*锦囊牌$/mg, '获取 广义类别 $1 \n $3 \n $4')
            .replace(/^(.*?牌|card)[ ]*(牌名)?(不?[为是])[ ]*(杀|闪|桃|酒|无懈可击|桃园结义|[南][蛮]入侵|万箭齐发|顺手牵羊|过河拆桥|无中生有|铁索连环|决斗|火攻|闪电|乐不思蜀|兵粮寸断)$/mg, '获取 牌名 $1 \n $3 \n $4')
            .replace(/(?<=[ ]*点数[ ]*不?[为是][ ]*)(A|J|Q|K)$/g, function (_, ...p) {
                return `${cardNumberMap[p[0]]}`
            })
            .replace(/^(.*?牌|card)[ ]*点数[ ]*(不?)(为|是|大于|小于|等于)[ ]*(10|11|12|13|[1-9])$/mg, '获取 点数 $1\n $2$3 \n $4')
            .replace(/^(.*?牌|card)[ ]*字数[ ]*(不?)(为|是|大于|小于|等于)[ ]*(\d+)$/mg, '获取 字数 $1\n $2$3 \n $4')
            .replace(/^(.*?牌|card)[ ]*(副类别)?[ ]*(不?[为是])[ ]*(武器牌|防具牌|\+1马牌|-1马牌|进攻马牌|防御马牌)$/mg, '获取 副类别 $1 \n $3 \n $4')
            .replace(/^(.*?牌|card)[ ]*(不?)是[ ]*伤害牌/mg, "获取  $2带伤害标签 $1")
            .replace(/^(.*?牌|card)[ ]*(不?[为是])[ ]*([冰火雷])杀$/mg, (_, ...p) => {
                return `获取 属性 ${p[0]}\n ${p[1]} \n ${p[2]}属性 \n ${p[1].includes("不") ? "或者" : "并且"} \n 获取 牌名 ${p[0]} \n ${p[1]} \n 杀`
            })
            .replace(/^(.*?牌|card)(有|无|带|不带)(伤害|多角色|多目标)标签/g, function (match, ...p) {
                if (p[0].includes("获取")) return match;
                return `获取 ${p[1]}${p[2]}标签 ${p[0]}`;
            })
        result = result
            .replace(/^(.+?)于回合外$/mg, "$1 不是当前回合角色")
        result = result
            .replace(/^(.+?)[ ]*[是为][ ]*(男性|女性)$/mg, '$1 属于性别 $2')
            .replace(/^(.+?)[ ]*不[是为][ ]*(男性|女性)$/mg, '$1 不属于性别 $2')
        result = result
            .replace(/^(.+?)[ ]*有(".+?"|'.+?')标记$/mg, "$1 有标记 $2")
        result = result
            .replace(/^触发的伤害事件不因横置传导而?造成$/mg, "触发事件 不涉及横置")
        result = result
            .replace(/(.+?)[ ]*本回合未(使用|造成)过?(牌|伤害)$/mg, '$1 本回合$2$3次数\n为\n0')
            .replace(/(.+?)[ ]*本回合(使用|造成)过(牌|伤害)$/mg, '$1 本回合$2$3次数\n大于\n0')
        result = result
            .replace(/^场上有(其他)?(男性|女性)(性别)?(角色)?$/mg, '游戏 统计场上$1$2数量\n大于\n0')
            .replace(/^场上有(其他)?(魏|蜀|吴|群|晋|西|键|神)势力角色$/mg, '游戏 统计场上$1$2势力角色数量\n大于\n0')
            
        return result;
    }
    static content(text) {
        let result = ImplicitTextTool.common(text)
            .replace(/(.+?)[ ]*执行(一个)?额外的?(准备|判定|出牌|摸牌|弃牌|结束)阶段/g, `阶段列表 剪接 当前回合序号 0 $3阶段|\\-skillID`)
            .replace(/^销毁(此牌|卡牌)/mg, '$1 修正\n$1 移除\n$1 已销毁 令为 真\n游戏 日志 $1 "已销毁"')
            .replace(/^重置本技能发动次数$/mg, '本技能发动次数令为0')
            .replace(/^你?[ ]*取消[本此该]触发事件$/mg, "触发事件 取消")
        console.log("content", result);
        return result;
    }
    static filter(text) {
        let result = ImplicitTextTool.common(text)
            .replace(/^有(伤害来源|触发事件的来源)$/mg, "$1")
            .replace(/^卡牌(花色|点数|牌名|颜色|类型|副类别|类别)(相同|不同)$/mg, '获取 当前选择的卡牌$1是否$2')
        console.log("filter", result);
        return result;
    }
    static filterCard(text) {
        let result = ImplicitTextTool.common(text)
            .replace(/^卡牌(花色|点数|牌名|颜色|类型|副类别|类别)(相同|不同)$/mg, '获取 当前选择的卡牌$1是否$2')
        console.log("filterCard", result);
        return result;
    }
    static trigger(text) {
        let result = text
            //.replace(/^游戏开始时$/mg, "global phaseBefore\nplayer enterGame\n")
            .replace(/(?<!将牌)置于武将牌[旁上]|将牌置于武将牌旁/g, "将牌置于武将牌上")
            .replace(/(回复|恢复)体力(?!上限)/g, "回复体力值")
            .replace(/当(?!前)/g, '')
            .replace(/之([前后])/g, "$1")
            //使用一张杀时，使用一张杀指定目标后
            .replace(/([红黑])牌/g, '$1色牌')
            .replace(/(?<=使用|打出)一张/g, "")
            .replace(/(?<=成为其他角色)使用(?=.+?的?目标[时后])/g, "")
            .replace(/(?<=使用.+?指定)一名角色为(?=目标[时后])/g, "")
        console.log("trigger", result);
        return result;
    }
}