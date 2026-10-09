// ============================================================================
// 技能标签字典（纯数据 + 纯逻辑，零全局挂载）
//
// 来源：旧版技能编辑器
//   · 「技能标签」页九页：module/editor/skill/editor.mjs:972-1030 的 TAG_TYPE_LIST
//   · 「特殊设置」页四组：editor.mjs:1159-1231（uniqueList，按已选标签出现）
//   · 标签 → 产物字段的映射：skill/editor/organize.mjs:265-324 的 skillTag()
//     与 :327-344 的 init()
//
// 新版与旧版的三处差异（2026-10 按用户要求改）：
//   1. **按技能种类过滤**：「选角色」页只给主动技 + 自由技能（TARGET_PAGE_KINDS）。
//      依据：引擎里 deadTarget / includeOut / multitarget / complexTarget 只出现在 enable
//      类技能的选目标流程里（例：standard/skill.js 的 lijian、bingshi/skill.js 的 potdimeng），
//      触发技不选目标。宏侧同步：@skill_trigger / @skill_mod / @skill_group 不再声明这 4 个槽。
//   2. 「自定义」页并进「发动」页：usable / round 两个芯片带 − / + 记数器（产物 `#usable: n`），
//      面板底部那个全局 n 输入框已下线。
//   3. 「特殊设置」不再单独一页：势力 / 技能动画 / 宗族 / 主将·副将四组拆开挂在对应标签旁的
//      **小齿轮 ⚙** 上（SPECIAL_TAG_GROUPS），点齿轮弹小面板选具体值。
//
// 照旧的两条铁律：
//   1. **不校验冲突** —— 同时选 locked 与 locked-false 也照写；只对「特殊设置」的四个前缀
//      做互斥（group- / animation- / clan- / mainVice-，见 SPECIAL_TAG_PREFIXES）。
//   2. 标签的载体 = skill-type.shya 里技能宏的**类型化槽**；面板把选中的标签写成源码里的
//      `#槽: 值` 行，包在 //#tags-begin … //#tags-end 托管区里（见 writeTagRegion）。
//      托管区之外手写的标签槽一律不碰——值型槽例外，就地改那一行（replaceInlineSlot）。
// ============================================================================

/** 托管区标记：面板维护的标签行都夹在这两行之间 */
export const TAG_REGION_BEGIN = "//#tags-begin";
export const TAG_REGION_END = "//#tags-end";

/** 托管区首行上写的提示（用户手改会被面板覆盖） */
export const TAG_REGION_NOTE = "本区由标签面板维护，手改会被覆盖";

/** 「每回合限n次 / 每n轮限一次」里 n 的取值范围（旧版 range 对话框同款） */
export const TAG_NUMBER_MIN = 1;
export const TAG_NUMBER_MAX = 20;

/**
 * 技能标签槽：skill-type.shya 里**每个技能宏**都声明的槽（顺序即产物里的顺序）。
 * 槽名就是产物字段名（`init` 例外，它产出一个 init 方法）。
 * @type {Array<{ name: string, type: string }>}
 */
export const TAG_SLOTS = [
    { name: "forced", type: "Bool?" },
    { name: "frequent", type: "Bool?" },
    { name: "direct", type: "Bool?" },
    { name: "forceDie", type: "Bool?" },
    { name: "locked", type: "Bool?" },
    { name: "persevereSkill", type: "Bool?" },
    { name: "charlotte", type: "Bool?" },
    { name: "superCharlotte", type: "Bool?" },
    { name: "limited", type: "Bool?" },
    { name: "juexingji", type: "Bool?" },
    { name: "dutySkill", type: "Bool?" },
    { name: "skillAnimation", type: "Bool?" },
    { name: "zhuSkill", type: "Bool?" },
    { name: "zhuanhuanji", type: "Bool?" },
    { name: "hiddenSkill", type: "Bool?" },
    { name: "clanSkill", type: "Bool?" },
    { name: "sunbenSkill", type: "Bool?" },
    { name: "chargeSkill", type: "Bool?" },
    { name: "zhenfa", type: "Bool?" },
    { name: "mainSkill", type: "Bool?" },
    { name: "viceSkill", type: "Bool?" },
    { name: "preHidden", type: "expr?" },
    { name: "deadTarget", type: "Bool?" },
    { name: "includeOut", type: "Bool?" },
    { name: "multitarget", type: "Bool?" },
    { name: "complexTarget", type: "Bool?" },
    { name: "lose", type: "Bool?" },
    { name: "discard", type: "Bool?" },
    { name: "delay", type: "Bool?" },
    { name: "complexCard", type: "Bool?" },
    { name: "mark", type: "Bool?" },
    { name: "multiline", type: "Bool?" },
    { name: "firstDo", type: "Bool?" },
    { name: "lastDo", type: "Bool?" },
    { name: "usable", type: "Num?" },
    { name: "round", type: "Num?" },
    { name: "groupSkill", type: "Str?" },
    { name: "animationColor", type: "Str?" },
    { name: "init", type: "stmt" }
];

