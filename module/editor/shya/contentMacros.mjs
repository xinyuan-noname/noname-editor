/**
 * contentMacros —— `host/skill-content.shya` 的槽表（纯数据模块）
 *
 * 用途：给「像旧版选择模式那样」的对话框/代码生成器当数据源 —— 一个宏 = 一条，
 * 一个插槽 = 一个可填字段（中文标签 + 类型 + 是否必填），生成源码时按
 * `@宏名 { #槽: 值 … }` 拼即可（值槽必填、语句槽留空即整块消失）。
 *
 * 与 host/skill-content.shya 一一对应，**禁止单边改动**：
 * `_x19D6_backup/tools/skill-content-check.mjs` 会核对两边（宏名、槽名、顺序、
 * stmt/值槽区分）不漂移，漂了就报错。
 *
 * type 取值（对话框按此决定控件）：
 *   player   角色表达式（player / trigger source / event target …）
 *   cards    牌数组表达式（trigger cards / event cards …）
 *   number   数字（摸几张、几点伤害）
 *   string   字符串（提示语、时机、技能 id）
 *   expr     任意表达式（筛选函数、动画名、区域记号…）
 *   stmt     语句体（分支槽，可省略）
 *   call     调用片段（@cost 专用：`player chooseToDiscard(1, "…")`）
 */

/** 分组顺序（对话框的页签顺序） */
export const CONTENT_MACRO_GROUPS = ["判定", "效果", "牌的处理", "询问与代价", "技能与标记", "事件修正", "杂项"];

