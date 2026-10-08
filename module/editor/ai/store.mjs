/**
 * AI 区域的持久化层（纯数据读写，落在 `lib.config.x19D6_editor.ai.*`）。
 *
 * 为什么单独一层：AI 区的状态有六种（文本接口 / 生图接口 / 历史 / 候选图 /
 * 已应用技能 / 引导标记），散在组件里会出现「有的存了有的没存」。
 * 这里统一走 `x19D6_editor.ai` 前缀，并且**整块读写**（map/list 一次写完），
 * 免掉按 id 拼路径时的转义问题。
 *
 * host 是组件（HTMLNonameFocusUIElement 子类），只用到它的 configQuery。
 */

const ROOT = "x19D6_editor.ai";

/** 文本接口默认值 */
export const DEFAULT_TEXT_CONFIG = {
    provider: "",
    baseUrl: "",
    apiKey: "",
    model: "",
    temperature: 0.8
};

/** 生图接口默认值 */
export const DEFAULT_IMAGE_CONFIG = {
    provider: "",
    baseUrl: "",
    apiKey: "",
    model: "",
    size: "1024x1024",
    n: 1,
    extra: ""
};

/** 历史条数上限（再多也没人翻） */
export const HISTORY_LIMIT = 20;

/**
 * 读 `x19D6_editor.ai.<member>`
 * @param {object} host 具备 configQuery 的组件
 * @param {string} member 相对路径，如 "text" / "history"
 * @returns {any}
 */
export function read(host, member) {
    if (!host || typeof host.configQuery !== "function") return null;
    return host.configQuery("get", { member: `${ROOT}.${member}` });
}

/**
 * 写 `x19D6_editor.ai.<member>`（一次写一个叶子，内部会整份保存配置）
 * @param {object} host
 * @param {string} member
 * @param {any} value
 */
export function write(host, member, value) {
    if (!host || typeof host.configQuery !== "function") return null;
    return host.configQuery("write", { member: `${ROOT}.${member}`, value });
}

/** 文本接口配置（缺项补默认值） */
export function getTextConfig(host) {
    const saved = read(host, "text") || {};
    return { ...DEFAULT_TEXT_CONFIG, ...(saved && typeof saved === "object" ? saved : {}) };
}
export function saveTextConfig(host, patch = {}) {
    const next = { ...getTextConfig(host), ...patch };
    return write(host, "text", next);
}

/** 生图接口配置（缺项补默认值） */
export function getImageConfig(host) {
    const saved = read(host, "image") || {};
    return { ...DEFAULT_IMAGE_CONFIG, ...(saved && typeof saved === "object" ? saved : {}) };
}
export function saveImageConfig(host, patch = {}) {
    const next = { ...getImageConfig(host), ...patch };
    return write(host, "image", next);
}

/**
 * 设计稿历史（新的在前）
 * @returns {Array<{at:number, request:string, draft:object}>}
 */
export function getHistory(host) {
    const list = read(host, "history");
    return Array.isArray(list) ? list.filter(item => item && item.draft) : [];
}
/**
 * 记一条历史（同一个武将 id 只留最新一条，避免刷十条同名的）
 * @param {object} host
 * @param {{request:string, draft:object}} entry
 */
export function pushHistory(host, entry) {
    const id = entry && entry.draft && entry.draft.id;
    const list = getHistory(host).filter(item => !(id && item.draft && item.draft.id === id));
    list.unshift({ at: Date.now(), request: String(entry.request || ""), draft: entry.draft });
    return write(host, "history", list.slice(0, HISTORY_LIMIT));
}
export function clearHistory(host) {
    return write(host, "history", []);
}

/**
 * 候选图清单（按武将 id 分组）
 * @returns {Object<string, Array<{path:string, prompt:string, model:string, at:number}>>}
 */