/**
 * 只有「选角色」页用到的 4 个槽：宏侧只在主动技与自由技能里声明它们
 * （@skill_trigger / @skill_mod / @skill_group 已删除这 4 个槽，写了会编译报错）。
 * @type {string[]}
 */
export const TARGET_ONLY_SLOTS = ["deadTarget", "includeOut", "multitarget", "complexTarget"];

/**
 * 会「选目标」的技能种类：主动技 + 自由技能（自由技能什么都能写，所以也算上）。
 * 只有这些种类的面板显示「选角色」页，也只有它们的宏声明 TARGET_ONLY_SLOTS。
 * @type {string[]}
 */
export const TARGET_PAGE_KINDS = ["phaseUse", "chooseToUse", "chooseToRespond", "useRespond", "viewAs", "raw"];

/**
 * 某个技能种类能用的标签槽（顺序与 TAG_SLOTS 一致）。
 * @param {string} kind SKILL_KINDS 的 key
 * @returns {Array<{ name: string, type: string }>}
 */
export function slotsForKind(kind) {
    if (TARGET_PAGE_KINDS.includes(kind)) return TAG_SLOTS.slice();
    return TAG_SLOTS.filter(slot => !TARGET_ONLY_SLOTS.includes(slot.name));
}

/**
 * 旧版「技能标签」页：九页（「自定义」页已并进「发动」页），页名/顺序照抄 TAG_TYPE_LIST。
 * 带 kinds 的页只在那些种类下显示（没写 kinds = 所有种类都显示）。
 * 每项 key 即标签内部键，name 是旧版按钮文字，hint 说明它产出的字段。
 * @type {Array<{ key: string, name: string, description: string, tags: Array<{key:string,name:string,hint:string}> }>}
 */
export const TAG_PAGES = [
    {
        key: "fadong",
        name: "发动",
        description: "发动方式与次数限制",
        tags: [
            { key: "forced", name: "强制发动", hint: "产物 forced: true" },
            { key: "frequent", name: "自动发动", hint: "产物 frequent: true" },
            { key: "direct", name: "直接发动", hint: "产物 direct: true" },
            { key: "forceDie", name: "死亡可发动", hint: "产物 forceDie: true" },
            { key: "usable", name: "每回合限n次", hint: "产物 usable: n；点芯片旁的 − / + 调次数", counter: "usable" },
            { key: "round", name: "每n轮限一次", hint: "产物 round: n；点芯片旁的 − / + 调次数", counter: "round" }
        ]
    },
    {
        key: "fangfengyin",
        name: "防封印",
        description: "被封印 / 失效时的行为",
        tags: [
            { key: "locked", name: "锁定技", hint: "产物 locked: true" },
            { key: "locked-false", name: "非锁定技", hint: "产物 locked: false" },
            { key: "persevereSkill", name: "持恒技", hint: "产物 persevereSkill: true" },
            { key: "charlotte", name: "Charlotte", hint: "产物 charlotte: true" },
            { key: "superCharlotte", name: "superCharlotte", hint: "产物 superCharlotte: true" }
        ]
    },
    {
        key: "xianding",
        name: "限定",
        description: "限定 / 觉醒 / 使命 / 动画",
        tags: [
            { key: "limited", name: "限定技", hint: "产物 limited: true" },
            { key: "juexingji", name: "觉醒技", hint: "产物 juexingji: true" },
            { key: "dutySkill", name: "使命技", hint: "产物 dutySkill: true" },
            { key: "skillAnimation", name: "技能动画", hint: "产物 skillAnimation: true（配合特殊设置的动画色）" }
        ]
    },
    {
        key: "biaoqian",
        name: "标签",
        description: "技能身份标记",
        tags: [
            { key: "zhuSkill", name: "主公技", hint: "产物 zhuSkill: true" },
            { key: "zhuanhuanji", name: "转换技", hint: "产物 zhuanhuanji: true" },
            { key: "hiddenSkill", name: "隐匿技", hint: "产物 hiddenSkill: true" },
            { key: "clanSkill", name: "宗族技", hint: "产物 clanSkill: true（宗族归属在武将卡上设）" },
            { key: "groupSkill", name: "势力技", hint: "产物 groupSkill: \"势力id\"（值在特殊设置里选）" },
            { key: "sunbenSkill", name: "昂扬技", hint: "产物 sunbenSkill: true" },
            { key: "chargeSkill", name: "蓄力技", hint: "产物 chargeSkill: true" }
        ]
    },
    {
        key: "guozhan",
        name: "国战",
        description: "国战专用标记",
        tags: [
            { key: "zhenfa", name: "阵法技", hint: "产物 zhenfa: true" },
            { key: "mainSkill", name: "主将技", hint: "产物 mainSkill: true" },
            { key: "viceSkill", name: "副将技", hint: "产物 viceSkill: true" },
            { key: "preHidden", name: "技能预亮", hint: "产物 preHidden: true" }
        ]
    },
    {
        key: "xuanjuese",
        name: "选角色",
        description: "选目标角色的范围与数量（只有主动技与自由技能会选目标，其余种类不显示本页）",
        kinds: TARGET_PAGE_KINDS,
        tags: [
            { key: "deadTarget", name: "死亡角色可选", hint: "产物 deadTarget: true" },
            { key: "includeOut", name: "离场角色可选", hint: "产物 includeOut: true" },
            { key: "multitarget", name: "多名角色", hint: "产物 multitarget: true" },
            { key: "complexTarget", name: "复合选角色", hint: "产物 complexTarget: true" }
        ]
    },
    {
        key: "xuanpai",
        name: "选牌",
        description: "选牌时的额外行为",
        tags: [
            { key: "lose-false", name: "不失去牌", hint: "产物 lose: false" },
            { key: "discard-false", name: "不弃置牌", hint: "产物 discard: false" },
            { key: "complexCard", name: "复合选卡牌", hint: "产物 complexCard: true" }
        ]
    },
    {
        key: "qita",
        name: "其他",
        description: "标记与触发顺序",
        tags: [
            { key: "mark", name: "标记持续显示", hint: "产物 mark: true" },
            { key: "multiline", name: "多指示线", hint: "产物 multiline: true" },
            { key: "firstDo", name: "最先触发", hint: "产物 firstDo: true" },
            { key: "lastDo", name: "最后触发", hint: "产物 lastDo: true" }
        ]
    }
];

