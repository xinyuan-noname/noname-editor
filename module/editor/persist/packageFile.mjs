/**
 * 生成武将包文件文本（纯函数：不读配置、不碰 lib、不用 this）。
 *
 * 形态**严格对齐游戏本体 `character/standard.js`**：
 *   ① 13 个 `const` 段声明**恒定全出**，顺序与 standard.js 一致：
 *      characters / cards / pinyins / skills / translates / characterTitles /
 *      characterIntro / characterFilters / dynamicTranslates / perfectPairs /
 *      voices / characterSort / characterSortTranslate。
 *      没有内容的段也给单行 `{}`（standard.js 的 cards / characterFilters /
 *      dynamicTranslates / perfectPairs 就是这么写的），**不按空省略**。
 *   ② 返回对象 13 个键，键名与顺序照抄 standard.js。
 *   ③ `skill` 段就是技能定义（引擎 loadCharacter 会写进 lib.skill），
 *      技能的显示名与描述拆进 translate —— 见 persist/skills.mjs 的 readSkillText。
 *
 * 生成的文件是**整文件覆盖**的：改动这里等于改动所有工作区里的 `character/<包id>.js`，
 * 所以字段顺序、缩进、空行都固定下来，重复落盘不会产生无意义的 diff。
 */
import { readSkillText, serializeSkill } from "./skills.mjs";

const EOL = "\n";
const INDENT = "    ";

/**
 * 不写进**武将本体**的草稿字段（各自另有去处，见行内注释）。
 * 注意这里是「不进本体」，不是「不落盘」——title 落进 characterTitles 段。
 */
const EDITOR_ONLY_FIELDS = new Set([
    "id",                 // → characterSort 的成员、character 的对象键
    "extension",          // 编辑器元数据（工作区）
    "packageId",          // → characterSort 外层键
    "characterSort",      // → characterSort 的成员归属
    "characterSortName",  // → characterSortTranslate
    "name",               // → translates
    "intro",              // → characterIntro
    "pinyin",             // → pinyins
    "title",              // → characterTitles（引擎 get.characterTitle 只读 lib.characterTitle）
    "dieAudioText",       // 编辑器里的配音文本，不进本体
    "perfectPair",        // 编辑器字段，本次不接线（段与键仍在，见下）
    "avatar",             // → trashBin
    "dieAudios",          // 扩展侧阵亡语音走 audio/die/<id>N.mp3 约定，不进本体
    "savedAt"             // 编辑器元数据（落盘时间）
]);

/** 空值不写进武将本体（空串 / null / 空数组） */
function hasContent(value) {
    if (value === undefined || value === null || value === "") return false;
    if (Array.isArray(value) && !value.length) return false;
    return true;
}

/**
 * 素材路径归一成 `ext:<工作区相对路径>`。
 * 草稿里可能是 `file:///…` 或 `/extension/…`（<img> 用的形式），
 * 直接写进生成的文件会让路径带上机器相关前缀。
 * @param {string} path
 * @returns {string}
 */
function normalizeAssetPath(path) {
    const text = String(path || "");
    if (!text) return "";
    if (text.startsWith("ext:")) return text;
    const matched = /(?:^|\/)extension\/(.+)$/.exec(text);
    if (matched) return `ext:${matched[1]}`;
    return text;
}

/**
 * 一个草稿 → 武将本体的字段行
 * @param {object} record
 * @returns {string[]}
 */
function characterFieldLines(record) {
    const lines = [];
    for (const [key, value] of Object.entries(record)) {
        if (EDITOR_ONLY_FIELDS.has(key)) continue;
        if (!hasContent(value)) continue;
        const normalized = key === "trashBin" && Array.isArray(value)
            ? value.map(normalizeAssetPath).filter(Boolean)
            : value;
        lines.push(`        ${key}: ${JSON.stringify(normalized)}`);
    }
    return lines;
}