/** 每个宏的槽表；slots 顺序 = skill-content.shya 里的声明顺序 */
export const CONTENT_MACROS = [
    {
        name: "judge_color",
        cn: "判定看颜色",
        group: "判定",
        doc: "令角色判定，按判定牌颜色分支。结果在 judge_color_result（.card/.suit/.color/.judge/.bool）",
        source: "标准包 铁骑 / 洛神",
        slots: [
            { slot: "who", cn: "判定的角色", type: "player", required: true },
            { slot: "red", cn: "红色时", type: "stmt" },
            { slot: "black", cn: "黑色时", type: "stmt" },
            { slot: "none", cn: "无色时", type: "stmt" }
        ]
    },
    {
        name: "judge_bool",
        cn: "判定看成败",
        group: "判定",
        doc: "令角色用 #judge 评分函数判定，按成败分支（自动设置 judge2，判定动画与官方一致）。结果在 judge_bool_result",
        source: "标准包 刚烈 / 铁骑 / 洛神 / 鬼才",
        slots: [
            { slot: "who", cn: "判定的角色", type: "player", required: true },
            { slot: "judge", cn: "判定评分函数（@ts 箭头：正数算成功）", type: "expr", required: true },
            { slot: "yes", cn: "判定成功时", type: "stmt" },
            { slot: "no", cn: "判定失败时", type: "stmt" }
        ]
    },
    {
        name: "judge_suit",
        cn: "判定看花色",
        group: "判定",
        doc: "令角色判定，按花色分支；#other 是 default 分支。结果在 judge_suit_result。“只关心红桃”时只写 #heart",
        source: "标准包 刚烈（红桃）/ 铁骑（黑桃，主公技）",
        slots: [
            { slot: "who", cn: "判定的角色", type: "player", required: true },
            { slot: "heart", cn: "红桃时", type: "stmt" },
            { slot: "diamond", cn: "方片时", type: "stmt" },
            { slot: "club", cn: "梅花时", type: "stmt" },
            { slot: "spade", cn: "黑桃时", type: "stmt" },
            { slot: "other", cn: "其它（default）", type: "stmt" }
        ]
    },
    {
        name: "draw",
        cn: "摸牌",
        group: "效果",
        doc: "令角色摸 #num 张牌",
        source: "标准包 英姿 / 闭月 / 连营 / 苦肉",
        slots: [
            { slot: "who", cn: "摸牌的角色", type: "player", required: true },
            { slot: "num", cn: "张数", type: "number", required: false, default: 1 }
        ]
    },
    {
        name: "damage",
        cn: "造成伤害",
        group: "效果",
        doc: "令角色受到 #num 点伤害；属性伤害/无来源等写法直呼引擎 `target damage(2, \"fire\")`",
        source: "标准包 骁果 / 刚烈 / 反间",
        slots: [
            { slot: "who", cn: "受到伤害的角色", type: "player", required: true },
            { slot: "num", cn: "伤害点数", type: "number", required: false, default: 1 }
        ]
    },
    {
        name: "recover",
        cn: "回复体力",
        group: "效果",
        doc: "令角色回复 #num 点体力",
        source: "标准包 结姻 / 青囊 / 苦肉",
        slots: [
            { slot: "who", cn: "回复的角色", type: "player", required: true },
            { slot: "num", cn: "点数", type: "number", required: false, default: 1 }
        ]
    },
    {
        name: "lose_hp",
        cn: "失去体力",
        group: "效果",
        doc: "令角色失去 #num 点体力（不是伤害）",
        source: "标准包 苦肉 / 裸衣 / 战神",
        slots: [
            { slot: "who", cn: "失去体力的角色", type: "player", required: true },
            { slot: "num", cn: "点数", type: "number", required: false, default: 1 }
        ]
    },
    {
        name: "lose_max_hp",
        cn: "失去体力上限",
        group: "效果",
        doc: "令角色失去 #num 点体力上限",
        source: "标准包 战神",
        slots: [
            { slot: "who", cn: "角色", type: "player", required: true },
            { slot: "num", cn: "点数", type: "number", required: false, default: 1 }
        ]
    },
    {
        name: "discard",
        cn: "弃置牌",
        group: "牌的处理",
        doc: "把 #cards 弃置（置入弃牌堆）",
        source: "标准包 离间 / 流离 / 苦肉",
        slots: [
            { slot: "who", cn: "弃牌的角色", type: "player", required: true },
            { slot: "cards", cn: "弃置的牌", type: "cards", required: true }
        ]
    },
    {
        name: "gain",
        cn: "获得牌",
        group: "牌的处理",
        doc: "令角色获得 #cards，#anim 是动画名：gain2 一般式 / gain 涌出 / draw 背面 / give / giveAuto",
        source: "标准包 奸雄 / 天妒 / 遗计 / 洛神",
        slots: [
            { slot: "who", cn: "获得牌的角色", type: "player", required: true },
            { slot: "cards", cn: "获得的牌", type: "cards", required: true },
            { slot: "anim", cn: "动画名", type: "string", required: false, default: "gain2" }
        ]
    },
    {
        name: "give",
        cn: "给出牌",
        group: "牌的处理",
        doc: "把 #cards 交给 #target",
        source: "标准包 仁德",
        slots: [
            { slot: "who", cn: "给牌的角色", type: "player", required: true },
            { slot: "cards", cn: "给出的牌", type: "cards", required: true },
            { slot: "target", cn: "接收的角色", type: "player", required: true }
        ]
    },
    {
        name: "take_card",
        cn: "获得他人的牌",
        group: "牌的处理",
        doc: "引擎 gainPlayerCard：从 #from 的 #position 区获得牌，#forced 为 true 表示必须选。结果在 take_card_result",
        source: "标准包 反馈 / 反间",
        slots: [
            { slot: "who", cn: "获得牌的角色", type: "player", required: true },
            { slot: "from", cn: "被拿牌的角色", type: "player", required: true },
            { slot: "position", cn: "牌区记号（he / e / h …）", type: "string", required: false, default: "he" },
            { slot: "forced", cn: "是否必须选择", type: "expr", required: false, default: false }
        ]
    },
    {
        name: "discard_card",
        cn: "弃置他人的牌",
        group: "牌的处理",
        doc: "引擎 discardPlayerCard：弃置 #from 的 #position 区一张牌。结果在 discard_card_result",
        source: "过河拆桥类（标准包内 0 处）",
        slots: [
            { slot: "who", cn: "弃牌的角色", type: "player", required: true },
            { slot: "from", cn: "被弃牌的角色", type: "player", required: true },
            { slot: "position", cn: "牌区记号", type: "string", required: false, default: "he" },
            { slot: "forced", cn: "是否必须选择", type: "expr", required: false, default: false }
        ]
    },
    {
        name: "to_discardpile",
        cn: "失去牌至弃牌堆",
        group: "牌的处理",
        doc: "把 #cards 直接置入弃牌堆（不是「弃置」，没有弃置来源语义）",
        source: "标准包 忠义（移去武将牌上的牌）",
        slots: [
            { slot: "who", cn: "失去牌的角色", type: "player", required: true },
            { slot: "cards", cn: "失去的牌", type: "cards", required: true }
        ]
    },
    {
        name: "to_expansion",
        cn: "置于武将牌上",
        group: "牌的处理",
        doc: "引擎 addToExpansion：把 #cards 置于武将牌上并打上 #tag 记号",
        source: "标准包 忠义",
        slots: [
            { slot: "who", cn: "角色", type: "player", required: true },
            { slot: "cards", cn: "置于武将牌上的牌", type: "cards", required: true },
            { slot: "anim", cn: "动画名", type: "string", required: false, default: "give" },
            { slot: "tag", cn: "牌的记号（一般同技能 id）", type: "string", required: true }
        ]
    },
    {
        name: "ask_bool",
        cn: "询问是否",
        group: "询问与代价",
        doc: "chooseBool 询问是否，按选择分支。结果在 ask_bool_result",
        source: "标准包 洛神（是否再次发动）",
        slots: [
            { slot: "who", cn: "被询问的角色", type: "player", required: true },
            { slot: "text", cn: "询问文字", type: "string", required: true },
            { slot: "yes", cn: "选是时", type: "stmt" },
            { slot: "no", cn: "选否时", type: "stmt" }
        ]
    },
    {
        name: "ask_discard",
        cn: "令其弃牌否则…",
        group: "询问与代价",
        doc: "chooseToDiscard 令角色弃置 #num 张牌，按「弃了没有」分支。结果在 ask_discard_result",
        source: "标准包 骁果 / 刚烈 / 同疾",
        slots: [
            { slot: "who", cn: "弃牌的角色", type: "player", required: true },
            { slot: "num", cn: "张数", type: "number", required: false, default: 1 },
            { slot: "prompt", cn: "询问文字", type: "string", required: true },
            { slot: "yes", cn: "弃置成功时", type: "stmt" },
            { slot: "no", cn: "未弃置时（后果写这里）", type: "stmt" }
        ]
    },
    {
        name: "ask_target",
        cn: "询问目标（cost 用）",
        group: "询问与代价",
        doc: "chooseTarget 选目标，结果写进 event.result（content 里读 event.targets / event.target）",
        source: "标准包 受身 / 刚烈3 / 突袭 / 流离",
        slots: [
            { slot: "who", cn: "选择的角色", type: "player", required: true },
            { slot: "prompt", cn: "询问文字（get prompt2(event skill)）", type: "string", required: true },
            { slot: "filter", cn: "筛选函数/对象（lib filter notMe 或 @ts 箭头）", type: "expr", required: true }
        ]
    },
    {
        name: "ask_card",
        cn: "询问牌（cost 用）",
        group: "询问与代价",
        doc: "chooseCard 选牌，结果写进 event.result（content 里读 event.cards）",
        source: "标准包 鬼才 / 同疾",
        slots: [
            { slot: "who", cn: "选牌的角色", type: "player", required: true },
            { slot: "position", cn: "牌区记号（hs / he / hej …）", type: "string", required: true },
            { slot: "prompt", cn: "询问文字", type: "string", required: true },
            { slot: "filter", cn: "筛牌条件", type: "expr", required: true }
        ]
    },
    {
        name: "cost",
        cn: "询问结果作为代价",
        group: "询问与代价",
        doc: "把一次询问/选择的结果写进 event.result —— 官方 cost 的标准写法",
        source: "标准包 八个 cost（骁果 / 受身 / 突袭 / 鬼才 …）",
        slots: [{ slot: "call", cn: "询问调用（player chooseToDiscard(1, \"…\")）", type: "call", required: true }]
    },
    {
        name: "ask_guanxing",
        cn: "观星",
        group: "询问与代价",
        doc: "chooseToGuanxing 观星。结果在 guanxing_result（.bool / .moved）",
        source: "标准包 观星",
        slots: [
            { slot: "who", cn: "观星的角色", type: "player", required: true },
            { slot: "num", cn: "观看的张数", type: "number", required: true },
            { slot: "prompt", cn: "提示文字", type: "string", required: true }
        ]
    },
    {
        name: "temp_skill",
        cn: "临时获得技能",
        group: "技能与标记",
        doc: "addTempSkill：获得 #id，#until 是失效时机（phaseUseEnd / phaseEnd / phaseJieshuBegin / roundStart）",
        source: "标准包 裸衣 / 洛衣 / 忠义 / 激将",
        slots: [
            { slot: "who", cn: "角色", type: "player", required: true },
            { slot: "id", cn: "技能 id", type: "string", required: true },
            { slot: "until", cn: "失效时机", type: "string", required: true }
        ]
    },
    {
        name: "add_skills",
        cn: "获得技能",
        group: "技能与标记",
        doc: "addSkills：获得一组技能（走技能获得流程）",
        source: "标准包 战神",
        slots: [
            { slot: "who", cn: "角色", type: "player", required: true },
            { slot: "ids", cn: "技能 id 数组", type: "expr", required: true }
        ]
    },
    {
        name: "remove_skill",
        cn: "失去技能",
        group: "技能与标记",
        doc: "removeSkill：移去一个技能",
        source: "标准包 激将3",
        slots: [
            { slot: "who", cn: "角色", type: "player", required: true },
            { slot: "id", cn: "技能 id", type: "string", required: true }
        ]
    },
    {
        name: "mark",
        cn: "获得标记",
        group: "技能与标记",
        doc: "addMark：给角色加 #num 个标记",
        source: "标准包 王尊",
        slots: [
            { slot: "who", cn: "角色", type: "player", required: true },
            { slot: "id", cn: "标记名（一般同技能 id）", type: "string", required: true },
            { slot: "num", cn: "数量", type: "number", required: false, default: 1 }
        ]
    },
    {
        name: "unmark",
        cn: "移除标记",
        group: "技能与标记",
        doc: "removeMark：移除 #num 个标记",
        source: "标记类技能的回收用",
        slots: [
            { slot: "who", cn: "角色", type: "player", required: true },
            { slot: "id", cn: "标记名", type: "string", required: true },
            { slot: "num", cn: "数量", type: "number", required: false, default: 1 }
        ]
    },
    {
        name: "awaken",
        cn: "记为已发动",
        group: "技能与标记",
        doc: "awakenSkill：把限定技/觉醒技记为已发动（#id 一般是 event name）",
        source: "标准包 忠义 / 战神",
        slots: [
            { slot: "who", cn: "角色", type: "player", required: true },
            { slot: "id", cn: "技能 id / event name", type: "expr", required: true }
        ]
    },
    {
        name: "num_up",
        cn: "事件数值 +n",
        group: "事件修正",
        doc: "trigger.num += n（摸牌数、伤害数…）",
        source: "标准包 英姿 / 罗衣2 / 忠义2",
        slots: [{ slot: "num", cn: "增加量", type: "number", required: false, default: 1 }]
    },
    {
        name: "num_down",
        cn: "事件数值 -n",
        group: "事件修正",
        doc: "trigger.num -= n",
        source: "标准包 裸衣",
        slots: [{ slot: "num", cn: "减少量", type: "number", required: false, default: 1 }]
    },
    {
        name: "base_damage_up",
        cn: "伤害基数 +n",
        group: "事件修正",
        doc: "trigger.baseDamage += n（桃的回复基数、此【杀】伤害+1）",
        source: "标准包 救援 / 忠义2",
        slots: [{ slot: "num", cn: "增加量", type: "number", required: false, default: 1 }]
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
        slots: [
            { slot: "from", cn: "原目标", type: "player", required: true },
            { slot: "to", cn: "新目标", type: "player", required: true }
        ]
    },
    {
        name: "line",
        cn: "指示线",
        group: "杂项",
        doc: "画一条指示线（#color 例 green）",
        source: "标准包 遗计 / 机捷",
        slots: [
            { slot: "who", cn: "起点角色", type: "player", required: true },
            { slot: "target", cn: "终点角色", type: "player", required: true },
            { slot: "color", cn: "颜色", type: "string", required: false, default: "green" }
        ]
    },
    {
        name: "gain_multiple",
        cn: "多人各拿一张",
        group: "杂项",
        doc: "一次从多名角色处各获得指定区域的牌（gainMultiple）",
        source: "标准包 突袭",
        slots: [
            { slot: "who", cn: "获得牌的角色", type: "player", required: true },
            { slot: "targets", cn: "被拿牌的角色们", type: "expr", required: true },
            { slot: "position", cn: "牌区记号", type: "string", required: false, default: "h" }
        ]
    }
];

export default CONTENT_MACROS;
