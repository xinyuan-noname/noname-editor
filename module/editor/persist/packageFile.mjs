/**
 * 生成武将包文件文本（纯函数：不读配置、不碰 lib、不用 this）。
 *
 * 形态对齐游戏本体 `character/standard/index.js`：
 *   const characters / skills / characterSort / translates … + game.import("character", …)
 * 其中 `skill` 段就是技能定义（引擎 loadCharacter 会写进 lib.skill），
 * 技能的显示名与描述拆进 translate —— 见 persist/skills.mjs 的 readSkillText。
 *
 * 生成的文件是**整文件覆盖**的：改动这里等于改动所有工作区里的 `character/<包id>.js`，
 * 所以字段顺序、缩进、空行都固定下来，重复落盘不会产生无意义的 diff。
 */
import { readSkillText, serializeSkill } from "./skills.mjs";

const EOL = "\n";
const INDENT = "    ";

/** 草稿里只属于编辑器、不写进武将本体的字段 */
const EDITOR_ONLY_FIELDS = new Set([
    "id",
    "extension",
    "packageId",
    "characterSort",
    "characterSortName",
    "name",
    "intro",
    "pinyin",
    "dieAudioText",
    "perfectPair",
    "avatar",
    "dieAudios",
    "savedAt"
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
 * `const <name> = { … };`（没有内容时给 `{}`，避免生成空荡荡的三行）
 * @param {string} name
 * @param {string[]} lines 成员行
 * @returns {string}
 */
function declaration(name, lines) {
    return lines.length ? `const ${name} = {\n${lines.join(",\n")}\n};` : `const ${name} = {};`;
}

/** `const` 声明里的 translate 成员行 */
function translateLine(key, value) {
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

    const characterLines = [];
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
        translateEntries.push(translateLine(key, value));
    };

    //① 武将本体 + 武将名 / 称号 / 拼音 / 分包归属
    for (const record of Object.values(records)) {
        if (!record || !record.id) continue;
        if ((record.packageId || "") !== packageId) continue;
        const fields = characterFieldLines(record);
        characterLines.push(`    ${JSON.stringify(record.id)}: {\n${fields.join(",\n")}\n    }`);
        if (record.name) addTranslate(record.id, record.name);
        if (record.intro) introLines.push(`    ${JSON.stringify(record.id)}: ${JSON.stringify(record.intro)}`);
        //拼音要归一成字符串：草稿里可能是 [""] 或按字拆的数组，直接写进去游戏里会拿到脏值
        const pinyin = Array.isArray(record.pinyin)
            ? record.pinyin.filter(Boolean).join("")
            : String(record.pinyin || "").replace(/,/g, "");
        if (pinyin) pinyinLines.push(`    ${JSON.stringify(record.id)}: ${JSON.stringify(pinyin)}`);
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
    Object.entries(translateExtra).forEach(([key, value]) => addTranslate(key, value));

    const sortLines = Object.entries(sortMembers)
        .map(([sortId, ids]) => `    ${JSON.stringify(sortId)}: [${ids.map(id => JSON.stringify(id)).join(", ")}]`);
    //分包名走另一个对象：与 translates 撞键时让 translates 赢（不同命名空间，撞上属异常）
    const sortTranslateLines = Object.entries(sorts)
        .filter(([sortId]) => !usedTranslateKeys.has(sortId))
        .map(([sortId, sortName]) => translateLine(sortId, sortName));

    const declarations = [
        declaration("characters", characterLines),
        ...(skillLines.length ? [declaration("skills", skillLines)] : []),
        declaration("characterSort", sortLines),
        declaration("translates", translateEntries),
        declaration("characterSortTranslate", sortTranslateLines)
    ];
    if (introLines.length) declarations.push(declaration("characterIntro", introLines));
    if (pinyinLines.length) declarations.push(declaration("pinyins", pinyinLines));

    //返回对象：字段顺序固定，落盘才会幂等
    const returns = [
        `name: ${JSON.stringify(packageId)}`,
        "connect: true",
        "character: { ...characters }"
    ];
    if (skillLines.length) returns.push("skill: { ...skills }");
    returns.push(`characterSort: { ${JSON.stringify(packageId)}: characterSort }`);
    returns.push("translate: { ...translates, ...characterSortTranslate }");
    if (introLines.length) returns.push("characterIntro: { ...characterIntro }");
    if (pinyinLines.length) returns.push("pinyins: { ...pinyins }");

    const callbackLines = groups.map(id => `${INDENT}lib.group.push(${JSON.stringify(id)});`);
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
