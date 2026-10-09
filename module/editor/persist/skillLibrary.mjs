/**
 * 编辑器技能库：`x19D6_editor.skills.<技能id>`
 *
 * 记录「编辑器里建立 / 编辑过」的技能：shya 源码 + 编译产物 + 名称描述 + 归属工作区。
 * 用途有两个：
 *  1. 落盘时把 shya 源码写进 `extension/<工作区>/src/shya/<技能id>.shya`；
 *  2. 之后做「技能草稿列表 / 按工作区过滤」时的数据源（技能定义本身仍在 lib.skill）。
 *
 * 兼容：早期 AI 区域把源码存在 `x19D6_editor.ai.appliedSkills.<技能id>.code`，
 * 这里**只读兜底**（不再写），老数据照样能落盘。
 *
 * host 可以是组件（有 configQuery），也可以是 NonameData（有 getConfig / writeConfig）。
 */

const ROOT = "x19D6_editor.skills";
/** AI 区域的旧键：只读兜底 */
const LEGACY_ROOT = "x19D6_editor.ai.appliedSkills";

/**
 * @param {object} host
 * @param {string} member
 * @returns {any}
 */
function readConfig(host, member) {
    if (!host) return null;
    if (typeof host.configQuery === "function") return host.configQuery("get", { member });
    if (typeof host.getConfig === "function") return host.getConfig(member);
    return null;
}

/**
 * @param {object} host
 * @param {string} member
 * @param {any} value
 * @returns {any}
 */
function writeConfig(host, member, value) {
    if (!host) return null;
    if (typeof host.configQuery === "function") return host.configQuery("write", { member, value });
    if (typeof host.writeConfig === "function") return host.writeConfig(member, value);
    return null;
}

/** @param {any} value */
function isRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value);
}

/**
 * 补齐字段（老记录、外部塞进来的记录都能读）
 * @param {string} skillId
 * @param {object} [record]
 * @returns {{id: string, name: string, description: string, source: string, code: string, workspace: string, at: number}}
 */
function normalize(skillId, record = {}) {
    const text = key => (typeof record[key] === "string" ? record[key] : "");
    return {
        id: skillId,
        name: text("name"),
        description: text("description"),
        source: text("source"),
        code: text("code"),
        workspace: text("workspace"),
        at: Number(record.at) || Date.now()
    };
}

/**
 * 技能库全表（整块读写，避免按 id 拼路径的转义问题）
 * @param {object} host
 * @returns {Object<string, object>}
 */
export function readSkillRecords(host) {
    const records = readConfig(host, ROOT);
    return isRecord(records) ? records : {};
}

/**
 * 取一个技能的记录；技能库里没有就回落 AI 区域的旧键
 * @param {object} host
 * @param {string} skillId
 * @returns {object|null}
 */
export function getSkillRecord(host, skillId) {
    if (!skillId) return null;
    const record = readSkillRecords(host)[skillId];
    if (isRecord(record)) return normalize(skillId, record);
    const legacy = readConfig(host, LEGACY_ROOT);
    const old = isRecord(legacy) ? legacy[skillId] : null;
    if (!isRecord(old)) return null;
    //旧键里 code 存的是 shya 源码（命名如此，不是编译产物）
    return normalize(skillId, { name: old.name, description: old.description, source: old.code });
}

/**
 * 写入一个技能的记录（合并式更新）
 * @param {object} host
 * @param {string} skillId
 * @param {object} [patch] 想更新的字段
 * @returns {Object<string, object>|null}
 */
export function setSkillRecord(host, skillId, patch = {}) {
    if (!skillId) return null;
    const records = { ...readSkillRecords(host) };
    records[skillId] = normalize(skillId, { ...records[skillId], ...patch });
    return writeConfig(host, ROOT, records);
}