/**
 * 按技能种类取可显示的标签页（没写 kinds 的页所有种类都能看）。
 * @param {string} kind SKILL_KINDS 的 key；空串（认不出种类）按最保守处理，不给「选角色」
 * @returns {typeof TAG_PAGES}
 */
export function tagPagesForKind(kind) {
    return TAG_PAGES.filter(page => !page.kinds || page.kinds.includes(kind));
}

/** 动画色（旧版 editor.mjs:1178-1185；前缀 animation- 在特殊设置里互斥） */
const ANIMATION_TAGS = [
    { key: "animation-fire", name: "燎原动画", hint: "产物 animationColor: \"fire\"" },
    { key: "animation-wood", name: "绿茵动画", hint: "产物 animationColor: \"wood\"" },
    { key: "animation-water", name: "清波动画", hint: "产物 animationColor: \"water\"" },
    { key: "animation-thunder", name: "紫电动画", hint: "产物 animationColor: \"thunder\"" },
    { key: "animation-orange", name: "柑橘动画", hint: "产物 animationColor: \"orange\"" },
    { key: "animation-metal", name: "素金动画", hint: "产物 animationColor: \"metal\"" }
];

/**
 * 宗族（旧版 editor.mjs:1187-1194）。
 * ⚠️ 旧版 skillTag() 里**根本没有 clan- 的产物**：选了宗族只进 uniqueList（用于互斥），
 * 生成代码时被丢掉。这里照旧——选中它只写一行注释，不发明引擎里没有的字段。
 */
const CLAN_TAGS = [
    { key: "clan-陈留吴氏", name: "陈留吴氏", hint: "旧版无产物；宗族归属由武将卡设定" },
    { key: "clan-颍川荀氏", name: "颍川荀氏", hint: "旧版无产物；宗族归属由武将卡设定" },
    { key: "clan-颍川韩氏", name: "颍川韩氏", hint: "旧版无产物；宗族归属由武将卡设定" },
    { key: "clan-太原王氏", name: "太原王氏", hint: "旧版无产物；宗族归属由武将卡设定" },
    { key: "clan-颍川钟氏", name: "颍川钟氏", hint: "旧版无产物；宗族归属由武将卡设定" }
];

