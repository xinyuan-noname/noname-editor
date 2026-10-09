/**
 * contentMacros —— `host/skill-content.shya` 的槽表（纯数据模块）
 *
 * 用途：给「像旧版选择模式那样」的对话框/代码生成器当数据源 —— 一个宏 = 一条，
 * 一个插槽 = 一个可填字段（中文标签 + 类型 + 是否必填）。生成源码时按
 * `@宏名 { #槽: 值 … }` 拼即可：
 *   · 值槽 `required: false` → 不写就整条成员消失（引擎自己的缺省值生效）
 *   · 值槽 `required: true`  → 必填（引擎这些方法只有位置参数，省不了）
 *   · `type: "stmt"` 的语句槽 → 不写整块分支消失
 *
 * 槽名 = **引擎参数对象的键**（与旧版编辑器生成器 `skill/editor/parameter.mjs` 的参数表同一批键，
 * 该表的 `value` 就是 `.set()` 的键，而 `.set(k, v)` 与参数对象里的 `k: v` 等价）。
 * 哪些方法支持参数对象：`_x19D6_backup/tools/legacy-params-audit.mjs` 有实测表；
 * 不支持的那些（loseHp / give / addMark / addTempSkill / gainMultiple / line / chooseToGuanxing…）
 * 走位置实参，槽一律必填。
 *
 * 与 host/skill-content.shya **禁止单边改动**：`_x19D6_backup/tools/skill-content-check.mjs`
 * 会逐槽核对（宏名、槽名与顺序、`?` 可省标记、stmt 槽区分），漂了就报错。
 */

/** 分组顺序（对话框的页签顺序） */
export const CONTENT_MACRO_GROUPS = ["判定", "效果", "牌的处理", "询问与代价", "技能与标记", "事件修正", "杂项"];

/** 主体槽（第一个参数，宏的受体） */
const W = (cn) => ({ slot: "who", cn, type: "player", required: true });
/** 必填值槽 */
const R = (slot, cn, type = "expr") => ({ slot, cn, type, required: true });
/** 可省值槽：不写 → 参数对象里这条成员消失（引擎缺省生效） */
const O = (slot, cn, type = "expr") => ({ slot, cn, type, required: false });
/** 语句槽（分支体，不写整块消失） */
const S = (slot, cn) => ({ slot, cn, type: "stmt" });

