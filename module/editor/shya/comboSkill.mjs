/**
 * 组合技生成：工具栏「组合」按钮背后的纯逻辑（不碰 lib/game/ui，可单独自检）。
 *
 * 为什么要有：**一个技能草稿只编辑一个技能文件**（「插到光标处」已按需求去掉），
 * 于是「组合技」不再是一种技能种类模板，而是一次**引用多个已有技能**的动作：
 * 组合技本体只挂 `group`（+ `preHidden`），真实效果仍在被引用的子技里 ——
 * 官方「无双」（character/standard/skill.js:1991）与「龙胆」（:1277）就是这个形状，
 * 原来的 `@skill_group` 最简模板也是 group + preHidden，因此这一版顺势把「组合技」种类按钮删掉。
 *
 * 子技仍旧是**独立技能 / 独立草稿**：组合技不搬源码、不删草稿，只引用它们的 id，
 * 这样每个技能依旧可单独编辑、单独「生成」、单独落盘成 `<工作区>/src/shya/<id>.shya`。
 */

/** 组合技至少要引用几个技能 */
export const COMBO_MIN_CHILDREN = 2;

/** 技能 id 的合法形状（产物里当标识符用，与生成代码的规矩一致） */
const SKILL_ID = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * 技能 id 是否合法（组合技自己的 id 必须合法；被引用的子技 id 只当字符串写进 group，不做限制）
 * @param {string} id
 * @returns {boolean}
 */
export function isValidSkillId(id) {
    return SKILL_ID.test(String(id || "").trim());
}

/**
 * 可被组合引用的技能 = 技能草稿库里**有 id** 的那些（按工作区过滤，与侧栏「技」列表同口径）。
 * `generated` = 这个 id 已经在 `lib.skill` 里（没「生成」过的草稿引用过去会落空，界面上给提示但不拦）。
 * @param {object} config
 * @param {Object<string, object>} [config.drafts] 技能库 `{ 草稿编号: 记录 }`
 * @param {object} [config.skillTable] lib.skill
 * @param {string} [config.workspace] 当前工作区（空 = 不过滤）
 * @param {string} [config.excludeId] 当前草稿自己的 id（不能引用自己）
 * @returns {Array<{ id: string, name: string, draftKey: string, generated: boolean, label: string }>}
 */
export function comboCandidates({ drafts = {}, skillTable = {}, workspace = "", excludeId = "" } = {}) {
    const seen = new Set();
    const list = [];
    Object.entries(drafts || {}).forEach(([draftKey, record]) => {
        const id = String((record && record.id) || "").trim();
        if (!id || id === excludeId || seen.has(id)) return;
        const owner = String((record && record.workspace) || "");
        //未归属的旧草稿照常显示（与侧栏列表一致）
        if (workspace && owner && owner !== workspace) return;
        seen.add(id);
        const name = String((record && record.name) || "").trim();
        const generated = Boolean(skillTable && skillTable[id]);
        list.push({
            id,
            name,
            draftKey,
            generated,
            label: `${name ? `${name}（${id}）` : id}${generated ? "" : " · 未生成"}`
        });
    });
    return list.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * `<noname-dialog type="search-select">` 的 payload：键 = 技能 id，值 = 显示文字
 * @param {Array<{ id: string, label: string }>} [candidates]
 * @returns {Object<string, string>}
 */
export function comboChoiceMap(candidates = []) {
    const map = {};
    (candidates || []).forEach(item => {
        if (item && item.id) map[item.id] = item.label || item.id;
    });
    return map;
}

/**
 * 给组合技起个默认 id：`combo_<子技…>`；太长就退成 `combo_<n>skill`，撞名就加序号。
 * @param {string[]} [children] 被引用的技能 id
 * @param {string[]} [taken] 已被占用的 id（lib.skill 的键 + 草稿里的 id）
 * @returns {string}
 */
export function suggestComboId(children = [], taken = []) {
    const used = new Set((taken || []).map(text => String(text)));
    const parts = (children || [])
        .map(text => String(text).replace(/[^0-9A-Za-z_]/g, ""))
        .filter(Boolean);
    let base = parts.length ? `combo_${parts.join("_")}` : "combo";
    if (base.length > 40 || !SKILL_ID.test(base)) base = `combo_${parts.length || 0}skill`;
    if (!SKILL_ID.test(base)) base = "combo";
    let candidate = base;
    let index = 2;
    while (used.has(candidate)) candidate = `${base}_${index++}`;
    return candidate;
}

/**
 * 组合技源码：本体只挂引用（group + preHidden），真实效果在被引用的子技里。
 * @param {object} config
 * @param {string} config.id 组合技自己的技能 id
 * @param {string} [config.name] 技能名（产物 translation）
 * @param {string[]} [config.children] 被引用的技能 id
 * @param {"cn"|"en"} [config.lang] 用哪套宏名 / 插槽名（与编辑器当前的模板语言一致）
 * @returns {string}
 */
export function buildComboSource({ id = "", name = "", children = [], lang = "cn" } = {}) {
    const list = (children || []).map(child => JSON.stringify(String(child))).join(", ");
    const title = String(name || "").trim() || "组合技";
    //⚠️ 注释里不要写 `@`——标签面板按「源码里第一个 @xxx」推断技能种类（component-shyaEditor.mjs:panelKind）
    const comment = "// 组合技：本体只挂引用，效果在被引用的子技里（官方「无双」同形）";
    if (lang === "en") {
        return [
            comment,
            "@skill_group {",
            `  #skill: ${id}`,
            `  #translation: ${JSON.stringify(title)}`,
            `  #group: [${list}]`,
            `  #preHidden: [${list}]`,
            "}",
            ""
        ].join("\n");
    }
    return [
        comment,
        "@组合技 {",
        `  #技能: ${id}`,
        `  #名称: ${JSON.stringify(title)}`,
        `  #技能组: [${list}]`,
        `  #技能预亮: [${list}]`,
        "}",
        ""
    ].join("\n");
}
