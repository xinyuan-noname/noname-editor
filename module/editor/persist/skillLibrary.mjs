/**
 * 编辑器技能库：`x19D6_editor.skills.<草稿编号>`
 *
 * 键是**草稿编号** `draft-<n>`（与武将草稿同一套约定，计数器 `x19D6_editor.skillDraftSeq`），
 * 技能 id 只是记录里的一个字段——理由与武将那边一样：在编辑器里改 id 不该另存成一份新草稿。
 * 记录形如 `{ id, name, description, source, code, workspace, at }`：
 *  · `source` = shya 源码（落盘写 `<工作区>/src/shya/<id>.shya` 用）；
 *  · `code`   = 最近一次编译产物（留档，便于「生成」后回看）；
 *  · `workspace` = 归属工作区（侧栏按它过滤）。
 *
 * 兼容与迁移：
 *  · 老数据以**技能 id** 为键（上一轮为「技能落盘」建的），读的时候迁成编号键、原键落成 `id`；
 *  · 更早 AI 区域的 `x19D6_editor.ai.appliedSkills.<技能id>` 仍作**只读兜底**（不再写）。
 *
 * host 可以是组件（有 configQuery），也可以是 NonameData（有 getConfig / writeConfig）。
 */

const ROOT = "x19D6_editor.skills";
/** 草稿编号计数器 */
const SEQ = "x19D6_editor.skillDraftSeq";
/** AI 区域的旧键：只读兜底 */
const LEGACY_AI = "x19D6_editor.ai.appliedSkills";
/** 编号键的形状（不是这个形状的键都要迁移） */
const DRAFT_KEY = /^draft-\d+$/;

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
 * @param {string} draftKey
 * @param {object} [record]
 * @returns {{id:string,name:string,description:string,source:string,code:string,workspace:string,at:number}}
 */
function normalize(draftKey, record = {}) {
    const text = key => (typeof record[key] === "string" ? record[key] : "");
    return {
        id: text("id"),
        name: text("name"),
        description: text("description"),
        source: text("source"),
        code: text("code"),
        workspace: text("workspace"),
        at: Number(record.at) || Date.now()
    };
}

/** 什么都没有的草稿不落库（与武将编辑器「空表单不保存」同一条规矩） */
function isEmpty(record) {
    return !record.id && !record.name && !record.description && !String(record.source || "").trim();
}

/** 取下一个编号（并把计数器顶到已用编号之上） */
function nextDraftKey(host, existing) {
    const keys = existing || Object.keys(readSkillDraftsRaw(host));
    const max = keys.reduce((acc, key) => {
        const matched = /^draft-(\d+)$/.exec(key);
        return matched ? Math.max(acc, Number(matched[1])) : acc;
    }, 0);
    const saved = Number(readConfig(host, SEQ)) || 0;
    const next = Math.max(max, saved) + 1;
    writeConfig(host, SEQ, next);
    return `draft-${next}`;
}

/**
 * 读原始表（不做迁移；内部用）
 * @param {object} host
 * @returns {Object<string, object>}
 */
function readSkillDraftsRaw(host) {
    const records = readConfig(host, ROOT);
    return isRecord(records) ? records : {};
}

/**
 * 全部技能草稿 `{ 编号: 记录 }`。
 * 读的时候顺带迁移「以技能 id 为键」的老数据，并把结果写回（幂等：迁过就不会再动）。
 * @param {object} host
 * @returns {Object<string, object>}
 */
export function readSkillDrafts(host) {
    const raw = readSkillDraftsRaw(host);
    const drafts = {};
    const legacyKeys = [];
    for (const [key, value] of Object.entries(raw)) {
        if (!isRecord(value)) continue;
        if (DRAFT_KEY.test(key)) {
            drafts[key] = normalize(key, value);
            continue;
        }
        legacyKeys.push([key, value]);
    }
    if (!legacyKeys.length) return drafts;
    //老键（技能 id）→ 新编号键：原键落成 id 字段，其余原样搬
    for (const [oldKey, value] of legacyKeys) {
        const draftKey = nextDraftKey(host, Object.keys(drafts));
        drafts[draftKey] = normalize(draftKey, { ...value, id: value.id || oldKey });
    }
    writeConfig(host, ROOT, drafts);
    return drafts;
}

