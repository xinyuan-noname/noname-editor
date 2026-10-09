"use script";
/**
 * 版本与更新 · 本地版本信息
 *
 * 「本地版本」由三部分拼出来（哪个有就用哪个）：
 *   git 检出  → .git/HEAD 指向的提交（sha / 日期 / 提交信息取 .git/logs/HEAD 的最后一行）
 *   zip 安装  → module/editor/update/installed.json（更新器安装时写入）
 *   info.json → 版本号（永远读得到）
 *
 * 这里刻意**不调用 git 命令**：用户的游戏目录不一定有 git，子进程在沙箱/打包环境下也不可靠；
 * 直接读 .git 里的文本文件就够了（HEAD + refs + logs/HEAD），零依赖。
 *
 * 本文件不依赖任何 noname 全局量（data 由调用方注入，实现 NonameData 的读文件接口），
 * 可以在 Node 里直接 import 做自检。
 */

import { REPO } from "./mirrors.mjs";

/** 更新器安装记录的文件名（相对包根） */
export const INSTALLED_FILE = "module/editor/update/installed.json";

/**
 * 由模块自身的 URL 反推扩展包名与包根（不写死「魂氏编辑器」）。
 * version.mjs 在 <包根>/module/editor/update/ 下，所以往上三级就是包根。
 * @param {string} [metaUrl]
 * @returns {{name:string, root:string, dir:string}}
 */
export function resolvePackage(metaUrl = import.meta.url) {
    const text = String(metaUrl || "");
    try {
        const dir = new URL("../../../", text);
        const decoded = decodeURIComponent(dir.pathname).replace(/\\/g, "/");
        const segments = decoded.split("/").filter(Boolean);
        const name = segments[segments.length - 1] || "";
        if (name) return { name, root: `extension/${name}`, dir: dir.href };
    } catch (err) { /* 退到正则兜底 */ }
    const decoded = decodeURIComponent(text).replace(/\\/g, "/");
    const match = /\/extension\/([^/]+)\//.exec(decoded);
    if (match) return { name: match[1], root: `extension/${match[1]}`, dir: "" };
    return { name: REPO.label, root: `extension/${REPO.label}`, dir: "" };
}

/** 读文本，不存在或出错一律给空串（.git 文件缺失是正常情况） */
export async function readTextSafe(data, path) {
    try {
        const text = await data.readTextFile(path);
        return typeof text === "string" ? text : "";
    } catch (err) {
        return "";
    }
}

/** 读二进制，不存在或出错给 null */
export async function readBinarySafe(data, path) {
    try {
        const buffer = await data.readBinaryFile(path);
        if (!buffer) return null;
        if (buffer instanceof Uint8Array) return buffer;
        if (buffer instanceof ArrayBuffer) return new Uint8Array(buffer);
        return new Uint8Array(buffer);
    } catch (err) {
        return null;
    }
}

/** @param {object} data @param {string} path */
export async function fileExists(data, path) {
    return (await readBinarySafe(data, path)) !== null;
}

/** 宽松 JSON 解析：脏数据一律给 null，不抛错 */
export function parseJson(text) {
    if (typeof text !== "string" || !text.trim()) return null;
    try {
        const value = JSON.parse(text);
        return value && typeof value === "object" ? value : null;
    } catch (err) {
        return null;
    }
}

/** @param {string} sha */
export function shortSha(sha) {
    const text = String(sha || "").trim();
    return /^[0-9a-f]{7,40}$/i.test(text) ? text.slice(0, 7) : text;
}

/**
 * 解析 .git/HEAD
 * @param {string} text
 * @returns {{type:"ref",ref:string}|{type:"sha",sha:string}|null}
 */
export function parseGitHead(text) {
    const content = String(text || "").trim();
    if (!content) return null;
    const ref = /^ref:\s*(\S+)$/.exec(content);
    if (ref) return { type: "ref", ref: ref[1] };
    if (/^[0-9a-f]{40}$/i.test(content)) return { type: "sha", sha: content };
    return null;
}

/**
 * 从 .git/packed-refs 里取某个 ref 的 sha（.git/refs/heads/main 不存在时才用得上）
 * @param {string} text
 * @param {string} ref
 */
export function parsePackedRefs(text, ref) {
    const lines = String(text || "").split(/\r?\n/);
    for (const line of lines) {
        if (!line || line.startsWith("#") || line.startsWith("^")) continue;
        const [sha, name] = line.trim().split(/\s+/);
        if (name === ref && /^[0-9a-f]{40}$/i.test(sha || "")) return sha;
    }
    return "";
}

/**
 * 解析 .git/logs/HEAD 的最后一行：
 *   <old> <new> <name> <email> <ts> <tz>\t<message>
 * @param {string} text
 * @returns {{sha:string, timestamp:number, message:string, subject:string}|null}
 */
export function parseReflogTail(text) {
    const lines = String(text || "").split(/\r?\n/).filter(line => line.trim());
    if (!lines.length) return null;
    const line = lines[lines.length - 1];
    const tabIndex = line.indexOf("\t");
    const left = tabIndex >= 0 ? line.slice(0, tabIndex) : line;
    const message = tabIndex >= 0 ? line.slice(tabIndex + 1).trim() : "";
    const fields = left.trim().split(/\s+/);
    const sha = fields[1] || "";
    const timestamp = Number(fields[4] || 0);
    return {
        sha: /^[0-9a-f]{40}$/i.test(sha) ? sha : "",
        timestamp: Number.isFinite(timestamp) ? timestamp : 0,
        message,
        //reflog 的消息形如「commit: xxx」/「commit (initial): xxx」/「checkout: …」
        subject: message.replace(/^commit(\s*\([^)]*\))?:\s*/, "")
    };
}