/** 每个宏的槽表；slots 顺序 = skill-content.shya 里的声明顺序 */
export const CONTENT_MACROS = [
    {
        name: "judge_color",
        cn: "判定看颜色",
        group: "判定",
        doc: "令角色判定，按判定牌颜色分支。结果在 judge_color_result（.card/.suit/.color/.judge/.bool）",
        source: "标准包 铁骑 / 洛神",
        slots: [
            W("判定的角色"),
            O("judge", "判定评分函数（@ts 箭头，返回正数算成功）"),
            S("red", "红色时"),
            S("black", "黑色时"),
            S("none", "无色时")
        ]
    },
    {
        name: "judge_bool",
        cn: "判定看成败",
        group: "判定",
        doc: "令角色判定并按成败分支（自动带上 judge2 = result => result.bool，判定动画与官方一致）。结果在 judge_bool_result",
        source: "标准包 刚烈 / 铁骑 / 洛神 / 鬼才",
        slots: [
            W("判定的角色"),
            R("judge", "判定评分函数（@ts 箭头，返回正数算成功）"),
            S("yes", "判定成功时"),
            S("no", "判定失败时")
        ]
    },
    {
        name: "judge_suit",
        cn: "判定看花色",
        group: "判定",
        doc: "令角色判定，按花色分支；#other 是 default 分支。结果在 judge_suit_result。“只关心红桃”时只写 #heart",
        source: "标准包 刚烈（红桃）/ 铁骑（黑桃，主公技）",
        slots: [
            W("判定的角色"),
            O("judge", "判定评分函数（@ts 箭头）"),
            S("heart", "红桃时"),
            S("diamond", "方片时"),
            S("club", "梅花时"),
            S("spade", "黑桃时"),
            S("other", "其它（default 分支）")
        ]
    },
    {
        name: "draw",
        cn: "摸牌",
        group: "效果",
        doc: "令角色摸牌；一条都不写就是引擎缺省（摸一张）",
        source: "标准包 英姿 / 闭月 / 连营 / 苦肉",
        slots: [
            W("摸牌的角色"),
            O("num", "张数（不写＝1）", "number"),
            O("source", "来源（谁令你摸的）", "player"),
            O("animate", "有无摸牌动画（false 为无）", "expr"),
            O("nodelay", "无延迟摸牌", "expr"),
            O("visible", "摸到的牌全场可见", "expr"),
            O("bottom", "从牌堆底摸", "expr")
        ]
    },
    {
        name: "damage",
        cn: "造成伤害",
        group: "效果",
        doc: "令角色受到伤害；只写主体就是 1 点无来源伤害",
        source: "标准包 骁果 / 刚烈 / 反间",
        slots: [
            W("受到伤害的角色"),
            O("num", "伤害点数（不写＝1）", "number"),
            O("nature", "伤害属性（fire / thunder …）", "string"),
            O("source", "伤害来源", "player"),
            O("unreal", "虚拟伤害", "expr"),
            O("nosource", "没有伤害来源", "expr"),
            O("nocard", "没有造成伤害的卡牌", "expr"),
            O("notrigger", "不触发 Before/Begin/End/After 四个时机", "expr")
        ]
    },
    {
        name: "recover",
        cn: "回复体力",
        group: "效果",
        doc: "令角色回复体力（不写 num ＝ 1 点）",
        source: "标准包 结姻 / 青囊 / 苦肉",
        slots: [
            W("回复体力的角色"),
            O("num", "回复点数（不写＝1）", "number"),
            O("source", "回复来源", "player"),
            O("nosource", "没有回复来源", "expr"),
            O("nocard", "没有回复体力的卡牌", "expr")
        ]
    },
    {
        name: "lose_hp",
        cn: "失去体力",
        group: "效果",
        doc: "令角色失去体力（不是伤害）。引擎 loseHp(num) 只有位置参数，所以点数必填",
        source: "标准包 苦肉 / 裸衣 / 战神",
        slots: [W("失去体力的角色"), R("num", "失去点数", "number")]
    },
    {
        name: "lose_max_hp",
        cn: "失去体力上限",
        group: "效果",
        doc: "令角色失去体力上限（不写 num ＝ 1 点）",
        source: "标准包 战神",
        slots: [W("角色"), O("num", "失去上限点数（不写＝1）", "number")]
    },
    {
        name: "discard",
        cn: "弃置牌",
        group: "牌的处理",
        doc: "把牌弃置（置入弃牌堆）",
        source: "标准包 离间 / 流离 / 苦肉",
        slots: [
            W("弃牌的角色"),
            R("cards", "弃置的牌", "cards"),
            O("position", "从哪个区域弃（影响原区域）", "string"),
            O("notBySelf", "不是被自己弃置的", "expr"),
            O("discarder", "弃置者（默认事件来源）", "player")
        ]
    },
    {
        name: "gain",
        cn: "获得牌",
        group: "牌的处理",
        doc: "令角色获得牌",
        source: "标准包 奸雄 / 天妒 / 遗计 / 洛神",
        slots: [
            W("获得牌的角色"),
            R("cards", "获得的牌", "cards"),
            O("source", "从谁那里获得", "player"),
            O("animate", "获得动画（gain2 / gain / draw / give / giveAuto）", "string"),
            O("delay", "获得是否有延迟", "expr"),
            O("log", "录入游戏日志", "expr"),
            O("fromStorage", "从标记中获得", "expr"),
            O("bySelf", "视为自己给的牌", "expr")
        ]
    },
    {
        name: "give",
        cn: "给出牌",
        group: "牌的处理",
        doc: "把牌交给别人。引擎 give(cards, target) 只有位置参数，两个槽都必填",
        source: "标准包 仁德",
        slots: [W("给牌的角色"), R("cards", "给出的牌", "cards"), R("target", "接收的角色", "player")]
    },
    {
        name: "take_card",
        cn: "获得他人的牌",
        group: "牌的处理",
        doc: "引擎 gainPlayerCard。要读 { bool, cards } 结果的那半段自己写（`r = await player gainPlayerCard(...) forResult()`）",
        source: "标准包 反馈 / 反间",
        slots: [
            W("获得牌的角色"),
            R("from", "被拿牌的角色", "player"),
            O("select", "张数（1 或 [1,2]）", "expr"),
            O("position", "区域（he / e / h …）", "string"),
            O("forced", "必须选择", "expr"),
            O("prompt", "询问文字", "string"),
            O("visible", "该角色手牌可见", "expr")
        ]
    },
    {
        name: "discard_card",
        cn: "弃置他人的牌",
        group: "牌的处理",
        doc: "引擎 discardPlayerCard，槽同 @take_card",
        source: "过河拆桥类（标准包内 0 处）",
        slots: [
            W("弃牌的角色"),
            R("from", "被弃牌的角色", "player"),
            O("select", "张数（1 或 [1,2]）", "expr"),
            O("position", "区域（he / e / h …）", "string"),
            O("forced", "必须选择", "expr"),
            O("prompt", "询问文字", "string"),
            O("visible", "该角色手牌可见", "expr")
        ]
    },
    {
        name: "to_discardpile",
        cn: "失去牌至弃牌堆",
        group: "牌的处理",
        doc: "把牌直接置入弃牌堆（不是「弃置」，没有弃置来源语义）",
        source: "标准包 忠义（移去武将牌上的牌）",
        slots: [
            W("失去牌的角色"),
            R("cards", "失去的牌", "cards"),
            O("source", "来源（因为谁失去）", "player"),
            O("animate", "有无弃牌动画", "expr"),
            O("notBySelf", "不是被自己弃置的", "expr"),
            O("insert", "插入弃牌堆（影响顺序）", "expr"),
            O("blank", "背面朝上", "expr")
        ]
    },
    {
        name: "to_expansion",
        cn: "置于武将牌上",
        group: "牌的处理",
        doc: "引擎 addToExpansion：把牌置于武将牌上并打记号（gaintag 槽里写字符串，宏自动裹成数组）",
        source: "标准包 忠义",
        slots: [
            W("角色"),
            R("cards", "置于武将牌上的牌", "cards"),
            O("gaintag", "牌的记号（一般同技能 id）", "string"),
            O("source", "牌的来源", "player"),
            O("animate", "动画（give / gain2 / draw）", "string"),
            O("delay", "是否延迟", "expr"),
            O("log", "录入日志", "expr"),
            O("fromStorage", "牌来自标记", "expr"),
            O("bySelf", "牌来自自己", "expr")
        ]
    },
    {
        name: "ask_bool",
        cn: "询问是否",
        group: "询问与代价",
        doc: "chooseBool 询问是否，按选择分支（不写 prompt 就是引擎默认问法）",
        source: "标准包 洛神（是否再次发动）",
        slots: [W("被询问的角色"), O("prompt", "询问文字", "string"), S("yes", "选是时"), S("no", "选否时")]
    },
    {
        name: "ask_discard",
        cn: "令其弃牌否则…",
        group: "询问与代价",
        doc: "chooseToDiscard 令角色弃牌，按「弃了没有」分支；#no 里写「否则」的后果",
        source: "标准包 骁果 / 刚烈 / 同疾",
        slots: [
            W("弃牌的角色"),
            O("num", "张数（不写＝1）", "number"),
            O("prompt", "询问文字", "string"),
            O("position", "指定的区域", "string"),
            O("forced", "必须选择", "expr"),
            O("filterCard", "筛牌条件（对象或 @ts 函数）", "expr"),
            S("yes", "弃置成功时"),
            S("no", "未弃置时（后果写这里）")
        ]
    },
    {
        name: "ask_target",
        cn: "询问目标（cost 用）",
        group: "询问与代价",
        doc: "chooseTarget 选目标，结果写进 event.result（content 里读 event.targets / event.target）",
        source: "标准包 受身 / 刚烈3 / 突袭 / 流离",
        slots: [
            W("选择的角色"),
            O("prompt", "询问文字（get prompt2(event skill)）", "string"),
            O("filterTarget", "筛选函数/对象（lib filter notMe 或 @ts 箭头）", "expr"),
            O("selectTarget", "数量（数字或 [min,max]）", "expr"),
            O("forced", "必须选择", "expr")
        ]
    },
    {
        name: "ask_card",
        cn: "询问牌（cost 用）",
        group: "询问与代价",
        doc: "chooseCard 选牌，结果写进 event.result（content 里读 event.cards）",
        source: "标准包 鬼才 / 同疾",
        slots: [
            W("选牌的角色"),
            O("prompt", "询问文字", "string"),
            O("filterCard", "筛牌条件", "expr"),
            O("position", "指定的区域（hs / he / hej …）", "string"),
            O("selectCard", "张数", "expr"),
            O("forced", "必须选择", "expr")
        ]
    },
    {
        name: "cost",
        cn: "询问结果作为代价",
        group: "询问与代价",
        doc: "把一次询问/选择的结果写进 event.result —— 官方 cost 的标准写法",
        source: "标准包 八个 cost（骁果 / 受身 / 突袭 / 鬼才 …）",
        slots: [R("call", "询问调用（player chooseToDiscard({ selectCard: [2, 2] })）", "call")]
    },
    {
        name: "ask_guanxing",
        cn: "观星",
        group: "询问与代价",
        doc: "chooseToGuanxing 观星，按「有没有动牌」分支（引擎只有位置参数，num/prompt 必填）",
        source: "标准包 观星",
        slots: [
            W("观星的角色"),
            R("num", "观看的张数", "number"),
            R("prompt", "提示文字", "string"),
            S("moved", "有移动牌时"),
            S("stay", "没有移动牌时（通常加临时技）")
        ]
    },
    {
        name: "temp_skill",
        cn: "临时获得技能",
        group: "技能与标记",
        doc: "addTempSkill：获得技能，到期失效（引擎只有位置参数）",
        source: "标准包 裸衣 / 洛衣 / 忠义 / 激将",
        slots: [W("角色"), R("id", "技能 id", "string"), R("until", "失效时机（phaseUseEnd / phaseEnd / roundStart …）", "string")]
    },
    {
        name: "add_skills",
        cn: "获得技能",
        group: "技能与标记",
        doc: "addSkills：获得一组技能（走技能获得流程）",
        source: "标准包 战神",
        slots: [W("角色"), R("ids", "技能 id 数组", "expr")]
    },
    {
        name: "remove_skill",
        cn: "失去技能",
        group: "技能与标记",
        doc: "removeSkill：移去一个技能",
        source: "标准包 激将3",
        slots: [W("角色"), R("id", "技能 id", "string")]
    },
    {
        name: "mark",
        cn: "获得标记",
        group: "技能与标记",
        doc: "addMark：给角色加标记（引擎只有位置参数）",
        source: "标准包 王尊",
        slots: [W("角色"), R("id", "标记名（一般同技能 id）", "string"), R("num", "数量", "number")]
    },
    {
        name: "unmark",
        cn: "移除标记",
        group: "技能与标记",
        doc: "removeMark：移除标记",
        source: "标记类技能的回收用",
        slots: [W("角色"), R("id", "标记名", "string"), R("num", "数量", "number")]
    },
    {
        name: "awaken",
        cn: "记为已发动",
        group: "技能与标记",
        doc: "awakenSkill：把限定技/觉醒技记为已发动",
        source: "标准包 忠义 / 战神",
        slots: [W("角色"), R("id", "技能 id / event name", "expr")]
    },
    {
        name: "num_up",
        cn: "事件数值 +n",
        group: "事件修正",
        doc: "trigger.num += n（摸牌数、伤害数…）",
        source: "标准包 英姿 / 罗衣2 / 忠义2",
        slots: [R("num", "增加量", "number")]
    },
    {
        name: "num_down",
        cn: "事件数值 -n",
        group: "事件修正",
        doc: "trigger.num -= n",
        source: "标准包 裸衣",
        slots: [R("num", "减少量", "number")]
    },
    {
        name: "base_damage_up",
        cn: "伤害基数 +n",
        group: "事件修正",
        doc: "trigger.baseDamage += n（桃的回复基数、此【杀】伤害+1）",
        source: "标准包 救援 / 忠义2",
        slots: [R("num", "增加量", "number")]
    },
    {
        name: "cancel",
        cn: "取消事件",
        group: "事件修正",
        doc: "trigger.cancel()：取消触发事件（跳过阶段等）",
        source: "标准包 克己 / 激将",
        slots: []
    },
    {
        name: "to_zero",
        cn: "数值归零",
        group: "事件修正",
        doc: "trigger.changeToZero()：把触发事件的数值归零（放弃摸牌）",
        source: "标准包 突袭",
        slots: []
    },
    {
        name: "retarget",
        cn: "转移目标",
        group: "事件修正",
        doc: "把「使用牌指定目标」事件里的目标由 #from 换成 #to（改 triggeredTargets2 / targets）",
        source: "标准包 同疾 / 流离",
        slots: [R("from", "原目标", "player"), R("to", "新目标", "player")]
    },
    {
        name: "line",
        cn: "指示线",
        group: "杂项",
        doc: "画一条指示线（引擎 line(target, config) 只有位置参数）",
        source: "标准包 遗计 / 机捷",
        slots: [W("起点角色"), R("target", "终点角色", "player"), R("color", "颜色（例 green）", "string")]
    },
    {
        name: "gain_multiple",
        cn: "多人各拿一张",
        group: "杂项",
        doc: "一次从多名角色处各获得指定区域的牌（引擎 gainMultiple(targets, position) 只有位置参数）",
        source: "标准包 突袭",
        slots: [W("获得牌的角色"), R("targets", "被拿牌的角色们", "expr"), R("position", "牌区记号", "string")]
    }
];

export default CONTENT_MACROS;
