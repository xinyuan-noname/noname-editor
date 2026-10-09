/**
 * 中英双语技能模板的「宏名 / 插槽名」对照表（**唯一真相源**）。
 *
 * 为什么另做一份中文宏库、而不是写一层转发宏：实测「薄转发」在 shya 里走不通——
 *   `macro @触发技(...) { @skill_trigger { #skill: #技能 } }`
 *   → `MAC013 宏 @skill_trigger 展开为多条语句，只能用作语句`（嵌套调用被当表达式实例化）
 *   → 省略可选插槽时 `MAC015 #translation 需要 Str，传入的是 Block`（空槽转发成了 Block）
 * 所以中文库由 `_x19D6_backup/tools/gen-cn-host.mjs` **从英文库机械改名生成**（文件头写「勿手改」），
 * 改名依据就是本文件；`cn-host-check.mjs` 负责「重跑生成 = 磁盘内容」与结构对齐。
 *
 * ⚠️ 只改「宏名 + 插槽名」，**产物字段名一律不动**：
 *   `<名称>translation: #名称,</名称>` —— 作用域名与引用名换成中文，`translation` 这个引擎字段还是英文。
 */

/** 技能种类 key ↔ 英文宏名（顺序与 skillTemplates.mjs 的 SKILL_KINDS 一致） */
export const MACRO_BY_KIND = {
    trigger: "skill_trigger",
    phaseUse: "skill_phaseUse",
    chooseToUse: "skill_chooseToUse",
    chooseToRespond: "skill_chooseToRespond",
    useRespond: "skill_useRespond",
    viewAs: "skill_viewAs",
    mod: "skill_mod",
    group: "skill_group",
    raw: "skill_raw"
};

/**
 * 英文宏名 → 中文宏名（技能类型宏 + 内容宏 + 三个内部辅助宏）。
 * 内部辅助宏（`__skill*`）只被宏库自己的宏体调用，同样改成中文，保持整份库统一。
 */
export const MACRO_CN = {
    // 技能类型宏
    skill_trigger: "触发技",
    skill_phaseUse: "出牌阶段技",
    skill_chooseToUse: "使用技",
    skill_chooseToRespond: "打出技",
    skill_useRespond: "使用打出技",
    skill_viewAs: "视为技",
    skill_mod: "规则技",
    skill_group: "组合技",
    skill_raw: "自由技能",
    // 内部辅助宏
    __skillTriggerValue: "__技能时机值",
    __skillAiValue: "__技能智能值",
    __skillEnableValue: "__技能启用值",
    // 内容宏：判定
    judge_color: "判定颜色",
    judge_bool: "判定真假",
    judge_suit: "判定花色",
    // 内容宏：效果
    draw: "摸牌",
    damage: "造成伤害",
    recover: "回复体力",
    lose_hp: "失去体力",
    lose_max_hp: "失去上限",
    // 内容宏：牌
    discard: "弃置",
    gain: "获得",
    give: "交给",
    take_card: "拿牌",
    discard_card: "弃牌",
    to_discardpile: "置入弃牌堆",
    to_expansion: "移出游戏",
    // 内容宏：询问与代价
    ask_bool: "问是否",
    ask_discard: "问弃牌",
    ask_target: "问目标",
    ask_card: "问选牌",
    cost: "问代价",
    ask_guanxing: "观星",
    // 内容宏：技能与标记
    temp_skill: "临时技能",
    add_skills: "添加技能",
    remove_skill: "移除技能",
    mark: "加标记",
    unmark: "去标记",
    awaken: "觉醒",
    // 内容宏：事件修正
    num_up: "加一",
    num_down: "减一",
    base_damage_up: "伤害基数加一",
    cancel: "取消事件",
    to_zero: "归零",
    retarget: "改目标",
    // 内容宏：杂项
    line: "指示线",
    gain_multiple: "多人拿牌"
};

/**
 * 英文插槽名 → 中文插槽名。
 * 技能标签那一批**沿用「技能标签」面板上的中文名**（`tags.mjs:TAG_PAGES`），
 * 免得同一个概念在面板与源码里两种叫法。两个引擎内部标记没有公认中文名，保持原样。
 *
 * ⚠️ `ai` / `enable` / `t` 三个槽**故意不列在这里**（保持英文），原因是一个实测到的编译器缺陷：
 *   它们被三个内部辅助宏（`@__技能智能值` / `@__技能启用值` / `@__技能时机值`）用在 `@ts{ #槽 }` 里，
 *   而 `makeTsRaw()`（`shya/src/macro.cpp:889-896`）扫 `#槽名` 用的是 `std::isalnum`——**ASCII-only**：
 *   中文槽名扫不出来，`#触发值` 会原样漏进产物（实测 `trigger: { player: #触发值 }`）。
 *   库的注释本来就要求「宏体里裸写 `#槽`，不要用 `@ts{}` 包」，所以只有这三个内部槽受影响。
 *   两行补丁（把 `>= 0x80` 也当标识符字符，与 lexer 的 `isIdentStart` 一致）已在交付说明里报给 shya 侧；
 *   补上并重建 wasm 之后，这三个也可以跟着译成中文（届时删掉本段、在表里加三条即可）。
 */