/**
 * 读 git 检出信息（HEAD + refs + packed-refs + logs/HEAD）
 * @param {object} data
 * @param {string} pkgRoot 如 extension/魂氏编辑器
 * @returns {Promise<{sha:string,short:string,date:string,subject:string,ref:string}|null>}
 */
export async function readGitInfo(data, pkgRoot) {
    const head = parseGitHead(await readTextSafe(data, `${pkgRoot}/.git/HEAD`));
    if (!head) return null;
    let sha = "";
    let ref = "";
    if (head.type === "sha") {
        sha = head.sha;
    } else {
        ref = head.ref;
        sha = (await readTextSafe(data, `${pkgRoot}/.git/${ref}`)).trim();
        if (!/^[0-9a-f]{40}$/i.test(sha)) {
            sha = parsePackedRefs(await readTextSafe(data, `${pkgRoot}/.git/packed-refs`), ref);
        }
    }
    if (!/^[0-9a-f]{40}$/i.test(sha)) return null;
    const reflog = parseReflogTail(await readTextSafe(data, `${pkgRoot}/.git/logs/HEAD`));
    const matches = reflog && reflog.sha === sha ? reflog : null;
    return {
        sha,
        short: shortSha(sha),
        ref,
        date: matches && matches.timestamp ? new Date(matches.timestamp * 1000).toISOString() : "",
        subject: matches ? matches.subject : ""
    };
}

/**
 * 读更新器的安装记录（installed.json）
 * @param {object} data
 * @param {{pkgRoot:string}} options
 */
export async function readInstalledRecord(data, { pkgRoot }) {
    const record = parseJson(await readTextSafe(data, `${pkgRoot}/${INSTALLED_FILE}`));
    if (!record) return null;
    return {
        sha: typeof record.sha === "string" ? record.sha : "",
        version: typeof record.version === "string" ? record.version : "",
        ref: typeof record.ref === "string" ? record.ref : "",
        subject: typeof record.subject === "string" ? record.subject : "",
        installedAt: typeof record.installedAt === "string" ? record.installedAt : "",
        source: typeof record.source === "string" ? record.source : ""
    };
}

/**
 * 写安装记录
 * @param {object} data
 * @param {{pkgRoot:string}} options
 * @param {object} record
 */
export async function writeInstalledRecord(data, { pkgRoot }, record) {
    const path = `${pkgRoot}/${INSTALLED_FILE}`;
    await data.writeTextFile(path, JSON.stringify(record, null, 4) + "\n");
    return path;
}

/**
 * 汇总本地版本
 * @param {object} data
 * @param {{pkgRoot?:string}} [options]
 */
export async function readLocalVersion(data, options = {}) {
    const { name, root } = resolvePackageRoot(options);
    const pkgRoot = options.pkgRoot || root;
    const info = parseJson(await readTextSafe(data, `${pkgRoot}/info.json`)) || {};
    const git = await readGitInfo(data, pkgRoot);
    const installed = await readInstalledRecord(data, { pkgRoot });
    const version = String(info.version || (installed && installed.version) || "");
    const sha = (git && git.sha) || (installed && installed.sha) || "";
    const date = (git && git.date) || (installed && installed.installedAt) || "";
    const subject = (git && git.subject) || (installed && installed.subject) || "";
    const source = git && git.sha ? "git" : installed && installed.sha ? "installed" : "package";
    return {
        name,
        pkgRoot,
        version,
        sha,
        short: shortSha(sha),
        date,
        subject,
        source,
        author: String(info.author || ""),
        info,
        installed
    };
}

/**
 * @param {{pkgRoot?:string, metaUrl?:string}} [options]
 */
function resolvePackageRoot(options = {}) {
    if (options.pkgRoot) {
        const name = options.pkgRoot.split("/").filter(Boolean).pop() || "";
        return { name, root: options.pkgRoot };
    }
    return resolvePackage(options.metaUrl || import.meta.url);
}

/**
 * 版本号比较（够用即可：v1.2.3 / 1.2 / 1.2.3-beta.1）
 * @param {string} a
 * @param {string} b
 * @returns {number} a>b 给 1，a<b 给 -1，相等给 0
 */
export function compareVersions(a, b) {
    const parse = value => {
        const text = String(value == null ? "" : value).trim().replace(/^v/i, "");
        const [core, ...rest] = text.split("-");
        const numbers = core.split(".").map(part => {
            const num = parseInt(part, 10);
            return Number.isFinite(num) ? num : 0;
        });
        return { numbers, pre: rest.join("-") };
    };
    const left = parse(a);
    const right = parse(b);
    const length = Math.max(left.numbers.length, right.numbers.length);
    for (let index = 0; index < length; index++) {
        const l = left.numbers[index] || 0;
        const r = right.numbers[index] || 0;
        if (l > r) return 1;
        if (l < r) return -1;
    }
    if (left.pre && !right.pre) return -1;
    if (!left.pre && right.pre) return 1;
    if (left.pre === right.pre) return 0;
    return left.pre > right.pre ? 1 : -1;
}

/** ISO / 时间戳 → 「2026-10-09 22:07」（本地时区）；空值给空串 */
export function formatTimestamp(value) {
    if (!value) return "";
    const date = typeof value === "number" ? new Date(value * 1000) : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const pad = num => String(num).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 组装「v1.1.0 · 83df0c3 · 2026-10-09 22:00」这类单行摘要 */
export function describeLocal(local) {
    if (!local) return "未知";
    const parts = [];
    if (local.version) parts.push(`v${String(local.version).replace(/^v/i, "")}`);
    if (local.short) parts.push(local.short);
    if (local.date) parts.push(formatTimestamp(local.date));
    return parts.join(" · ") || "未知";
}
