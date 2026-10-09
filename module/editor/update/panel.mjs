"use script";
/**
 * 版本与更新 · 界面联动层
 *
 * 这一层是「纯逻辑模块」与「编辑器界面」之间唯一的桥：
 *   - 设置页（component-setting.mjs）用它检查 / 更新 / 选版本
 *   - api.mjs 打开编辑器时用它做自动检查、往标题栏挂版本徽标
 * 所有弹窗都走 <noname-dialog>，并且**必须挂在 ui.window**：
 * 设置页在窄侧栏里，dialog 的 :host 是 position:absolute，
 * 挂进侧栏组件的 shadowRoot 会被面板的 overflow 裁掉（项目历史坑）。
 */

import { ui } from "../../../../../noname.js";
import { NonameData } from "../data-noname.mjs";
import { AUTO_MIRROR, MIRRORS, getMirror, mirrorOptions, describeAttempts } from "./mirrors.mjs";
import { readLocalVersion, describeLocal, formatTimestamp, resolvePackage } from "./version.mjs";
import { checkRemote, listVersions, UPDATE_STATE, stateLabel } from "./checker.mjs";
import { downloadAndInstall, buildDownloadPlan } from "./installer.mjs";

/** 持久化根键（其余键都在它下面：autoCheck / mirror / cache / notified） */
export const UPDATE_MEMBER = "x19D6_editor.update";
/** 同一会话里两次自动检查的最小间隔，防止连点「打开编辑器」把接口打爆 */
export const AUTO_CHECK_MIN_GAP = 60000;

const PKG = resolvePackage();
export const PACKAGE_ROOT = PKG.root;
export const PACKAGE_NAME = PKG.name;
/** 有更新时的徽标红点类名（style/index.css） */
export const TITLE_BADGE_CLASS = "xy-ED-title-version";

export { AUTO_MIRROR, MIRRORS, mirrorOptions, getMirror, describeAttempts, UPDATE_STATE, stateLabel, describeLocal, formatTimestamp, buildDownloadPlan };

let server = null;
/** 面板/自动检查共用的数据层（懒建，避免模块加载期就去摸 lib.config） */
export function updateData() {
    if (!server) server = new NonameData();
    return server;
}

/** @param {string} member @param {*} fallback */
export function readUpdateConfig(member, fallback) {
    const value = updateData().getConfig(`${UPDATE_MEMBER}.${member}`);
    return value === null || value === undefined ? fallback : value;
}

/** @param {string} member @param {*} value */
export function writeUpdateConfig(member, value) {
    return updateData().writeConfig(`${UPDATE_MEMBER}.${member}`, value);
}

/** 上一次检查的结果（落配置，重开编辑器也能看到） */
export function readCache() {
    const cache = readUpdateConfig("cache", null);
    return cache && typeof cache === "object" ? cache : null;
}

/** 徽标用的紧凑版本串：v1.1.0 · 83df0c3 */
export function compactLocal(local) {
    if (!local) return "版本未知";
    const parts = [];
    const version = String(local.version || "").replace(/^v/i, "");
    if (version) parts.push(`v${version}`);
    if (local.short) parts.push(local.short);
    return parts.join(" · ") || "版本未知";
}

/** attempts 压成可落配置的短字符串数组 */
function summarizeAttempts(attempts) {
    if (!Array.isArray(attempts)) return [];
    const seen = new Set();
    const list = [];
    for (const item of attempts) {
        const label = String((item && item.label) || (item && item.mirror) || "");
        if (!label || seen.has(label)) continue;
        seen.add(label);
        list.push(`${label}${item.error ? "✗" : item.ok ? "✓" : `HTTP ${item.status}`}`);
    }
    return list;
}

/* ------------------------------------------------------------------ 检查 */

/**
 * 检查更新并把结果落进配置
 * @param {{mirror?:string, timeout?:number, onProgress?:(stage:string,detail?:string)=>void}} [options]
 */
export async function runCheck(options = {}) {
    const { mirror, timeout, onProgress } = options;
    const data = updateData();
    const preferred = mirror || readUpdateConfig("mirror", AUTO_MIRROR);
    const result = await checkRemote({ data, preferred, timeout, onProgress });
    writeUpdateConfig("cache", {
        at: result.at,
        state: result.state,
        reason: result.reason,
        error: result.error || "",
        mirrorId: (result.mirror && result.mirror.id) || "",
        mirrorLabel: (result.mirror && result.mirror.label) || "",
        attempts: summarizeAttempts(result.attempts),
        local: result.local
            ? { version: result.local.version, sha: result.local.sha, short: result.local.short, date: result.local.date, source: result.local.source }
            : null,
        remote: result.remote || null,
        release: result.release ? { tag: result.release.tag, version: result.release.version, publishedAt: result.release.publishedAt } : null,
        target: result.target || null
    });
    return result;
}