/** 主将/副将（旧版 editor.mjs:1167-1171）：产物是 init 方法里的阴阳鱼减半个 */
const MAIN_VICE_TAGS = [
    { key: "mainVice-remove1", name: "阴阳鱼减半个", hint: "产物 init(player, skill) 里按主/副将判定后 player removeMaxHp()" }
];

/** 势力组的额外成员（旧版 editor.mjs:1173 的 [...lib.group, "key", "western"]） */
const GROUP_EXTRA = ["key", "western"];

/**
 * 「特殊设置」四组（旧版 editor.mjs:1159-1231）：
 * 出现条件 = 面板**已选标签**里命中 requires 中的任一项（不是外部传进来的技能类型）。
 */
const SPECIAL_GROUP_META = [
    { key: "mainVice", name: "主将/副将", description: "主将技 / 副将技的额外处理", requires: ["mainSkill", "viceSkill"], staticTags: MAIN_VICE_TAGS },
    { key: "group", name: "势力", description: "势力技的归属势力", requires: ["groupSkill"], dynamic: "group" },
    { key: "animation", name: "技能动画", description: "技能发动动画的颜色", requires: ["skillAnimation"], staticTags: ANIMATION_TAGS },
    { key: "clan", name: "宗族", description: "宗族技归属（照旧版只做标记）", requires: ["clanSkill"], staticTags: CLAN_TAGS }
];

/** 特殊标签的互斥前缀（旧版 findPrefix 的四个前缀） */
export const SPECIAL_TAG_PREFIXES = ["group-", "animation-", "clan-", "mainVice-"];

/**
 * 哪几个标签带「齿轮 ⚙」：点开就是旧版「特殊设置」页的那一组候选
 * （面板里不再有独立的「特殊设置」页）。
 * @type {Array<{ tag: string, group: string }>}
 */
export const SPECIAL_TAG_GROUPS = [
    { tag: "mainSkill", group: "mainVice" },
    { tag: "viceSkill", group: "mainVice" },
    { tag: "groupSkill", group: "group" },
    { tag: "skillAnimation", group: "animation" },
    { tag: "clanSkill", group: "clan" }
];

/**
 * 这个标签有没有齿轮；有就返回它对应的特殊设置组 key，没有返回空串。
 * @param {string} tagKey
 * @returns {string}
 */
export function specialGroupForTag(tagKey) {
    const meta = SPECIAL_TAG_GROUPS.find(item => item.tag === tagKey);
    return meta ? meta.group : "";
}

/**
 * **值型单行槽**：宏体里手写了这些槽时，面板改值可以就地换掉那一行
 * （典型场景：@skill_phaseUse 模板自带 `#usable: 1`，芯片旁的 − / + 调到 3 必须写进源码）。
 * 其余槽仍按「宏体里写过了就跳过」处理，绝不碰手写内容。
 * @type {string[]}
 */
export const INLINE_REPLACEABLE_SLOTS = ["usable", "round", "locked", "lose", "discard", "delay", "groupSkill", "animationColor"];

function toSet(keys) {
    if (keys instanceof Set) return keys;
    return new Set(Array.isArray(keys) ? keys : []);
}

function clampNumber(value, fallback = TAG_NUMBER_MIN) {
    const num = Math.round(Number(value));
    if (!Number.isFinite(num)) return fallback;
    return Math.max(TAG_NUMBER_MIN, Math.min(TAG_NUMBER_MAX, num));
}

/** 去掉字符串两端的引号（`"wei"` → `wei`），顺带处理 JSON 转义 */
export function unquote(text) {
    const raw = String(text || "").trim();
    if (raw.length >= 2 && (raw[0] === '"' || raw[0] === "'") && raw[raw.length - 1] === raw[0]) {
        try {
            return raw[0] === '"' ? JSON.parse(raw) : raw.slice(1, -1);
        } catch (err) {
            return raw.slice(1, -1);
        }
    }
    return raw;
}

/**
 * 标签键 → 它落在哪个槽上。**同一个槽只允许写一条**（`usable-1` 与 `usable-n` 是两条标签、
 * 一个槽），面板据此避免在源码里留两条互相矛盾的槽。
 * 返回空串表示「不产槽」（宗族标签只写注释）。
 * @param {string} key
 * @returns {string}
 */
export function tagSlotName(key) {
    const name = String(key || "");
    if (name === "usable-1" || name === "usable-n") return "usable";
    if (name === "round-1" || name === "round-n") return "round";
    if (name === "locked-false") return "locked";
    if (name === "lose-false") return "lose";
    if (name === "discard-false") return "discard";
    if (name === "delay-false") return "delay";
    if (name.startsWith("group-")) return "groupSkill";
    if (name.startsWith("animation-")) return "animationColor";
    if (name.startsWith("clan-")) return "";
    if (name === "mainVice-remove1") return "init";
    return name;
}

