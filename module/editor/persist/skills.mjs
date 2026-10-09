/**
 * 技能落盘的纯逻辑：字段拆分、代码序列化、本体技能表。
 *
 * 不碰 DOM、不碰组件 this、不读配置——数据一律由调用方传入，
 * 所以 `_x19D6_backup/tools/package-file-check.mjs` 能在 Node 里直接跑它。
 *
 * 三条引擎侧约定（都核对过源码）：
 *  1. 武将包文件的 `skill` 段就是 `lib.skill[id]`：`noname/init/loading.js` 的 loadCharacter
 *     对包对象的 `skill` 键逐条 `lib.skill[id] = 定义`，与 `character` / `translate` 同级。
 *  2. `translation` / `description` **不是技能字段**，引擎不会替你归位
 *     （`extSkillInject` 只处理 audio，且只对「扩展型」包生效）——它们要拆到
 *     `lib.translate[id]` / `lib.translate[id + "_info"]`。
 *  3. 游戏本体技能（`character/` 下的包）只引用、不写定义，否则扩展里会重复定义。
 */

/** 编辑器元数据字段：拆到 translate，不留在技能体里 */
const META_KEYS = ["translation", "description"];
/** 可以裸写的对象键 */
const IDENTIFIER_KEY = /^[A-Za-z_$][\w$]*$/;
/** 单行数组的长度上限 */
const INLINE_LIMIT = 72;

/**
 * @param {string} text
 * @returns {string[]}
 */
function toLines(text) {
    return String(text).replace(/\r\n?/g, "\n").split("\n");
}

/**
 * 对象键：合法标识符就裸写，否则加引号
 * @param {string} key
 * @returns {string}
 */
function formatKey(key) {
    return IDENTIFIER_KEY.test(key) ? key : JSON.stringify(key);
}

/**
 * 函数源码重排缩进：首行由调用方接在 `键: ` 之后，其余行整体平移到 indent。
 * 基准缩进取「除首行外非空行的最小缩进」——函数 toString 一般把收尾的 `}` 顶在行首，
 * 于是函数体保留了自己那层相对缩进。
 * @param {string} source 函数源码（Function.prototype.toString）
 * @param {string} indent 键所在行的缩进
 * @returns {string}
 */
function reindentFunction(source, indent) {
    const lines = toLines(source);
    if (lines.length === 1) return lines[0];
    const indents = lines.slice(1)
        .filter(line => line.trim())
        .map(line => line.match(/^[ \t]*/)[0].length);
    const base = indents.length ? Math.min(...indents) : 0;
    return [
        lines[0],
        ...lines.slice(1).map(line => (line.trim() ? indent + line.slice(base) : ""))
    ].join("\n");
}

/** 引擎内置 / 已绑定的函数没法导出源码 */
function isNativeFunction(source) {
    return /\[native code\]/.test(source);
}

/** 这段文本能不能当**表达式**用（函数出现在取值位置，不是声明位置） */
function canBeExpression(text) {
    try {
        new Function(`return (${text});`);
        return true;
    } catch (err) {
        return false;
    }
}

/**
 * 函数源码 → 函数表达式。
 * ⚠️ `Function.prototype.toString` 给的是**声明处的写法**：对象里的方法简写
 * （`async content(event, trigger, player) { … }`——标准包与本扩展全这么写）直接放到
 * `键: ` 后面就是语法错误（`Unexpected identifier 'content'`，自检抓到过）。
 * 这里按需补 `function`；补了仍不合法（getter/setter、已绑定函数…）就返回空串，由调用方跳过。
 * @param {string} source
 * @returns {string}
 */