/** 只读本地版本（设置页打开时先渲染这一条） */
export async function readLocal() {
    return readLocalVersion(updateData());
}

/** 设置页/对话用的状态说明 */
export function describeCheck(result) {
    if (!result) return "尚未检查";
    const label = stateLabel(result.state);
    const pieces = [label.text];
    if (result.reason) pieces.push(result.reason);
    return pieces.join("：");
}

/**
 * 安装进度 → 一行中文（设置页提示行用）
 * @param {{phase?:string,label?:string,loaded?:number,total?:number,count?:number,index?:number,path?:string}} info
 */
export function describeProgress(info) {
    if (!info) return "";
    switch (info.phase) {
        case "download": {
            const percent = info.total ? ` ${Math.round((info.loaded || 0) / info.total * 100)}%` : (info.loaded ? ` ${Math.round(info.loaded / 1024)} KB` : "");
            return `下载中：${info.label || ""}${percent}`;
        }
        case "extract":
            return `解包校验：${info.label || ""}`;
        case "install":
            return `准备安装 ${info.count || 0} 个文件…`;
        case "write":
            return `写入 ${info.index || 0}/${info.count || 0}：${info.path || ""}`;
        default:
            return String(info.phase || "");
    }
}

/* ---------------------------------------------------------------- 标题徽标 */

/**
 * 往标题栏挂版本徽标（`<span class="xy-ED-title-version">`）。
 * 刻意**不改 html/index.html**：那个文件是别人的在建改动，运行时插入同样稳。
 * @param {{operationPage?:HTMLElement}} view
 */
export function ensureTitleBadge(view) {
    const title = view && view.operationPage && view.operationPage.querySelector(".xy-ED-title");
    if (!title) return null;
    let node = title.querySelector("." + TITLE_BADGE_CLASS);
    if (!node) {
        node = document.createElement("span");
        node.className = TITLE_BADGE_CLASS;
        title.appendChild(node);
    }
    return node;
}

/**
 * 写入徽标内容与状态配色
 * @param {object} view
 * @param {{local?:object, state?:string, reason?:string, label?:string, at?:string}} info
 */
export function renderTitleBadge(view, info = {}) {
    const node = ensureTitleBadge(view);
    if (!node) return null;
    const local = info.local || null;
    const state = info.state || "";
    const tone = (state && stateLabel(state).tone) || "muted";
    node.textContent = compactLocal(local);
    node.classList.remove("xy-ED-title-version-ok", "xy-ED-title-version-new", "xy-ED-title-version-warn", "xy-ED-title-version-error", "xy-ED-title-version-muted");
    node.classList.add(`xy-ED-title-version-${tone}`);
    const tips = [];
    if (local && local.date) tips.push(`提交时间 ${formatTimestamp(local.date)}`);
    if (local && local.subject) tips.push(local.subject);
    if (info.label) tips.push(info.label);
    if (info.reason) tips.push(info.reason);
    if (info.at) tips.push(`上次检查 ${formatTimestamp(info.at)}`);
    node.title = tips.length ? `魂氏编辑器 ${compactLocal(local)}\n${tips.join("\n")}` : `魂氏编辑器 ${compactLocal(local)}`;
    return node;
}

/**
 * 读本地版本 + 缓存状态刷新徽标
 * @param {object} view
 * @param {object|null} [result] 刚检查完的结果（有就直接用，省一次读盘）
 */
export async function refreshTitleBadge(view, result = null) {
    let local = (result && result.local) || null;
    if (!local) {
        try {
            local = await readLocal();
        } catch (err) {
            local = null;
        }
    }
    const cache = readCache() || {};
    return renderTitleBadge(view, {
        local,
        state: (result && result.state) || cache.state || "",
        reason: (result && result.reason) || cache.reason || "",
        label: (result && result.label) || (cache.state ? stateLabel(cache.state).text : ""),
        at: (result && result.at) || cache.at || ""
    });
}

/* ---------------------------------------------------------------- 自动检查 */

let lastAutoCheckAt = 0;

/**
 * 打开编辑器时的自动检查：静默、不阻塞；发现新版本时同一提交只提示一次。
 * @param {object} view
 * @param {{force?:boolean, notify?:boolean}} [options]
 */