/**
 * 宏体里**托管区之外**已经写过的槽名（面板据此跳过，不在源码里留重复槽）
 * @param {string} source
 * @returns {Set<string>}
 */
export function inlineTagSlots(source) {
    const slots = new Set();
    for (const key of inlineTagKeys(source)) {
        const slot = tagSlotName(key);
        if (slot) slots.add(slot);
    }
    return slots;
}

/**
 * 该标签要写进源码的行（旧版 skillTag() 的映射）。
 * 返回空数组表示「这个标签不产字段」（宗族组会返回一行注释）。
 * @param {string} key 标签内部键
 * @param {{ skillId?: string, main?: boolean, vice?: boolean, numbers?: { usable?: number, round?: number } }} [options]
 * @returns {string[]} 行文本（不含缩进）
 */
export function lineFromTag(key, options = {}) {
    const numbers = options.numbers || {};
    //「发动」页的两个次数标签：n 由芯片旁的 − / + 决定（旧版的 usable-1 / usable-n 仍照收）
    if (key === "usable" || key === "usable-1" || key === "usable-n") return [`#usable: ${clampNumber(numbers.usable)}`];
    if (key === "round" || key === "round-1" || key === "round-n") return [`#round: ${clampNumber(numbers.round)}`];
    if (key === "locked-false") return ["#locked: false"];
    if (key === "lose-false") return ["#lose: false"];
    if (key === "discard-false") return ["#discard: false"];
    if (key === "delay-false") return ["#delay: false"];
    if (key.startsWith("group-")) return [`#groupSkill: ${JSON.stringify(key.slice(6))}`];
    if (key === "groupSkill") {
        // 页上的「势力技」本身没有值：具体势力点芯片旁的 ⚙ 选（旧版是「特殊设置」页）。
        // 单独选它时写一行注释，既说明去处、也能被面板读回来。
        return ['// 势力技：点旁边的 ⚙ 选一个具体势力（产物 groupSkill: "wei"）'];
    }
    if (key.startsWith("animation-")) return [`#animationColor: ${JSON.stringify(key.slice(10))}`];
    if (key.startsWith("clan-")) return [`// 宗族：${key.slice(5)}（照旧版不产字段；宗族归属由武将卡设定）`];
    if (key === "mainVice-remove1") {
        const id = String(options.skillId || "");
        const conds = [];
        if (options.main !== false) conds.push(`player checkMainSkill(${JSON.stringify(id)})`);
        if (options.vice) conds.push(`(player checkViceSkill(${JSON.stringify(id)}) && !player viceChanged)`);
        if (!conds.length) conds.push(`player checkMainSkill(${JSON.stringify(id)})`);
        return ["#init:", `  if (${conds.join(" || ")}) player removeMaxHp()`];
    }
    if (!key) return [];
    return [`#${key}: true`];
}

/**
 * 一组标签 → 写进源码的行（顺序：九页按 TAG_PAGES 顺序，特殊标签按四组顺序）。
 * @param {Iterable<string>} keys
 * @param {object} [options] 透传给 lineFromTag
 * @returns {string[]}
 */
export function linesFromTags(keys, options = {}) {
    const chosen = toSet(keys);
    const out = [];
    const usedSlots = new Set();
    const hasGroupChild = [...chosen].some(key => String(key).startsWith("group-"));
    /** 一个槽只写一条（同槽只保留 TAG_PAGES 顺序里先出现的那个标签） */
    const push = key => {
        const slot = tagSlotName(key);
        if (slot && usedSlots.has(slot)) return;
        const lines = lineFromTag(key, options);
        if (!lines.length) return;
        if (slot) usedSlots.add(slot);
        out.push(...lines);
    };
    for (const page of TAG_PAGES) {
        for (const tag of page.tags) {
            if (!chosen.has(tag.key)) continue;
            // 选了具体势力时，`#groupSkill: "wei"` 那行已经把「势力技」表达清楚了
            if (tag.key === "groupSkill" && hasGroupChild) continue;
            push(tag.key);
        }
    }
    for (const meta of SPECIAL_GROUP_META) {
        if (!meta.staticTags) continue;
        for (const tag of meta.staticTags) {
            if (chosen.has(tag.key)) push(tag.key);
        }
    }
    for (const key of chosen) {
        if (String(key).startsWith("group-")) push(key);
    }
    return out.filter(line => line !== "");
}