export const SLOT_CN = {
    // ── 骨架 ──
    skill: "技能",
    translation: "名称",
    description: "描述",
    init: "初始化",
    trigger: "时机",
    filter: "条件",
    check: "询问",
    cost: "代价",
    content: "效果",
    mod: "规则",
    viewAs: "视为",
    viewAsFilter: "视为筛选",
    object: "对象",
    group: "技能组",
    // ── 标签（名字与标签面板一致）──
    forced: "强制发动",
    frequent: "自动发动",
    direct: "直接发动",
    forceDie: "死亡可发动",
    locked: "锁定技",
    persevereSkill: "持恒技",
    charlotte: "Charlotte",
    superCharlotte: "superCharlotte",
    limited: "限定技",
    juexingji: "觉醒技",
    dutySkill: "使命技",
    skillAnimation: "技能动画",
    zhuSkill: "主公技",
    zhuanhuanji: "转换技",
    hiddenSkill: "隐匿技",
    clanSkill: "宗族技",
    groupSkill: "势力技",
    sunbenSkill: "昂扬技",
    chargeSkill: "蓄力技",
    zhenfa: "阵法技",
    mainSkill: "主将技",
    viceSkill: "副将技",
    preHidden: "技能预亮",
    deadTarget: "死亡角色可选",
    includeOut: "离场角色可选",
    multitarget: "多名角色",
    complexTarget: "复合选角色",
    lose: "不失去牌",
    discard: "不弃置牌",
    delay: "延时",
    complexCard: "复合选卡牌",
    mark: "标记持续显示",
    multiline: "多指示线",
    firstDo: "最先触发",
    lastDo: "最后触发",
    usable: "次数",
    round: "轮次",
    animationColor: "动画颜色",
    // ── 主动技：选牌 / 选目标 ──
    position: "位置",
    prompt: "提示",
    filterCard: "牌条件",
    filterCardValue: "牌值条件",
    selectCard: "选牌",
    filterTarget: "目标条件",
    selectTarget: "选目标",
    // ── 内容宏：角色与数量 ──
    who: "谁",
    num: "数量",
    cards: "牌",
    target: "目标",
    targets: "目标们",
    color: "颜色",
    // ── 内容宏：来源与效果细节 ──
    source: "来源",
    nature: "属性",
    unreal: "虚幻",
    nosource: "无来源",
    nocard: "无牌",
    notrigger: "不触发",
    animate: "播放动画",
    nodelay: "不延时",
    visible: "可见",
    bottom: "底部",
    log: "记录",
    fromStorage: "来自标记",
    bySelf: "由自己",
    notBySelf: "非自己",
    // ── 内容宏：牌的去向与选择 ──
    select: "选择",
    from: "从",
    to: "到",
    insert: "插入",
    blank: "空白",
    gaintag: "牌上标签",
    moved: "动牌分支",
    stay: "不动分支",
    until: "直到",
    discarder: "弃牌者",
    // ── 内容宏：标记与技能 id ──
    id: "标识",
    ids: "标识组",
    call: "调用",
    // ── 内容宏：判定与分支 ──
    judge: "判定",
    red: "红",
    black: "黑",
    heart: "红桃",
    diamond: "方块",
    club: "梅花",
    spade: "黑桃",
    none: "无",
    other: "其他",
    yes: "是",
    no: "否"
};

/** 语言标识（设置项 `templateLang` 的取值） */
export const LANGS = ["cn", "en"];

/**
 * 取宏名（en 原名 → 目标语言）
 * @param {string} name 英文宏名（如 `skill_trigger`）
 * @param {string} lang `"cn"` / `"en"`
 * @returns {string}
 */
export function macroName(name, lang) {
    return lang === "cn" ? (MACRO_CN[name] || name) : name;
}

/**
 * 取插槽名（en 原名 → 目标语言）
 * @param {string} name 英文插槽名（如 `translation`）
 * @param {string} lang `"cn"` / `"en"`
 * @returns {string}
 */
export function slotName(name, lang) {
    return lang === "cn" ? (SLOT_CN[name] || name) : name;
}

/**
 * 技能种类 → 该语言下的宏名
 * @param {string} kind SKILL_KINDS 的 key
 * @param {string} lang
 * @returns {string}
 */
export function macroForKind(kind, lang) {
    return macroName(MACRO_BY_KIND[kind] || "", lang);
}

/** 技能宏的两种写法（标签托管区定位、种类推断都用它） */
export const SKILL_MACRO_NAMES = Object.values(MACRO_BY_KIND).flatMap(en => [en, MACRO_CN[en]]);

/**
 * 中文（或英文）插槽名 → **英文规范名**；认不出的原样返回。
 * 面板内部一律用规范名比对，只在读源码 / 写源码两个边界上换语言。
 * @param {string} name
 * @returns {string}
 */
export function canonicalSlot(name) {
    const text = String(name || "");
    if (Object.prototype.hasOwnProperty.call(SLOT_CN, text)) return text;
    const hit = Object.entries(SLOT_CN).find(([, cn]) => cn === text);
    return hit ? hit[0] : text;
}

/**
 * 宏名（任一语言）→ 技能种类 key；认不出返回 ""
 * @param {string} name 宏名，可带或不带 `@`
 * @returns {string}
 */
export function kindOfMacroName(name) {
    const text = String(name || "").replace(/^@/, "");
    const hit = Object.entries(MACRO_BY_KIND).find(([, en]) => en === text || MACRO_CN[en] === text);
    return hit ? hit[0] : "";
}

/**
 * 从源码判断它用的是哪套插槽（给标签面板决定写哪种槽名）。
 * 只认「宏名」与「常见插槽名」两类强特征，认不出给 ""（调用方回落设置里的默认语言）。
 * @param {string} source
 * @returns {"cn"|"en"|""}
 */
export function langOfSource(source) {
    const text = String(source || "");
    if (/@(?:skill_[A-Za-z]|__skill)/.test(text)) return "en";
    if (/@(?:触发技|出牌阶段技|使用技|打出技|使用打出技|视为技|规则技|组合技|自由技能)/.test(text)) return "cn";
    if (/#(?:skill|translation|trigger|content|filter)\s*:/.test(text)) return "en";
    if (/#(?:技能|名称|时机|效果|条件)\s*:/.test(text)) return "cn";
    return "";
}