export async function autoCheckOnOpen(view, options = {}) {
    const { force = false, notify = true } = options;
    try {
        await refreshTitleBadge(view);
    } catch (err) { /* 徽标失败不影响使用 */ }
    if (!force && !readUpdateConfig("autoCheck", true)) return null;
    const now = Date.now();
    if (!force && now - lastAutoCheckAt < AUTO_CHECK_MIN_GAP) return null;
    lastAutoCheckAt = now;
    let result = null;
    try {
        result = await runCheck();
    } catch (err) {
        console.warn("[魂氏编辑器] 自动检查更新失败", err);
        return null;
    }
    try {
        await refreshTitleBadge(view, result);
    } catch (err) { /* 同上 */ }
    if (notify) await notifyIfNeeded(result);
    return result;
}

/**
 * 发现新版本时提示一次（同一目标只提示一次，记在 update.notified）
 * @param {object|null} result
 */
export async function notifyIfNeeded(result) {
    if (!result || result.state !== UPDATE_STATE.AVAILABLE || !result.target) return false;
    const ref = String(result.target.ref || "");
    if (!ref || readUpdateConfig("notified", "") === ref) return false;
    if (typeof document === "undefined") return false;
    writeUpdateConfig("notified", ref);
    const message = [
        result.target.label,
        `当前：${describeLocal(result.local)}`,
        result.reason || ""
    ].filter(Boolean).join("\n");
    const picked = await askDialog({
        type: "choose",
        headline: "魂氏编辑器有新版本",
        message,
        payload: ["立即更新", "稍后再说"]
    });
    if (picked === 0) {
        await installUpdate({ target: result.target, release: result.release });
    }
    return true;
}

/* ------------------------------------------------------------------ 安装 */

/**
 * 一键更新 / 安装指定版本
 * @param {{
 *   target?: object|null, release?: object|null, onProgress?: (info:object)=>void,
 *   skipConfirm?: boolean
 * }} [options]
 */
export async function installUpdate(options = {}) {
    const { target = null, release = null, onProgress, skipConfirm = false } = options;
    const data = updateData();
    const preferred = readUpdateConfig("mirror", AUTO_MIRROR);
    let local = null;
    try {
        local = await readLocal();
    } catch (err) { /* 本地版本读不到不阻塞更新 */ }
    const summary = await downloadAndInstall({
        data,
        pkgRoot: PACKAGE_ROOT,
        target,
        release,
        preferred,
        onProgress,
        confirm: skipConfirm
            ? null
            : async info => confirmInstall({ local, target, release, ...info })
    });
    if (summary.ok) {
        //更新成功：本地版本变了，把缓存与徽标指向刚装上的目标
        writeUpdateConfig("cache", {
            at: new Date().toISOString(),
            state: UPDATE_STATE.UP_TO_DATE,
            reason: `已更新到 ${summary.version ? "v" + summary.version : (target && target.label) || "最新"}`,
            local: { version: summary.version, sha: target && target.kind === "commit" ? target.ref : "", short: target && target.kind === "commit" ? String(target.ref).slice(0, 7) : "", date: new Date().toISOString(), source: "installed" },
            remote: null,
            release: null,
            target: null,
            mirrorId: (summary.mirror && summary.mirror.id) || "",
            mirrorLabel: (summary.mirror && summary.mirror.label) || "",
            attempts: []
        });
    }
    return summary;
}

/** 安装前的二次确认（列出包内文件数、目标版本、备份位置） */
async function confirmInstall({ local, target, pkg, candidate }) {
    const lines = [
        `目标：${(target && target.label) || candidate.label}`,
        `当前：${describeLocal(local)}`,
        `下载源：${candidate.label}`,
        `包内文件：${pkg.count} 个（顶层目录 ${pkg.root || "无"}）`,
        "",
        "将把包内文件覆盖到扩展目录，被覆盖的旧文件会先备份到 backup/update-<时间戳>/。",
        "包里没有的文件（你的素材、backup/、.git）不会被删除。"
    ];
    if (local && local.source === "git") {
        lines.push("", "⚠ 当前扩展目录是 git 检出：本地未提交的改动也会被一起覆盖。");
    }
    lines.push("", "更新完成后需要重启游戏才会生效。");
    return Boolean(await askDialog({
        type: "confirm",
        headline: "确认更新",
        message: lines.join("\n")
    }));
}

/**
 * 「选择版本」：列出 Release 标签 + 最近提交，选中后走同一条安装链路（可回退）
 * @param {{onProgress?:(info:object)=>void, perPage?:number}} [options]
 */