/**
 * 一行源码 → 标签内部键（lineFromTag 的反函数；认不出来返回 ""）
 * @param {string} line
 * @returns {string}
 */
export function tagFromSlotLine(line) {
    const text = String(line || "").trim();
    const clan = /^\/\/\s*宗族：(.+?)[（(]/.exec(text);
    if (clan) return `clan-${clan[1]}`;
    if (/^\/\/\s*势力技：/.test(text)) return "groupSkill";
    const matched = /^#([A-Za-z_$][\w$]*)\s*:\s*(.*?)\s*,?$/.exec(text);
    if (!matched) return "";
    const slot = matched[1];
    const value = matched[2].trim();
    if (slot === "init") return "mainVice-remove1";
    if (slot === "usable") return "usable";
    if (slot === "round") return "round";
    if (slot === "groupSkill") return unquote(value) ? `group-${unquote(value)}` : "";
    if (slot === "animationColor") return unquote(value) ? `animation-${unquote(value)}` : "";
    if (value === "false" && (slot === "locked" || slot === "lose" || slot === "discard" || slot === "delay")) return `${slot}-false`;
    if (value === "true") return slot;
    // 其它值（`#preHidden: ["a", "b"]` 这种手写形态）：槽名本身是标签槽就按该槽记，
    // 这样面板能认出「这个槽已经写过了」，不会再补一条同名槽。
    if (TAG_SLOTS.some(item => item.name === slot)) return slot;
    return "";
}

/** 标签行里的数字（`#usable: 3` → 3），没有返回 0 */
function numberFromSlotLine(line) {
    const matched = /^#(?:usable|round)\s*:\s*(\d+)/.exec(String(line || "").trim());
    return matched ? Number(matched[1]) : 0;
}

/** 特殊标签隐含它的父标签：`#groupSkill: "wei"` 也意味着「势力技」被选中 */
const IMPLIED_PARENTS = { "group-": "groupSkill", "animation-": "skillAnimation", "clan-": "clanSkill" };
function withImpliedTags(tags) {
    for (const prefix of Object.keys(IMPLIED_PARENTS)) {
        if ([...tags].some(key => String(key).startsWith(prefix))) tags.add(IMPLIED_PARENTS[prefix]);
    }
    return tags;
}

/**
 * 托管区里的标签行 → { tags, numbers }
 * @param {string[]} lines
 * @returns {{ tags: Set<string>, numbers: { usable: number, round: number } }}
 */
export function tagsFromTagLines(lines) {
    const tags = new Set();
    const numbers = { usable: TAG_NUMBER_MIN, round: TAG_NUMBER_MIN };
    for (const line of Array.isArray(lines) ? lines : []) {
        const key = tagFromSlotLine(line);
        if (!key) continue;
        tags.add(key);
        const num = numberFromSlotLine(line);
        if (key === "usable" || key === "usable-n" || key === "usable-1") numbers.usable = num || numbers.usable;
        if (key === "round" || key === "round-n" || key === "round-1") numbers.round = num || numbers.round;
    }
    return { tags: withImpliedTags(tags), numbers };
}

/**
 * 源码里 usable / round 的当前值（**托管区里的行 + 宏体里手写的值型槽都算**）。
 * 面板打开 / 换模板后靠它把芯片旁的次数摆对——只读托管区的话，模板自带或用户手写的
 * `#usable: 3` 会读不回来，点一次「写入标签」就把 3 改回 1。
 * @param {string} source
 * @returns {{ usable: number, round: number }}
 */
export function tagNumbersFromSource(source) {
    const numbers = { usable: TAG_NUMBER_MIN, round: TAG_NUMBER_MIN };
    const call = findMacroCall(String(source || ""));
    if (!call) return numbers;
    const body = String(source).slice(call.bodyStart, call.bodyEnd);
    for (const line of body.split(/\r?\n/)) {
        const matched = /^#(usable|round)\s*:\s*(\d+)/.exec(line.trim());
        if (matched) numbers[matched[1]] = clampNumber(matched[2]);
    }
    return numbers;
}

/**
 * 宏体里**托管区之外**手写的标签槽 → 标签键。
 * 用途：① 重开面板时能认出模板里本来就有的 `#usable: 1`；② 写托管区时跳过它们，
 * 不在源码里留两条同名槽（同名槽编译器不报错、后者胜，但两条互相矛盾很坑）。
 * @param {string} source
 * @returns {Set<string>}
 */
export function inlineTagKeys(source) {
    const text = String(source || "");
    const call = findMacroCall(text);
    if (!call) return new Set();
    const region = readTagRegion(text);
    const inRegion = new Set(region ? region.lines.map(line => line.trim()) : []);
    const slotNames = new Set(TAG_SLOTS.map(slot => slot.name));
    const keys = new Set();
    for (const line of text.slice(call.bodyStart, call.bodyEnd).split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("#") || inRegion.has(trimmed)) continue;
        const slot = /^#([A-Za-z_$][\w$]*)\s*:/.exec(trimmed);
        if (!slot || !slotNames.has(slot[1])) continue;
        const key = tagFromSlotLine(trimmed);
        if (key) keys.add(key);
    }
    return withImpliedTags(keys);
}