/**
 * 取一份草稿
 * @param {object} host
 * @param {string} draftKey
 * @returns {object|null}
 */
export function getSkillDraft(host, draftKey) {
    if (!draftKey) return null;
    const record = readSkillDrafts(host)[draftKey];
    return record ? { ...record } : null;
}

/**
 * 按技能 id 找草稿（`{ draftKey, record }`；找不到返回 null）
 * @param {object} host
 * @param {string} skillId
 * @returns {{draftKey: string, record: object}|null}
 */
export function findSkillDraft(host, skillId) {
    if (!skillId) return null;
    const hit = Object.entries(readSkillDrafts(host)).find(([, record]) => record.id === skillId);
    return hit ? { draftKey: hit[0], record: { ...hit[1] } } : null;
}

/**
 * 新建一份草稿（分配编号）。空记录（没源码、没 id、没名字）不落库，返回 null。
 * @param {object} host
 * @param {object} [patch]
 * @returns {{draftKey: string, record: object}|null}
 */
export function createSkillDraft(host, patch = {}) {
    //先判空再分配编号：空草稿不该白吃掉一个编号（否则第一次「点开又没写」就把 draft-1 用掉了）
    if (isEmpty(normalize("", patch))) return null;
    const drafts = readSkillDrafts(host);
    const draftKey = nextDraftKey(host, Object.keys(drafts));
    const record = normalize(draftKey, patch);
    drafts[draftKey] = record;
    writeConfig(host, ROOT, drafts);
    return { draftKey, record };
}

/**
 * 保存一份草稿（合并式；没有这个编号就新建）
 * @param {object} host
 * @param {string} draftKey
 * @param {object} [patch]
 * @returns {{draftKey: string, record: object}|null}
 */
export function saveSkillDraft(host, draftKey, patch = {}) {
    if (!draftKey) return createSkillDraft(host, patch);
    const drafts = readSkillDrafts(host);
    const merged = normalize(draftKey, { ...drafts[draftKey], ...patch, at: Date.now() });
    if (!drafts[draftKey] && isEmpty(merged)) return null;
    drafts[draftKey] = merged;
    writeConfig(host, ROOT, drafts);
    return { draftKey, record: merged };
}

/**
 * 删掉一份草稿
 * @param {object} host
 * @param {string} draftKey
 * @returns {boolean}
 */
export function removeSkillDraft(host, draftKey) {
    const drafts = readSkillDrafts(host);
    if (!drafts[draftKey]) return false;
    delete drafts[draftKey];
    writeConfig(host, ROOT, drafts);
    return true;
}

/**
 * 技能 id → shya 源码（落盘写 `<工作区>/src/shya/<id>.shya` 用）。
 * 传了工作区就只收「归属它 + 未归属」的草稿，与侧栏列表的过滤口径一致。
 * @param {object} host
 * @param {string} [workspace]
 * @returns {Object<string, string>}
 */
export function skillSourcesById(host, workspace = "") {
    const map = {};
    for (const record of Object.values(readSkillDrafts(host))) {
        if (workspace && record.workspace && record.workspace !== workspace) continue;
        const source = String(record.source || "").trim();
        if (record.id && source) map[record.id] = source;
    }
    return map;
}

/**
 * 按技能 id 取记录（**兼容旧调用**：AI 区域的「已应用技能」）
 * @param {object} host
 * @param {string} skillId
 * @returns {object|null}
 */
export function getSkillRecord(host, skillId) {
    if (!skillId) return null;
    const hit = findSkillDraft(host, skillId);
    if (hit) return hit.record;
    const legacy = readConfig(host, LEGACY_AI);
    const old = isRecord(legacy) ? legacy[skillId] : null;
    if (!isRecord(old)) return null;
    //旧键里 code 存的是 shya 源码（命名如此，不是编译产物）
    return normalize("", { name: old.name, description: old.description, source: old.code });
}

/**
 * 按技能 id 写入记录（**兼容旧调用**）：已有草稿就更新，没有就新建一份
 * @param {object} host
 * @param {string} skillId
 * @param {object} [patch]
 * @returns {{draftKey: string, record: object}|null}
 */
export function setSkillRecord(host, skillId, patch = {}) {
    if (!skillId) return null;
    const hit = findSkillDraft(host, skillId);
    return saveSkillDraft(host, hit ? hit.draftKey : "", { ...patch, id: skillId });
}