function toFunctionExpression(source) {
    const text = String(source).trim();
    if (canBeExpression(text)) return text;
    const matched = /^(async\s+)?(\*)?\s*([A-Za-z_$][\w$]*)\s*\(/.exec(text);
    if (!matched) return "";
    const converted = `${matched[1] || ""}function${matched[2] || ""} ${matched[3]}${text.slice(matched[0].length - 1)}`;
    return canBeExpression(converted) ? converted : "";
}

/** 只认纯对象（类实例、Map、DOM 节点等一律跳过并报警告） */
function isPlainObject(value) {
    if (!value || typeof value !== "object") return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

/** 给警告用的类型名 */
function typeName(value) {
    if (value === null) return "null";
    const tag = Object.prototype.toString.call(value);
    return tag.slice(8, -1);
}

/**
 * 把值渲染成 JS 源码。
 * 约定：返回文本的**第 0 行**由调用方接在 `键: ` 之后，其余行已带上 indent（键所在行的缩进）。
 * @param {any} value
 * @param {string} indent
 * @param {string[]} warnings
 * @param {string} path 警告里的位置，如 `ai.result.target`
 * @returns {string|undefined} 写不出来的值返回 undefined，由调用方跳过该键
 */
function renderValue(value, indent, warnings, path) {
    switch (typeof value) {
        case "function": {
            const source = Function.prototype.toString.call(value);
            if (isNativeFunction(source)) {
                warnings.push(`${path} 是引擎内置函数，无法导出，已跳过`);
                return undefined;
            }
            const expression = toFunctionExpression(source);
            if (!expression) {
                warnings.push(`${path} 的函数没法当表达式写出来（getter/setter 或已绑定），已跳过`);
                return undefined;
            }
            return reindentFunction(expression, indent);
        }
        case "string": return JSON.stringify(value);
        case "number": {
            if (Number.isNaN(value)) return "NaN";
            if (value === Infinity) return "Infinity";
            if (value === -Infinity) return "-Infinity";
            return String(value);
        }
        case "boolean": return String(value);
        case "bigint": return `${value}n`;
        default: break;
    }
    if (value === null) return "null";
    if (value instanceof RegExp) return value.toString();
    if (value instanceof Date) return `new Date(${value.getTime()})`;
    if (Array.isArray(value)) return renderArray(value, indent, warnings, path);
    if (isPlainObject(value)) return renderObject(value, indent, warnings, path);
    warnings.push(`${path} 是 ${typeName(value)}，无法写成代码，已跳过`);
    return undefined;
}

/**
 * @param {any[]} items
 * @param {string} indent
 * @param {string[]} warnings
 * @param {string} path
 * @returns {string}
 */
function renderArray(items, indent, warnings, path) {
    const inner = indent + "    ";
    //写不出来的项留 undefined 占位：数组下标是有语义的，不能悄悄丢掉
    const rendered = items.map((item, index) => renderValue(item, inner, warnings, `${path}[${index}]`) ?? "undefined");
    const inline = `[${rendered.join(", ")}]`;
    if (!inline.includes("\n") && inline.length <= INLINE_LIMIT) return inline;
    return `[\n${rendered.map(text => inner + text).join(",\n")}\n${indent}]`;
}

/**
 * @param {object} object
 * @param {string} indent 成员行的缩进
 * @param {string[]} warnings
 * @param {string} path
 * @returns {string[]} 成员行
 */
function renderObjectMembers(object, indent, warnings, path) {
    const lines = [];
    for (const [key, value] of Object.entries(object)) {
        if (value === undefined) continue;
        const rendered = renderValue(value, indent, warnings, path ? `${path}.${key}` : key);
        if (rendered === undefined) continue;
        lines.push(`${indent}${formatKey(key)}: ${rendered}`);
    }
    return lines;
}

/**
 * @param {object} object
 * @param {string} indent
 * @param {string[]} warnings
 * @param {string} path
 * @returns {string}
 */
function renderObject(object, indent, warnings, path) {
    const members = renderObjectMembers(object, indent + "    ", warnings, path);
    if (!members.length) return "{}";
    return `{\n${members.join(",\n")}\n${indent}}`;
}

/**
 * 序列化一个技能定义（对象字面量的**成员行**，调用方自己套 `{ }`）。
 * `translation` / `description` 不在这里输出——它们走 translate，见 readSkillText。
 * @param {object} skill
 * @param {string} indent 成员行在生成文件里的缩进
 * @returns {{ members: string, warnings: string[] }}
 */
export function serializeSkill(skill, indent) {
    const body = {};
    for (const [key, value] of Object.entries(skill || {})) {
        if (META_KEYS.includes(key)) continue;
        body[key] = value;
    }
    const warnings = [];
    return { members: renderObjectMembers(body, indent, warnings, "").join(",\n"), warnings };
}

/**
 * 技能的显示名与描述：技能定义里的 translation / description 优先，回落 lib.translate。
 * @param {object} skill 技能定义
 * @param {string} id
 * @param {object} [translate] lib.translate
 * @returns {{ name: string, info: string }}
 */
export function readSkillText(skill, id, translate = {}) {
    const pick = (fromSkill, fromLib) => (typeof fromSkill === "string" && fromSkill ? fromSkill : (fromLib || ""));
    return {
        name: pick(skill && skill.translation, translate[id]),
        info: pick(skill && skill.description, translate[id + "_info"])
    };
}

/**
 * 读 `character/` 目录得到游戏本体武将包名（本体在 app 根，扩展在 `extension/` 下）。
 * @param {{readFolder: (path: string) => Promise<[string[], string[]]>}} data NonameData
 * @returns {Promise<string[]>}
 */
export async function listCorePacks(data) {
    try {
        const [folders, files] = (await data.readFolder("character")) || [[], []];
        return [...folders, ...files.map(name => String(name).replace(/\.[^.]+$/, ""))];
    } catch (err) {
        console.warn("[魂氏编辑器] 读取游戏本体武将包目录失败", err);
        return [];
    }
}

/**
 * 本体技能表：本体包下武将达到的技能 + 本体包 `skill` 段里定义的技能。
 * @param {string[]} corePacks 本体包名
 * @param {object} [characterPack] lib.characterPack
 * @param {object} [imported] lib.imported.character
 * @returns {Set<string>}
 */
export function collectCoreSkills(corePacks, characterPack = {}, imported = {}) {
    const core = new Set();
    for (const packName of corePacks || []) {
        const characters = characterPack[packName];
        for (const character of Object.values(characters || {})) {
            //引擎的武将既支持对象形态，也支持数组形态 [sex, group, hp, skills, …]
            const skills = Array.isArray(character) ? character[3] : (character && character.skills);
            (skills || []).forEach(id => core.add(id));
        }
        const pack = imported[packName];
        if (pack && pack.skill) Object.keys(pack.skill).forEach(id => core.add(id));
    }
    return core;
}

/** 本体技能表的会话级缓存（目录内容不会中途变，算一次就够） */
let coreSkillPromise = null;

/**
 * 取本体技能表（带缓存）
 * @param {{readFolder: Function}} data
 * @param {{characterPack?: object, imported?: object}} libRef
 * @returns {Promise<Set<string>>}
 */
export function getCoreSkills(data, libRef) {
    if (!coreSkillPromise) {
        coreSkillPromise = listCorePacks(data)
            .then(packs => collectCoreSkills(packs, libRef && libRef.characterPack, libRef && libRef.imported));
    }
    return coreSkillPromise;
}