/**
 * 特殊设置页：按已选标签决定显示哪几组（旧版 editor.mjs:1167-1195 的行为）
 * @param {object} lib 引擎 lib（读 lib.group / lib.translate）
 * @param {Iterable<string>} chosenTags 面板已选标签
 * @returns {Array<{key:string,name:string,description:string,tags:Array<{key:string,name:string,hint:string}>}>}
 */
export function getSpecialGroups(lib, chosenTags = []) {
    const chosen = toSet(chosenTags);
    return SPECIAL_GROUP_META.filter(meta => meta.requires.some(tag => chosen.has(tag))).map(meta => {
        if (meta.dynamic === "group") {
            const groups = [...((lib && lib.group) || []), ...GROUP_EXTRA];
            const tags = [...new Set(groups)].map(group => ({
                key: `group-${group}`,
                name: `${(lib && lib.translate && lib.translate[group]) || group}势力`,
                hint: `产物 groupSkill: "${group}"`
            }));
            return { key: meta.key, name: meta.name, description: meta.description, tags };
        }
        return { key: meta.key, name: meta.name, description: meta.description, tags: meta.staticTags };
    }).filter(group => group.tags.length > 0);
}

// ============================================================================
// 源码里的标签托管区：定位最外层 @skill_* 宏调用 → 在它的花括号内维护
//   //#tags-begin
//   #forced: true
//   //#tags-end
// 花括号配对会跳过 // 行注释、/* 块注释与三种字符串，避免被 `}` / `{` 骗到。
// ============================================================================

