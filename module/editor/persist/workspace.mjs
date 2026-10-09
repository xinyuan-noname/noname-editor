/**
 * 工作区落盘编排（IO 层）：武将包文件 + 技能定义 + shya 源码 + 扩展入口的 import 区块。
 *
 * 这一层只做「读配置 → 拼数据 → 写文件」，生成逻辑在 persist/packageFile.mjs（纯函数）。
 * 引擎数据（lib.*）与编辑器数据都由调用方传入，方便在 Node 里跑自检与做并发排查。
 */
import { buildCharacterPackageFile } from "./packageFile.mjs";
import { getCoreSkills } from "./skills.mjs";

/**
 * 某包里、且确实有 id 的草稿
 * @param {object} records
 * @param {string} packageId
 * @returns {object[]}
 */
function recordsOf(records, packageId) {
    return Object.values(records || {}).filter(record => record && record.id && (record.packageId || "") === packageId);
}

/**
 * 要落盘的包：登记表里的 + 草稿用到的 + 兜底工作区名（排序，保证输出稳定）
 * @param {string} workspace
 * @param {{packages?: object}} meta
 * @param {object} records
 * @returns {string[]}
 */
function collectPackageIds(workspace, meta, records) {
    const ids = new Set(Object.keys((meta && meta.packages) || {}));
    Object.values(records || {}).forEach(record => {
        if (record && record.id && record.packageId) ids.add(record.packageId);
    });
    if (!ids.size) ids.add(workspace);
    return Array.from(ids).sort();
}

/**
 * 把「非本体技能」分配到包：每个技能只写一次，归到**包 id 排序最前**的引用它的那个包
 * （同扩展内重复定义会触发引擎的 duplicated skill 日志，后加载的那份会被忽略）。
 *
 * @param {object} options
 * @param {string[]} options.packageIds
 * @param {object} options.records 草稿表
 * @param {Set<string>} options.coreSkills 本体技能表
 * @param {object} options.skillTable lib.skill
 * @param {(message: string, detail?: any) => void} [options.onWarn]
 * @returns {Object<string, Object<string, object>>} 包 id → `{ 技能id: 技能定义 }`
 */
export function planSkillDistribution({ packageIds, records, coreSkills, skillTable, onWarn = () => {} }) {
    /** 技能 id → 归属包（先到先得 = 包 id 排序最前的那个包） */
    const owner = new Map();
    for (const packageId of packageIds) {
        for (const record of recordsOf(records, packageId)) {
            for (const id of record.skills || []) {
                if (!id || coreSkills.has(id) || owner.has(id)) continue;
                owner.set(id, packageId);
            }
        }
    }
    const distribution = {};
    for (const id of Array.from(owner.keys()).sort()) {
        const skill = skillTable && skillTable[id];
        if (!skill) {
            onWarn(`技能「${id}」不在 lib.skill 里（已删除或 id 写错），这次不落盘`);
            continue;
        }
        const packageId = owner.get(id);
        if (!distribution[packageId]) distribution[packageId] = {};
        distribution[packageId][id] = skill;
    }
    return distribution;
}

/**
 * 该包要补的 translate（自建势力 / 宗族）：游戏 lib.translate 里没有的才补，
 * 否则游戏界面只会显示原 id（用户反馈过「势力没落包」）。
 * @returns {Object<string, string>}
 */
function collectTranslateExtra(records, packageId, groups, translate) {
    const extra = {};
    for (const record of recordsOf(records, packageId)) {
        const groups2 = [record.group, ...(Array.isArray(record.doubleGroup) ? record.doubleGroup : [])].filter(Boolean);
        groups2.forEach(groupId => {
            if (translate[groupId]) return;
            extra[groupId] = groups[groupId] || groupId;
        });
        (Array.isArray(record.clans) ? record.clans : []).forEach(clan => {
            if (!clan || translate[clan]) return;
            extra[clan] = clan;
        });
    }
    return extra;
}

/**
 * 该包要补进 lib.group 的自定义势力：势力不在 lib.group 里时引擎不认它
 * @returns {string[]}
 */
function collectNewGroups(records, packageId, groupList) {
    const known = Array.isArray(groupList) ? groupList : [];
    const ids = new Set();
    for (const record of recordsOf(records, packageId)) {
        [record.group, ...(Array.isArray(record.doubleGroup) ? record.doubleGroup : [])]
            .filter(Boolean)
            .forEach(groupId => {
                if (!known.includes(groupId)) ids.add(groupId);
            });
    }
    return Array.from(ids);
}

/**
 * 草稿里引用到的全部技能 id（写 shya 源码时用）
 * @param {object} records
 * @returns {string[]}
 */
function collectReferencedSkills(records) {
    const ids = new Set();
    Object.values(records || {}).forEach(record => {
        (record && record.skills ? record.skills : []).forEach(id => id && ids.add(id));
    });
    return Array.from(ids);
}

/**
 * 写 shya 源码：`extension/<源码目录>/<技能id>.shya`
 * 只写技能库里**存过源码**的技能；技能被移出草稿时不删文件（可能是用户自己在用的）。
 */