/**
 * `const <name> = { … };`
 * 没有成员时给单行 `{}`——**不要退回空荡荡的三行**，standard.js 里空的段就是 `const cards = {};`。
 * @param {string} name
 * @param {string[]} lines 成员行
 * @returns {string}
 */
function declaration(name, lines) {
    return lines.length ? `const ${name} = {\n${lines.join(",\n")}\n};` : `const ${name} = {};`;
}

/**
 * 段里的普通成员行（键与值都是字符串字面量）
 * @param {string} key
 * @param {string} value
 * @returns {string}
 */
function memberLine(key, value) {
    return `    ${JSON.stringify(key)}: ${JSON.stringify(value)}`;
}

/**
 * 生成一个武将包的源码
 *
 * @param {object} options
 * @param {string} options.packageId 包 id（同时作为文件里的 name）
 * @param {string} [options.packageName] 包的中文名（只用在文件头注释里）
 * @param {object} [options.sorts] 该包的分包：`{ 分包id: 中文名 }`
 * @param {object} [options.records] 草稿表（`x19D6_editor.characters`）
 * @param {object} [options.skillDefs] 要写定义的技能：`{ 技能id: 技能定义 }`（调用方已排除本体技能、已按包去重）
 * @param {object} [options.translate] lib.translate（技能名/描述兜底）
 * @param {object} [options.translateExtra] 额外补的 translate（自建势力 / 宗族的中文名）
 * @param {string[]} [options.groups] 要补进 lib.group 的自定义势力 id
 * @returns {{ text: string, warnings: string[] }}
 */
