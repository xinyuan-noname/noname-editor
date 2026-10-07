// ============================================================================
// 标签字典（纯数据，零全局挂载）
// 来源：旧版技能编辑器「自由标签」页 skill/editor.mjs:1166-1195
//   - 旧版按技能类型（back.skill.type）决定显示哪些标签组
//   - 旧版对索引 >= 6 的标签默认隐藏（本模块保留该信息，由界面决定如何折叠）
// 字段：key 内部键 / name 中文名 / effect 生成到技能上的效果说明
//      requires 需要技能类型里出现哪些标记才显示该组
// ============================================================================

/** 主将/副将技标签 */
const MAIN_VICE = [
    { key: "mainVice-remove1", name: "阴阳鱼减半个", effect: "阴阳鱼数量减半个" }
];

/** 动画标签（旧版 skillAnimation） */
const ANIMATION = [
    { key: "animation-fire", name: "燎原动画", effect: "技能动画：火" },
    { key: "animation-wood", name: "绿茵动画", effect: "技能动画：木" },
    { key: "animation-water", name: "清波动画", effect: "技能动画：水" },
    { key: "animation-thunder", name: "紫电动画", effect: "技能动画：雷" },
    { key: "animation-orange", name: "柑橘动画", effect: "技能动画：橙" },
    { key: "animation-metal", name: "素金动画", effect: "技能动画：金" }
];

/** 宗族标签（旧版 clanSkill） */
const CLAN = [
    { key: "clan-陈留吴氏", name: "陈留吴氏", effect: "宗族：陈留吴氏" },
    { key: "clan-颍川荀氏", name: "颍川荀氏", effect: "宗族：颍川荀氏" },
    { key: "clan-颍川韩氏", name: "颍川韩氏", effect: "宗族：颍川韩氏" },
    { key: "clan-太原王氏", name: "太原王氏", effect: "宗族：太原王氏" },
    { key: "clan-颍川钟氏", name: "颍川钟氏", effect: "宗族：颍川钟氏" }
];

/**
 * 标签组。dynamic 为 "group" 的组，标签在运行时按 lib.group 展开（见 expandGroupTags）。
 * @type {Array<{key:string,name:string,description:string,requires:string[],dynamic?:string,tags:Array}>}
 */
export const TAG_GROUPS = [
    {
        key: "mainVice",
        name: "主将/副将",
        description: "主将技、副将技相关标签",
        requires: ["mainSkill", "viceSkill"],
        tags: MAIN_VICE
    },
    {
        key: "group",
        name: "势力",
        description: "技能归属势力的标签（势力技 / 兵势）",
        requires: ["groupSkill"],
        dynamic: "group",
        tags: []
    },
    {
        key: "animation",
        name: "技能动画",
        description: "技能发动时的动画效果",
        requires: ["skillAnimation"],
        tags: ANIMATION
    },
    {
        key: "clan",
        name: "宗族",
        description: "宗族技归属",
        requires: ["clanSkill"],
        tags: CLAN
    }
];

/** 旧版默认只显示前 6 个标签，超出的折叠 */
export const TAG_VISIBLE_LIMIT = 6;

/**
 * 势力组按 lib.group 展开
 * @param {object} lib
 * @returns {Array<{key:string,name:string,effect:string}>}
 */
export function expandGroupTags(lib) {
    const groups = [...(lib.group || []), "key", "western"];
    return groups.map(g => ({
        key: `group-${g}`,
        name: `${(lib.translate && lib.translate[g]) || g}势力`,
        effect: `归属势力：${(lib.translate && lib.translate[g]) || g}`
    }));
}

/**
 * 取得在给定技能类型下可见的标签组（含势力组展开）
 * @param {object} lib
 * @param {string[]} skillTypes 技能类型标记，如 ["groupSkill","skillAnimation"]
 * @returns {Array<{key:string,name:string,description:string,tags:Array}>}
 */
export function getVisibleTagGroups(lib, skillTypes = []) {
    const types = Array.isArray(skillTypes) ? skillTypes : [];
    return TAG_GROUPS.filter(group => {
        if (!group.requires || !group.requires.length) return true;
        return group.requires.some(t => types.includes(t));
    }).map(group => {
        if (group.dynamic === "group") {
            return { key: group.key, name: group.name, description: group.description, tags: expandGroupTags(lib) };
        }
        return { key: group.key, name: group.name, description: group.description, tags: group.tags };
    }).filter(group => group.tags.length > 0);
}