const MACRO_CALL = /@skill_[A-Za-z_]\w*[ \t]*\{/;

/** 跳过一段字符串字面量，返回结束引号的下标（未闭合返回文末） */
function skipQuoted(text, start) {
    const quote = text[start];
    let i = start + 1;
    while (i < text.length) {
        const ch = text[i];
        if (ch === "\\") {
            i += 2;
            continue;
        }
        if (ch === quote) return i;
        i++;
    }
    return text.length - 1;
}

/** 花括号配对（from 是 `{` 之后的下标），返回配对的 `}` 下标，失败 -1 */
function matchBrace(text, from) {
    let depth = 1;
    for (let i = from; i < text.length; i++) {
        const ch = text[i];
        if (ch === "/" && text[i + 1] === "/") {
            const nl = text.indexOf("\n", i);
            if (nl < 0) return -1;
            i = nl;
            continue;
        }
        if (ch === "/" && text[i + 1] === "*") {
            const end = text.indexOf("*/", i + 2);
            if (end < 0) return -1;
            i = end + 1;
            continue;
        }
        if (ch === '"' || ch === "'" || ch === "`") {
            i = skipQuoted(text, i);
            continue;
        }
        if (ch === "{") depth++;
        else if (ch === "}") {
            depth--;
            if (!depth) return i;
        }
    }
    return -1;
}

/**
 * 找到源码里第一个 `@skill_xxx { … }` 调用的括号位置
 * @param {string} source
 * @returns {{ start: number, bodyStart: number, bodyEnd: number, indent: string } | null}
 */
export function findMacroCall(source) {
    const text = String(source || "");
    const matched = MACRO_CALL.exec(text);
    if (!matched) return null;
    const bodyStart = matched.index + matched[0].length;
    const bodyEnd = matchBrace(text, bodyStart);
    if (bodyEnd < 0) return null;
    const after = text.slice(bodyStart);
    const lineStart = /^[ \t]*\r?\n([ \t]*)/.exec(after);
    const sameLine = /^([ \t]*)/.exec(after);
    const indent = lineStart ? lineStart[1] : sameLine[1];
    return { start: matched.index, bodyStart, bodyEnd, indent };
}

/**
 * 读源码里的标签托管区
 * @param {string} source
 * @returns {{ start: number, end: number, indent: string, lines: string[] } | null}
 */
export function readTagRegion(source) {
    const text = String(source || "");
    const begin = text.indexOf(TAG_REGION_BEGIN);
    if (begin < 0) return null;
    const endMarker = text.indexOf(TAG_REGION_END, begin);
    if (endMarker < 0) return null;
    const lineStart = text.lastIndexOf("\n", begin) + 1;
    const lineEndOfBegin = text.indexOf("\n", begin);
    let end = text.indexOf("\n", endMarker);
    end = end < 0 ? text.length : end + 1;
    const inner = text.slice(lineEndOfBegin < 0 ? begin : lineEndOfBegin + 1, endMarker);
    const markerIndent = /^([ \t]*)/.exec(text.slice(lineStart))[1] || "";
    const lines = inner
        .split(/\r?\n/)
        .map(line => (markerIndent && line.startsWith(markerIndent) ? line.slice(markerIndent.length) : line))
        .filter(line => line.trim() !== "");
    return { start: lineStart, end, indent: markerIndent, lines };
}

function regionText(lines, indent) {
    const body = [TAG_REGION_BEGIN, ...lines, TAG_REGION_END].map(line => `${indent}${line}`);
    return body.join("\n");
}

/**
 * 把标签行写进源码（托管区存在则整块替换，不存在则插到宏体开头）。
 * 返回给 textarea 用的替换区间：`replaceRange(start, end, text)`。
 * 找不到 `@skill_* { … }` 时返回 ok:false（**不乱插**，让调用方提示用户）。
 * @param {string} source
 * @param {string[]} lines 不含缩进的标签行
 * @returns {{ ok: true, start: number, end: number, text: string } | { ok: false, reason: string }}
 */
export function writeTagRegion(source, lines) {
    const text = String(source || "");
    const list = (Array.isArray(lines) ? lines : []).filter(line => String(line).trim() !== "");
    const existing = readTagRegion(text);
    if (existing) {
        return { ok: true, start: existing.start, end: existing.end, text: `${regionText(list, existing.indent)}\n` };
    }
    if (!list.length) return { ok: true, start: 0, end: 0, text: "" };
    const call = findMacroCall(text);
    if (!call) {
        return { ok: false, reason: "源码里没有 @skill_* { … } 技能宏调用：先用上面的「技能种类」插入模板，再写入标签" };
    }
    return { ok: true, start: call.bodyStart, end: call.bodyStart, text: `\n${regionText(list, call.indent)}` };
}

/**
 * 把标签行写进**宏体里手写的那一行**的位置（值型单行槽就地替换）。
 * 用途：模板自带 `#usable: 1` 时，面板把次数调到 3 必须改掉源码里那一行
 * （只写托管区会被「同槽去重」挡掉，次数落不进源码）。
 * @param {string} source
 * @param {string} slot 槽名（INLINE_REPLACEABLE_SLOTS 里的）
 * @param {string[]} lines 新的行（不含缩进）
 * @returns {{ ok: true, start: number, end: number, text: string } | { ok: false, reason: string }}
 */
export function replaceInlineSlot(source, slot, lines) {
    const text = String(source || "");
    const next = (Array.isArray(lines) ? lines : []).filter(line => String(line).trim() !== "");
    if (!next.length) return { ok: false, reason: "没有要写入的行" };
    const call = findMacroCall(text);
    if (!call) return { ok: false, reason: "源码里没有 @skill_* { … } 技能宏调用" };
    const region = readTagRegion(text);
    const inRegion = new Set(region ? region.lines.map(line => line.trim()) : []);
    const body = text.slice(call.bodyStart, call.bodyEnd);
    let offset = -1;
    let indent = call.indent;
    for (const match of body.matchAll(/^([ \t]*)#([A-Za-z_$][\w$]*)\s*:[^\n]*$/gm)) {
        if (match[2] !== slot) continue;
        if (inRegion.has(match[0].trim())) continue;
        offset = call.bodyStart + match.index;
        indent = match[1] || call.indent;
        break;
    }
    if (offset < 0) return { ok: false, reason: `宏体里没有手写的 #${slot} 槽` };
    const lineBreak = text.indexOf("\n", offset);
    return {
        ok: true,
        start: offset,
        end: lineBreak < 0 ? text.length : lineBreak,
        text: next.map(line => `${indent}${line}`).join("\n")
    };
}

/**
 * 删掉托管区（返回 textarea 替换区间；没有托管区时 ok:false）
 * @param {string} source
 * @returns {{ ok: true, start: number, end: number, text: string } | { ok: false, reason: string }}
 */
export function clearTagRegion(source) {
    const text = String(source || "");
    const existing = readTagRegion(text);
    if (!existing) return { ok: false, reason: "源码里没有标签托管区" };
    return { ok: true, start: existing.start, end: existing.end, text: "" };
}