export function buildCharacterPackageFile(options = {}) {
    const {
        packageId,
        packageName = packageId,
        sorts = {},
        records = {},
        skillDefs = {},
        translate = {},
        translateExtra = {},
        groups = []
    } = options;
    const warnings = [];

    //① 分段成员行：武将本体 + 称号 / 简介 / 拼音 / 分包归属
    const characterLines = [];
    const titleLines = [];
    const introLines = [];
    const pinyinLines = [];
    const sortMembers = {};
    Object.keys(sorts).forEach(sortId => (sortMembers[sortId] = []));

    /** translate 成员：同一个键只留第一条（先到先得，避免生成重复键） */
    const translateEntries = [];
    const usedTranslateKeys = new Set();
    const addTranslate = (key, value) => {
        if (!key || value === undefined || value === null || value === "") return;
        if (usedTranslateKeys.has(key)) return;
        usedTranslateKeys.add(key);
        translateEntries.push(memberLine(key, value));
    };

    for (const record of Object.values(records)) {
        if (!record || !record.id) continue;
        if ((record.packageId || "") !== packageId) continue;
        const fields = characterFieldLines(record);
        //一个字段都没有的草稿给 `"id": {}`，别落成中间空一行的三行对象
        characterLines.push(fields.length
            ? `    ${JSON.stringify(record.id)}: {\n${fields.join(",\n")}\n    }`
            : `    ${JSON.stringify(record.id)}: {}`);
        if (record.name) addTranslate(record.id, record.name);
        //称号归 characterTitles 段：本体里没有 title 这个字段（standard.js 也不写）
        if (record.title) titleLines.push(memberLine(record.id, record.title));
        if (record.intro) introLines.push(memberLine(record.id, record.intro));
        //拼音要归一成字符串：草稿里可能是 [""] 或按字拆的数组，直接写进去游戏里会拿到脏值
        const pinyin = Array.isArray(record.pinyin)
            ? record.pinyin.filter(Boolean).join("")
            : String(record.pinyin || "").replace(/,/g, "");
        if (pinyin) pinyinLines.push(memberLine(record.id, pinyin));
        if (record.characterSort) {
            //草稿里只选了分包、但没在登记表里的（例如扫描到的包）也要收进来
            if (!sortMembers[record.characterSort]) sortMembers[record.characterSort] = [];
            sortMembers[record.characterSort].push(record.id);
        }
    }

    //② 技能定义 + 技能名 / 描述（translation / description 拆出来放这儿）
    const skillLines = [];
    for (const id of Object.keys(skillDefs).sort()) {
        const skill = skillDefs[id];
        const { members, warnings: skillWarnings } = serializeSkill(skill, INDENT.repeat(2));
        skillWarnings.forEach(text => warnings.push(`技能 ${id}：${text}`));
        if (!members) continue;
        skillLines.push(`    ${JSON.stringify(id)}: {\n${members}\n    }`);
        const { name, info } = readSkillText(skill, id, translate);
        addTranslate(id, name);
        addTranslate(id + "_info", info);
    }

    //③ 自定义势力 / 宗族：游戏 lib.translate 里没有的话界面只会显示原 id
    //④ 武将包中文名：引擎按 `<包id>_character_config` 取包名（ui/create/index.js:1586 少了这个键
    //连整个包都进不了武将包列表），而扩展侧惯例就是直接写这个键——game/index.js:5634/5668 与
    addTranslate(`${packageId}_character_config`, packageName || packageId);
    Object.entries(translateExtra).forEach(([key, val]) => addTranslate(key, val));
    const sortLines = Object.entries(sortMembers)
        .map(([sortId, ids]) => `    ${JSON.stringify(sortId)}: [${ids.map(id => JSON.stringify(id)).join(", ")}]`);
    //分包名走另一个对象：与 translates 撞键时让 translates 赢（不同命名空间，撞上属异常）
    const sortTranslateLines = Object.entries(sorts)
        .filter(([sortId]) => !usedTranslateKeys.has(sortId))
        .map(([sortId, sortName]) => memberLine(sortId, sortName));

    //⑤ 段声明：13 段恒定全出，顺序与 standard.js 一致（空段也是单行 `{}`）
    const declarations = [
        declaration("characters", characterLines),
        declaration("cards", []),
        declaration("pinyins", pinyinLines),
        declaration("skills", skillLines),
        declaration("translates", translateEntries),
        declaration("characterTitles", titleLines),
        declaration("characterIntro", introLines),
        declaration("characterFilters", []),
        declaration("dynamicTranslates", []),
        declaration("perfectPairs", []),
        declaration("voices", []),
        declaration("characterSort", sortLines),
        declaration("characterSortTranslate", sortTranslateLines)
    ];

    //⑥ 返回对象：13 个键，键名与顺序照抄 standard.js
    const returns = [
        `name: ${JSON.stringify(packageId)}`,
        "connect: true",
        "character: { ...characters }",
        `characterSort: { ${JSON.stringify(packageId)}: characterSort }`,
        "characterFilter: { ...characterFilters }",
        "characterTitle: { ...characterTitles }",
        "dynamicTranslate: { ...dynamicTranslates }",
        "characterIntro: { ...characterIntro }",
        "card: { ...cards }",
        "skill: { ...skills }",
        "perfectPair: { ...perfectPairs }",
        "translate: { ...translates, ...voices, ...characterSortTranslate }",
        "pinyins: { ...pinyins }"
    ];

    const callbackLines = [
        ...groups.map(id => `${INDENT}lib.group.push(${JSON.stringify(id)});`)
    ];
    callbackLines.push(`${INDENT}return {`);
    callbackLines.push(returns.map(line => INDENT.repeat(2) + line).join(`,${EOL}`));
    callbackLines.push(`${INDENT}};`);

    const blocks = [
        `//本文件由《魂氏编辑器》生成：武将包「${packageName}」（整文件覆盖，勿手改）`,
        'import { lib, game, ui, get, ai, _status } from "../../../noname.js";',
        ...declarations,
        `game.import("character", () => {\n${callbackLines.join(EOL)}\n});`
    ];
    return { text: blocks.join(EOL + EOL) + EOL, warnings };
}
