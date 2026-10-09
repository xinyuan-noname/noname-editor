/**
 * shya 技能源码的「编译前 / 编译后」处理（纯逻辑模块）。
 *
 * 为什么需要这一层：扩展里的 shya 编译器（wasm_api.cpp 的 `shya_compile`）
 * **只把技能渲染成一个模块级常量**，实测产物形如：
 *     const ai_test_skill = { trigger: { player: "phaseJieshuBegin" }, … };
 * 它既不是 `lib.skill.ai_test_skill = {…}`，也不会把 translation/description
 * 归位到 `lib.translate` —— 「注入侧」还没做（SKILL.md §12 待办）。
 * 而武将编辑器要显示技能卡，前提是 `lib.skill[id]` 真的存在（data-noname.mjs:32
 * 的 parseSkill 第一行就 `if (!(skillId in lib.skill)) return null`）。
 *
 * 所以这里负责两件小事，都在编译产物的**文本层面**做，不碰编译器：
 *  1. `ensureHostImports`：编译前注入宿主宏库的 import（与 shya 编辑器同一约定）；
 *  2. `injectSkillRegistration`：编译后把 `const <id> = {…}` 注册成
 *     `lib.skill[<id>]` 并把技能名/描述写进 `lib.translate`。
 */

/** 宿主宏库的 import（编辑器编译前会自动注入；这里保持一致，避免用户手写漏掉） */
export const HOST_IMPORT_LINES = [
    'import "./host/skill-type.shya"',
    'import "./host/skill-content.shya"'
];

/**
 * 只注入技能类型宏库的那一行。
 * @deprecated 用 `HOST_IMPORT_LINES`（两个宏库都要）。
 */
export const HOST_IMPORT_LINE = HOST_IMPORT_LINES[0];

/**
 * 编译前：确保源码顶部有宿主宏库的 import —— 两个宏库**各自**判断缺失，用户手写了哪个就不重复注入。
 *
 * ⚠️ 两个都要：`skill-type.shya` 是技能骨架宏（@skill_trigger 等），`skill-content.shya` 是
 * `@draw` / `@damage` / `@judge_color` 这批内容宏。只注入前者时，AI 按提示词写下的内容宏会以
 * 「宏未定义」编译失败（2026-10 做「生成技能」时踩到——提示词教了内容宏，注入侧却没带库）。
 * 与 shya 编辑器 `component-shyaEditor.prepareSource` / `hostImportEntries` 同一约定。
 * @param {string} source
 * @param {{content?:boolean}} [options] `content:false` 只注入技能类型宏库
 * @returns {{source:string, injected:number, imports:string[]}} 注入后的源码、**实际注入行数**（诊断行号按它回退）与注入了哪几行
 */
export function ensureHostImports(source, options = {}) {
    const text = String(source || "");
    const wanted = options.content === false ? HOST_IMPORT_LINES.slice(0, 1) : HOST_IMPORT_LINES;
    const missing = wanted.filter(line => {
        const raw = line.replace(/^import\s+["']/, "").replace(/["']$/, "");
        return !new RegExp(`^\\s*import\\s+["'][^"']*${escapeRegExp(raw)}["']`, "m").test(text);
    });
    if (!missing.length) return { source: text, injected: 0, imports: [] };
    return { source: `${missing.join("\n")}\n${text}`, injected: missing.length, imports: missing };
}

/**
 * 兼容旧名：等价于 `ensureHostImports`（两个宏库都注入）。
 * @param {string} source
 * @returns {{source:string, injected:number, imports:string[]}}
 */
export function ensureHostImport(source) {
    return ensureHostImports(source);
}

/** 技能 id 合法标识符（生成代码里当变量名用，必须能过 new Function） */
export function isValidSkillId(id) {
    return typeof id === "string" && /^[A-Za-z_$][\w$]*$/.test(id);
}

/** 从源码里抠出 `#skill:` 槽的值 */
export function skillIdFromSource(source) {
    const matched = /#skill:\s*([A-Za-z_$][\w$]*)/.exec(String(source || ""));
    return matched ? matched[1] : "";
}

function escapeRegExp(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 编译后：把 `const <id> = {…}` 变成真正注册进引擎的技能。
 *
 * ⚠️ 依赖两件事（都实测过）：
 *  - 编译器用 `#skill:` 的值当产物里的变量名，所以 `const <id>` 一定同名；
 *  - 产物里没有 `import`（宿主宏库在编译期被展开），所以能直接塞进 `new Function`。
 * 找不到声明时**明确报错**，不猜、不改名——静默生成错误代码比报错更坑。
 *
 * @param {string} code 编译器产物
 * @param {string} skillId
 * @param {{name?:string, description?:string}} [fallback] 技能没写 translation/description 时用的兜底
 * @returns {{ok:true, code:string}|{ok:false, reason:string}}
 */
export function injectSkillRegistration(code, skillId, fallback = {}) {
    const source = String(code || "");
    if (!isValidSkillId(skillId)) return { ok: false, reason: `技能 id「${skillId}」不是合法标识符（只能字母/数字/下划线，且不能数字开头）` };
    const declared = new RegExp(`(?:^|[\\s;])(?:const|let|var)\\s+${escapeRegExp(skillId)}\\s*=`);
    if (!declared.test(source)) {
        return { ok: false, reason: `编译产物里没有找到 \`const ${skillId} = …\`：请检查源码里的 #skill 槽是否为 ${skillId}` };
    }
    //防御：万一产物是模块形态（带 export），new Function 会直接语法报错，先把 export 摘掉
    const stripped = source.replace(/^export\s+(?=(?:const|let|var|function|class)\b)/gm, "");
    const key = JSON.stringify(skillId);
    const name = JSON.stringify(String(fallback.name || ""));
    const info = JSON.stringify(String(fallback.description || ""));
    return {
        ok: true,
        code: [
            stripped,
            "",
            `lib.skill[${key}] = ${skillId};`,
            `lib.translate[${key}] = ${skillId}.translation || ${name} || ${key};`,
            `lib.translate[${key} + "_info"] = ${skillId}.description || ${info} || "";`
        ].join("\n")
    };
}