async function writeSkillSources({ data, skillSourcePath, skillIds, skillRecords, onWarn }) {
    for (const id of skillIds) {
        const record = skillRecords[id];
        const source = record && typeof record.source === "string" ? record.source.trim() : "";
        if (!source) continue;
        const path = `extension/${skillSourcePath}/${id}.shya`;
        try {
            await data.writeTextFile(path, `${source}\n`);
        } catch (err) {
            onWarn(`写入技能源码失败：${path}`, err);
        }
    }
}

/**
 * 维护扩展入口里的 import 区块（只有几行，替代老版本那一大段 lib 注入）。
 * 入口不是 ESM（老式 game.import）时就不写 import——那种包要用
 * `lib.init.js("extension/<工作区>/character", "<包id>")` 引入。
 */
async function syncEntryImports({ data, entryPath, entry, packageIds, isModule, onWarn }) {
    const eol = entry.includes("\r\n") ? "\r\n" : "\n";
    const legacyRx = /\/\/#noname-editor-workspace-begin[\s\S]*?\/\/#noname-editor-workspace-end[^\r\n]*\r?\n?/;
    const regionRx = /\/\/#noname-editor-imports-begin[\s\S]*?\/\/#noname-editor-imports-end[^\r\n]*\r?\n?/;
    let next = entry.replace(legacyRx, "");
    if (isModule) {
        const region = [
            "//#noname-editor-imports-begin 由《魂氏编辑器》生成：武将包引入（整块覆盖，勿手改）",
            ...packageIds.map(id => `import "./character/${id}.js";`),
            "//#noname-editor-imports-end"
        ].join(eol) + eol;
        next = regionRx.test(next) ? next.replace(regionRx, region) : region + next;
    } else if (regionRx.test(next)) {
        next = next.replace(regionRx, "");
    }
    if (next === entry) return true;
    try {
        await data.writeTextFile(entryPath, next);
        return true;
    } catch (err) {
        onWarn("写入扩展入口失败", err);
        return false;
    }
}

/**
 * 落盘一个工作区：每个武将包一个 `character/<包id>.js`（含技能定义）+ shya 源码 + 入口 import。
 *
 * @param {object} options
 * @param {object} options.data NonameData（readTextFile / writeTextFile / readFolder）
 * @param {string} options.workspace 工作区（= 扩展名）
 * @param {{packages?: object, sorts?: object}} [options.meta] 武将包 / 分包登记表
 * @param {object} [options.records] x19D6_editor.characters
 * @param {object} [options.skillRecords] x19D6_editor.skills（技能库）
 * @param {{characterPack?: object, imported?: object, skill?: object, translate?: object, group?: string[]}} [options.libRef]
 * @param {object} [options.groups] x19D6_editor.groups（自建势力中文名）
 * @param {string} [options.skillSourcePath] 技能源码目录（相对 extension/，如 `工作区/src/shya`）
 * @param {(message: string, detail?: any) => void} [options.onWarn]
 * @returns {Promise<boolean>}
 */
export async function syncWorkspaceFiles(options = {}) {
    const {
        data,
        workspace,
        meta = {},
        records = {},
        skillRecords = {},
        libRef = {},
        groups = {},
        skillSourcePath = "",
        onWarn = () => {}
    } = options;
    if (!workspace) return false;

    const entryPath = `extension/${workspace}/extension.js`;
    let entry;
    try {
        entry = await data.readTextFile(entryPath);
    } catch (err) {
        onWarn(`读取扩展入口失败：${entryPath}`, err);
        return false;
    }
    if (typeof entry !== "string") return false;

    const isModule = /^\s*(import|export)\s/m.test(entry);
    const translate = libRef.translate || {};
    const coreSkills = await getCoreSkills(data, libRef);
    const packageIds = collectPackageIds(workspace, meta, records);
    const distribution = planSkillDistribution({
        packageIds,
        records,
        coreSkills,
        skillTable: libRef.skill,
        onWarn
    });

    for (const packageId of packageIds) {
        const { text, warnings } = buildCharacterPackageFile({
            packageId,
            packageName: (meta.packages || {})[packageId] || packageId,
            sorts: (meta.sorts || {})[packageId] || {},
            records,
            skillDefs: distribution[packageId] || {},
            translate,
            translateExtra: collectTranslateExtra(records, packageId, groups, translate),
            groups: collectNewGroups(records, packageId, libRef.group)
        });
        warnings.forEach(text2 => onWarn(`技能序列化：${text2}`));
        try {
            await data.writeTextFile(`extension/${workspace}/character/${packageId}.js`, text);
        } catch (err) {
            onWarn(`写入武将包文件失败：${packageId}`, err);
            return false;
        }
    }

    if (skillSourcePath) {
        await writeSkillSources({
            data,
            skillSourcePath,
            skillIds: collectReferencedSkills(records),
            skillRecords,
            onWarn
        });
    }
    return syncEntryImports({ data, entryPath, entry, packageIds, isModule, onWarn });
}