export function getCandidateMap(host) {
    const map = read(host, "candidates");
    return map && typeof map === "object" && !Array.isArray(map) ? map : {};
}
export function getCandidates(host, characterId) {
    const list = getCandidateMap(host)[characterId];
    return Array.isArray(list) ? list.filter(item => item && item.path) : [];
}
/**
 * 追加候选图记录
 * @param {object} host
 * @param {string} characterId 该候选图是给谁生成的（空则记在 "__unassigned"）
 * @param {{path:string, prompt:string, model:string}} candidate path 形如 `ext:<扩展相对路径>`
 */
export function addCandidate(host, characterId, candidate) {
    const key = characterId || "__unassigned";
    const map = getCandidateMap(host);
    const list = Array.isArray(map[key]) ? map[key] : [];
    map[key] = [{ at: Date.now(), prompt: "", model: "", ...candidate }, ...list].slice(0, 24);
    return write(host, "candidates", map);
}
/** 移除一条候选图记录（只删记录，磁盘文件由调用方删） */
export function removeCandidate(host, characterId, path) {
    const key = characterId || "__unassigned";
    const map = getCandidateMap(host);
    if (!Array.isArray(map[key])) return null;
    map[key] = map[key].filter(item => item.path !== path);
    if (!map[key].length) delete map[key];
    return write(host, "candidates", map);
}

/**
 * 已应用的技能（技能 id → { code, name, description, at }）
 * 技能只在本局生效，源码存在这里是为了：重开编辑器后还能打开当初那份源码去改。
 * @returns {Object<string, {code:string,name:string,description:string,at:number}>}
 */
export function getAppliedSkillMap(host) {
    const map = read(host, "appliedSkills");
    return map && typeof map === "object" && !Array.isArray(map) ? map : {};
}
export function getAppliedSkill(host, skillId) {
    return getAppliedSkillMap(host)[skillId] || null;
}
export function setAppliedSkill(host, skillId, record) {
    if (!skillId) return null;
    const map = getAppliedSkillMap(host);
    map[skillId] = { name: "", description: "", code: "", at: Date.now(), ...record };
    return write(host, "appliedSkills", map);
}

/** 引导是否看过（看过就不再自动弹） */
export function isGuided(host) {
    return read(host, "guided") === true;
}
export function markGuided(host) {
    return write(host, "guided", true);
}

/**
 * 「AI 技能书」（ai/skill.md）的开关与用户改动。
 * text 为空 = 用扩展里那份 skill.md 原文；有值 = 用户在面板里改过的覆盖版本。
 * @returns {{enabled:boolean, text:string}}
 */
export function getSkillState(host) {
    const saved = read(host, "skill") || {};
    return {
        enabled: saved.enabled !== false,
        text: typeof saved.text === "string" ? saved.text : ""
    };
}
export function saveSkillState(host, patch = {}) {
    const next = { ...getSkillState(host), ...patch };
    return write(host, "skill", next);
}

/** token 用量累计（只统计对话调用；生图按张计费、不计 token） */
export const EMPTY_USAGE = { calls: 0, prompt: 0, completion: 0, total: 0, cached: 0, last: null, at: 0 };

/**
 * 读累计用量
 * @returns {{calls:number, prompt:number, completion:number, total:number, cached:number, last:object|null, at:number}}
 */
export function getUsage(host) {
    const saved = read(host, "usage") || {};
    return { ...EMPTY_USAGE, ...(saved && typeof saved === "object" ? saved : {}) };
}
/**
 * 记一次调用的用量
 * @param {{prompt:number, completion:number, total:number, cached:number}|null} usage
 */
export function addUsage(host, usage) {
    if (!usage) return null;
    const current = getUsage(host);
    return write(host, "usage", {
        calls: current.calls + 1,
        prompt: current.prompt + (usage.prompt || 0),
        completion: current.completion + (usage.completion || 0),
        total: current.total + (usage.total || 0),
        cached: current.cached + (usage.cached || 0),
        last: usage,
        at: Date.now()
    });
}
export function resetUsage(host) {
    return write(host, "usage", { ...EMPTY_USAGE });
}