export async function chooseAndInstallVersion(options = {}) {
    const { onProgress, perPage = 20 } = options;
    const data = updateData();
    const preferred = readUpdateConfig("mirror", AUTO_MIRROR);
    let versions = null;
    try {
        versions = await listVersions({ data, preferred, perPage });
    } catch (err) {
        await askDialog({ type: "alert", headline: "拉取版本列表失败", message: String((err && err.message) || err) });
        return null;
    }
    if (versions.error && !versions.releases.length && !versions.commits.length) {
        await askDialog({ type: "alert", headline: "拉取版本列表失败", message: versions.error });
        return null;
    }
    const map = {};
    const table = new Map();
    for (const release of versions.releases) {
        const key = `release:${release.tag}`;
        map[key] = `【发布版】${release.tag}${release.publishedAt ? " · " + formatTimestamp(release.publishedAt) : ""}`;
        table.set(key, { kind: "release", ref: release.tag, version: release.version, label: `发布版 ${release.tag}`, release });
    }
    for (const commit of versions.commits) {
        const key = `commit:${commit.sha}`;
        const current = versions.local && versions.local.sha === commit.sha ? "（当前版本）" : "";
        map[key] = `${commit.short}${current} · ${formatTimestamp(commit.date)} · ${commit.message}`;
        table.set(key, { kind: "commit", ref: commit.sha, version: "", label: `提交 ${commit.short}`, commit });
    }
    if (!Object.keys(map).length) {
        await askDialog({ type: "alert", headline: "没有可选版本", message: "远端既没有 Release 也没有返回提交。" });
        return null;
    }
    const picked = await askSelectDialog({
        headline: "选择要安装的版本",
        message: `当前：${describeLocal(versions.local)}\n选中的版本会被下载并覆盖安装（可用来回退）。`,
        map
    });
    if (!picked) return null;
    const target = table.get(picked);
    if (!target) return null;
    const summary = await installUpdate({
        target: { kind: target.kind, ref: target.ref, version: target.version, label: target.label },
        release: target.release || null,
        onProgress
    });
    await reportInstall(summary);
    return summary;
}

/** 更新完成/失败后的结果提示 */
export async function reportInstall(summary) {
    if (!summary) return;
    if (summary.cancelled) return;
    if (summary.ok) {
        const lines = [
            `已安装：${summary.label || ""}`,
            `版本：${summary.version ? "v" + summary.version : "未记录"}`,
            `写入 ${summary.written.length} 个文件${summary.skipped.length ? `（跳过 ${summary.skipped.length} 个空文件）` : ""}`,
            summary.backedUp.length ? `备份 ${summary.backedUp.length} 个旧文件到 ${summary.backupDir}` : "没有旧文件需要备份",
            `来源镜像：${(summary.mirror && summary.mirror.label) || "直连"}`,
            "",
            "请重启游戏（或重新打开编辑器）让新代码生效。"
        ];
        await askDialog({ type: "alert", headline: "更新完成", message: lines.join("\n") });
        return;
    }
    const lines = [summary.error || "更新失败"];
    if (summary.failed && summary.failed.length) {
        lines.push("", ...summary.failed.slice(0, 8).map(item => `✗ ${item.path}（${item.phase}）：${item.error}`));
    }
    if (summary.errors && summary.errors.length) {
        lines.push("", ...summary.errors.slice(0, 6).map(item => `✗ ${item.label}：${item.error}`));
    }
    await askDialog({ type: "alert", headline: "更新失败", message: lines.join("\n") });
}

/* ------------------------------------------------------------------ 弹窗 */

/**
 * 建 <noname-dialog>：**顺序必须是 payload → type → headline/message**
 * （payload 不在 observedAttributes 里，而 type 分支当场读它；headline/message 又会被 type 分支清空）
 */
function createDialog(config = {}) {
    const { type, payload, headline, message, single = false } = config;
    const dialog = document.createElement("noname-dialog");
    if (payload !== undefined && payload !== null) {
        dialog.setAttribute("payload", typeof payload === "string" ? payload : JSON.stringify(payload));
    }
    if (type) dialog.setAttribute("type", type);
    if (single) dialog.setAttribute("single", "true");
    if (headline) dialog.setAttribute("headline", headline);
    if (message) dialog.setAttribute("message", message);
    (ui.window || document.body).appendChild(dialog);
    return dialog;
}

/** 弹一次并等结果（元素自带关闭逻辑，这里只是兜底 remove） */
async function askDialog(config) {
    const dialog = createDialog(config);
    try {
        return await dialog.wait();
    } catch (err) {
        return null;
    } finally {
        dialog.remove();
    }
}

/** search-select 单选：点选即出结果，但**不会自动关窗**，必须自己 remove */
async function askSelectDialog({ headline, message, map }) {
    const dialog = createDialog({ type: "search-select", payload: map, headline, message, single: true });
    try {
        return await dialog.wait();
    } catch (err) {
        return null;
    } finally {
        dialog.remove();
    }
}
