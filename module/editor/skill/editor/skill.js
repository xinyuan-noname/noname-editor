/**
 * @typedef {Object} SkillConfig
 * @property {boolean} contentAsync
 * @property {string} trigger
 * @property {string} content
 * @property {string} filter
 */
/**
 * @type {Map<RegExp,SkillConfig>}
 */
export const editorInbuiltSkillMap = new Map()
//曹操部分
editorInbuiltSkillMap.set(
    /(?<!异步)引入[ ]*(标?奸雄|jianxiong)\n/,
    {
        trigger: `受到伤害后`,
        content: `你 获得牌 造成伤害的牌 亮出式`
    }
);
editorInbuiltSkillMap.set(
    /异步引入[ ]*(标?奸雄|jianxiong)\n/,
    {
        contentAsync: true,
        trigger: `受到伤害后`,
        content: `你 获得牌 造成伤害的牌 亮出式`
    }
);
//夏侯惇
editorInbuiltSkillMap.set(
    /(?<!异步)引入[ ]*(标?刚烈|ganglie)\n/,
    {
        trigger: `受到伤害后`,
        filter: "伤害来源 不为 未定义",
        content: [
            "变量 判定事件 令为 你 判定",
            "判定事件 设置红桃作为判定唯一负收益",
            "判定事件 设置判定生效结果与收益相同",
            "新步骤",
            "如果",
            "判定结果的花色 不为 红桃",
            "那么",
            "分支开始",
            "变量 选择事件 令为 伤害来源 选择弃置手牌 两张",
            "选择事件 设置ai适度弃牌",
            "分支结束",
            "否则",
            "分支开始",
            "事件 结束",
            "分支结束",
            "新步骤",
            "如果",
            "没有选择卡牌",
            "那么",
            "分支开始",
            "伤害来源 受到伤害 一点",
            "分支结束"
        ].join("\n"),
    }
);
editorInbuiltSkillMap.set(
    /异步引入[ ]*(标?刚烈|ganglie)\n/,
    {
        contentAsync: true,
        trigger: `受到伤害后`,
        filter: "伤害来源 不为 未定义",
        content: [
            "变量 判定事件 令为 你 判定",
            "判定事件 设置红桃作为判定唯一负收益",
            "判定事件 设置判定生效结果与收益相同",
            "变量 结果 令为 等待 判定事件 获取事件结果",
            "如果",
            "判定结果的花色 不为 红桃",
            "那么",
            "分支开始",
            "变量 选择事件 令为 伤害来源 选择弃置手牌 两张",
            "选择事件 设置ai适度弃牌",
            "变量 结果 令为 等待 选择事件 获取事件结果",
            "分支结束",
            "否则 返回",
            "如果",
            "没有选择卡牌",
            "那么",
            "分支开始",
            "伤害来源 受到伤害 一点",
            "分支结束"
        ].join("\n"),
    }
);
//司马懿部分
editorInbuiltSkillMap.set(
    /(?<!异步)引入[ ]*(标?反馈|fankui)\n/,
    {
        trigger: `受到伤害后`,
        filter: [
            "伤害点数 大于 0",
            "伤害来源 不为 你",
            "伤害来源 可被获得的牌数 你",
            "大于",
            "0"
        ].join("\n"),
        content: `你 获得角色牌 一张 伤害来源 强制发动`
    }
);
editorInbuiltSkillMap.set(
    /异步引入[ ]*(标?反馈|fankui)\n/,
    {
        contentAsync: true,
        trigger: `受到伤害后`,
        filter: [
            "伤害点数 大于 0",
            "伤害来源 不为 你",
            "伤害来源 可被获得的牌数 你",
            "大于",
            "0"
        ].join("\n"),
        content: `你 获得角色牌 一张 伤害来源 强制发动`
    }
);
//张飞部分
editorInbuiltSkillMap.set(
    /(?<!异步)引入[ ]*(标?咆哮|paoxiao)\n/,
    {
        content: `你使用杀无次数限制`
    }
);
editorInbuiltSkillMap.set(
    /异步引入[ ]*(标?咆哮|paoxiao)\n/,
    {
        contentAsync: true,
        content: `你使用杀无次数限制`
    }
);
//孙权部分
editorInbuiltSkillMap.set(
    /(?<!异步)引入[ ]*(标?制衡|zhiheng)\n/,
    {
        phaseUse: true,
        position: ["h", "e"],
        filter: "你 有牌",
        content: `你 摸牌 牌组 访 长度`,
        filterCard: "任意张",
    }
);
editorInbuiltSkillMap.set(
    /异步引入[ ]*(标?制衡|zhiheng)\n/,
    {
        contentAsync: true,
        phaseUse: true,
        position: ["h", "e"],
        filter: "你 有牌",
        content: `你 摸牌 事件的牌组 访 长度`,
        filterCard: "任意张",
    }
);

//孙策部分
editorInbuiltSkillMap.set(
    /(?<!异步)引入[ ]*(激昂|jiang)\n/,
    {
        trigger: [
            "你 使用牌指定目标后",
            "你 成为牌的目标后"
        ].join("\n"),
        filter: [
            "此牌 为 决斗",
            "或者",
            "此牌 为 杀",
            "并且",
            "此牌 为 红色"
        ].join("\n"),
        content: `你 摸牌`
    }
)
editorInbuiltSkillMap.set(
    /(?<=异步)引入[ ]*(激昂|jiang)\n/,
    {
        contentAsync: true,
        trigger: [
            "你 使用牌指定目标后",
            "你 成为牌的目标后"
        ].join("\n"),
        filter: [
            "此牌 为 决斗",
            "或者",
            "此牌 为 杀",
            "并且",
            "此牌 为 红色"
        ].join("\n"),
        content: `你 摸牌`
    }
)