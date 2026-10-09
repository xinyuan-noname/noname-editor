/**
 * 技能 id 的冲突检测（编译与生成共用一套判据，纯函数、可在 Node 里直接跑）。
 *
 * 为什么要有：`generate()` 会把技能注册进 `lib.skill[id]`——id 撞上游戏本体 / 其它扩展的技能，
 * 或者撞上**另一份技能草稿**，都会静默互相覆盖。原来只在「生成」时拦一道（且只查 lib.skill），
 * 现在提前到**编译**就能在诊断栏里看到，且两份草稿互撞也拦。
 *
 * 判据（用户 2026-10 定稿：**只查 id**，显示名不查）：
 *  ① `lib.skill[id]` 存在，且技能库里没有任何草稿用这个 id → 被本体/其它扩展占用；
 *  ② 技能库里**另一份草稿**（编号不同）用了同一个 id → 两份草稿互盖。
 * 「自己那份草稿」用同一个 id（改完再编译）不算冲突。
 */

/** 诊断码（编译诊断栏里显示，前缀 x19D6 便于辨认不是编译器的码） */
export const DUPLICATE_ID = "x19D6_dup_id";
export const DUPLICATE_DRAFT = "x19D6_dup_draft";

/**
 * @param {object} options
 * @param {string} options.id 本次编译出的技能 id
 * @param {string} [options.draftKey] 当前草稿编号（用同一个 id 的「自己」跳过）
 * @param {object} [options.skillTable] lib.skill
 * @param {object} [options.drafts] 技能库 `{ 编号: 记录 }`
 * @returns {Array<{code: string, severity: "error", message: string}>} 空数组 = 没冲突
 */
export function checkSkillId({ id, draftKey = "", skillTable = {}, drafts = {} } = {}) {
    const skillId = String(id || "").trim();
    if (!skillId) {
        return [{ code: "x19D6_no_id", severity: "error", message: "编译产物里没有技能 id（源码要写 `#技能` / `#skill`）" }];
    }
    const others = Object.entries(drafts).filter(([key, record]) => key !== draftKey && record && record.id === skillId);
    const problems = [];
    const occupied = Boolean(skillTable && skillTable[skillId]);
    if (occupied && !others.length && !(drafts[draftKey] && drafts[draftKey].id === skillId)) {
        problems.push({
            code: DUPLICATE_ID,
            severity: "error",
            message: `技能 id「${skillId}」已被游戏本体或其它扩展占用，换个 id 再生成`
        });
    }
    if (others.length) {
        const seq = others.map(([key]) => (key.match(/^draft-(\d+)$/) || [])[1]).filter(Boolean);
        const where = seq.length ? `编号 #${seq.join("、#")}` : others.map(([key]) => key).join("、");
        problems.push({
            code: DUPLICATE_DRAFT,
            severity: "error",
            message: `另一份技能草稿（${where}）也用这个 id「${skillId}」——两份会被互相覆盖，改掉其中一个`
        });
    }
    return problems;
}

/**
 * 技能能不能拖进武将技能区：**必须已经「生成」过**（`lib.skill` 里真有它）。
 * 没生成过的草稿拖过去只会在技能栏里留一张空卡，所以视图据此决定给不给 `drag-skill`。
 * @param {object} record 技能草稿记录
 * @param {object} [skillTable] lib.skill
 * @returns {boolean}
 */
export function isDraggableSkill(record, skillTable = {}) {
    const id = record && record.id;
    return Boolean(id && skillTable && skillTable[id]);
}
