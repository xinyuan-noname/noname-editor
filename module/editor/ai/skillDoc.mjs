/**
 * 「AI 技能书」的读取（`ai/skill.md`）。
 *
 * 为什么是一个真 `.md` 文件而不是 JS 字符串：
 *  - 用户可以**用记事本/编辑器直接改**它来调教 AI 的设计习惯，不必进游戏；
 *  - 游戏内也能改（改完存进 `x19D6_editor.ai.skill.text`，作为覆盖层，见 ai/store.mjs）。
 *
 * 读取顺序（与 `shya/loader.mjs` 读宿主库同一套路）：
 *  1. 桌面端：`lib.node.fs` 直接读 `window.__dirname/extension/<包名>/module/editor/ai/skill.md`；
 *  2. 网页端：`fetch(new URL("skill.md", import.meta.url))`；
 *  3. 都失败：返回一段**简短兜底**（不是全文，避免两处副本漂移），并提示用户去看文件。
 */

/** skill.md 相对扩展根的路径（设置页「打开资源管理器」时也用得上） */
export const SKILL_DOC_RELATIVE = "module/editor/ai/skill.md";

/** 读不到文件时的兜底（故意只写最要紧的几条，不复制全文） */
export const SKILL_DOC_FALLBACK = [
    "（没能读到 ai/skill.md —— 桌面端会在扩展目录里读它，网页端会 fetch 它。）",
    "先按这几条来：4 血配 1 个技能、3 血配 2 个技能；单个技能每回合收益控制在 1~2 张牌；",
    "禁止无限摸牌、无条件清场、无代价持续回血；shya 里属性与方法用空格不用点（player hp / player draw(1)），",
    "只能用机器契约里列出的 API；描述必须写清时机、条件、目标、效果与次数限制。"
].join("\n");

/**
 * 扩展包名。别写死「魂氏编辑器」——从模块自身的 URL 反推，改名/复制包也能跑
 * （与 characterCard.mjs 同一套做法）。
 * @returns {string}
 */
export function extensionName() {
    try {
        const url = decodeURIComponent(String(import.meta.url || ""));
        const matched = /\/extension\/([^/]+)\//.exec(url);
        if (matched) return matched[1];
    } catch (err) { /* 退到默认 */ }
    return "魂氏编辑器";
}

/**
 * 读技能书正文
 * @returns {Promise<{ text: string, source: "file"|"fetch"|"fallback" }>}
 */
export async function loadSkillDoc() {
    //① 桌面端：node fs（最快，也最可靠）
    try {
        const { lib } = await import("../../../../../noname.js");
        const fs = lib && lib.node && lib.node.fs;
        const root = typeof window !== "undefined" ? window.__dirname : "";
        if (fs && fs.readFileSync && root) {
            const file = `${root}/extension/${extensionName()}/${SKILL_DOC_RELATIVE}`;
            const text = fs.readFileSync(file, "utf-8");
            if (text && text.trim()) return { text, source: "file" };
        }
    } catch (err) { /* 交给 fetch 通道 */ }
    //② 网页端：按模块自身的 URL 取同目录的 skill.md
    try {
        const response = await fetch(new URL("skill.md", import.meta.url));
        if (response.ok) {
            const text = await response.text();
            if (text && text.trim()) return { text, source: "fetch" };
        }
    } catch (err) { /* 退到兜底 */ }
    return { text: SKILL_DOC_FALLBACK, source: "fallback" };
}
