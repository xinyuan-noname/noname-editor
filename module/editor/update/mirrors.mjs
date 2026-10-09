"use script";
/**
 * 版本与更新 · 镜像源与网络层
 *
 * gh-proxy 系镜像的用法是「把原始 GitHub 绝对地址直接拼在镜像域名后面」：
 *   https://gh-proxy.org/https://api.github.com/repos/owner/repo
 * 官方文档（https://gh-proxy.com/docs/github-accelerator）里 Archive / Raw / Release / API
 * 都是这一个拼法，所以这里只需要一个 applyMirror()。
 *
 * 本文件不依赖任何 noname 全局量，可以在 Node 里直接 import 做自检
 * （update-check.mjs 会传 mirrors 覆盖项，用本地 http 服务测轮询与回退）。
 */

/** 被更新/检查的目标仓库 */
export const REPO = {
    owner: "xinyuan-noname",
    name: "noname-editor",
    branch: "main",
    slug: "xinyuan-noname/noname-editor",
    label: "魂氏编辑器"
};

/**
 * 镜像源：用户提供的 5 个 gh-proxy 节点 + 直连兜底。
 * 直连放在最后——它是唯一不受第三方可用性影响的通道，但在墙内常常连不上。
 */
export const MIRRORS = [
    { id: "gh-proxy", label: "gh-proxy.org（主站）", base: "https://gh-proxy.org/" },
    { id: "cdn", label: "cdn.gh-proxy.org", base: "https://cdn.gh-proxy.org/" },
    { id: "v4", label: "v4.gh-proxy.org", base: "https://v4.gh-proxy.org/" },
    { id: "v6", label: "v6.gh-proxy.org", base: "https://v6.gh-proxy.org/" },
    { id: "axisnow", label: "axisnow.gh-proxy.org", base: "https://axisnow.gh-proxy.org/" },
    { id: "direct", label: "直连 GitHub（不稳定）", base: "" }
];

/** 自动模式：按 MIRRORS 顺序逐个试 */
export const AUTO_MIRROR = "auto";

/** @param {string} id */
export function getMirror(id) {
    return MIRRORS.find(mirror => mirror.id === id) || null;
}

/** 设置页下拉的候选（自动 + 每个镜像） */
export function mirrorOptions() {
    return [{ id: AUTO_MIRROR, label: "自动（按顺序尝试全部镜像）" }, ...MIRRORS.map(({ id, label }) => ({ id, label }))];
}

/**
 * 参数化镜像顺序：指定了具体镜像就把它排到第一位，其余照原顺序跟在后面
 * @param {string} [preferred]
 * @param {Array<{id:string,label:string,base:string}>} [all]
 */
export function orderMirrors(preferred = AUTO_MIRROR, all = MIRRORS) {
    if (!preferred || preferred === AUTO_MIRROR) return all.slice();
    const picked = all.find(mirror => mirror.id === preferred);
    if (!picked) return all.slice();
    return [picked, ...all.filter(mirror => mirror.id !== preferred)];
}

/**
 * 把原始 GitHub 地址套上镜像前缀；直连（base 为空）原样返回
 * @param {string} base
 * @param {string} target
 */
export function applyMirror(base, target) {
    if (!base) return target;
    return base.endsWith("/") ? base + target : base + "/" + target;
}

const API_ROOT = `https://api.github.com/repos/${REPO.slug}`;
const WEB_ROOT = `https://github.com/${REPO.slug}`;
const RAW_ROOT = `https://raw.githubusercontent.com/${REPO.slug}`;

/** 需要访问的 GitHub 地址（全部是绝对地址，能直接过镜像） */
export const githubUrl = {
    api: () => API_ROOT,
    latestRelease: () => `${API_ROOT}/releases/latest`,
    releaseList: (perPage = 20) => `${API_ROOT}/releases?per_page=${perPage}`,
    tagList: (perPage = 20) => `${API_ROOT}/tags?per_page=${perPage}`,
    commitList: (sha = REPO.branch, perPage = 20) => `${API_ROOT}/commits?sha=${encodeURIComponent(sha)}&per_page=${perPage}`,
    compare: (base, head) => `${API_ROOT}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`,
    rawFile: (ref, path) => `${RAW_ROOT}/${ref}/${path}`,
    branchZip: (branch = REPO.branch) => `${WEB_ROOT}/archive/refs/heads/${branch}.zip`,
    refZip: ref => `${WEB_ROOT}/archive/${encodeURIComponent(ref)}.zip`,
    tagZip: tag => `${WEB_ROOT}/archive/refs/tags/${encodeURIComponent(tag)}.zip`,
    commitZip: sha => `${WEB_ROOT}/archive/${sha}.zip`,
    repoPage: () => WEB_ROOT,
    releasesPage: () => `${WEB_ROOT}/releases`,
    commitPage: sha => `${WEB_ROOT}/commit/${sha}`,
    archivePage: ref => `${WEB_ROOT}/archive/${ref}.zip`
};

/**
 * GitHub 的错误响应也是 JSON（{"message":"Not Found"}）。
 * 用来区分「GitHub 明确说没有」与「镜像自己挂了」——前者不必再试别的镜像。
 * @param {string} text
 */
export function looksLikeGithubJson(text) {
    const trimmed = String(text || "").trim();
    return trimmed.startsWith("{") && /"message"\s*:/.test(trimmed);
}

function timeoutError(ms) {
    const error = new Error(`请求超时（${ms}ms）`);
    error.name = "TimeoutError";
    return error;
}

function failedMirrors(attempts) {
    return attempts.map(item => `${item.label}=${item.error || "HTTP " + item.status}`).join("；");
}

/**
 * 逐个镜像 GET 文本（JSON / 普通文本都用它）
 * @param {string} target 原始 GitHub 绝对地址
 * @param {{
 *   preferred?: string,
 *   timeout?: number,
 *   mirrors?: Array<{id:string,label:string,base:string}>,
 *   headers?: object,
 *   onAttempt?: (attempt: object) => void
 * }} [options]
 * @returns {Promise<{ok:boolean,status:number,text:string,url:string,mirror:object,attempts:object[],definitive?:boolean}>}
 */
export async function fetchText(target, options = {}) {
    const { preferred = AUTO_MIRROR, timeout = 12000, mirrors = MIRRORS, headers = {}, onAttempt } = options;
    const attempts = [];
    for (const mirror of orderMirrors(preferred, mirrors)) {
        if (mirror.base && !/^https?:/i.test(target)) {
            attempts.push({ mirror: mirror.id, label: mirror.label, url: target, ok: false, error: "非绝对地址，无法过镜像" });
            continue;
        }
        const url = applyMirror(mirror.base, target);
        const started = Date.now();
        try {
            const response = await request(url, { timeout, headers });
            const text = await response.text();
            const attempt = {
                mirror: mirror.id,
                label: mirror.label,
                url,
                status: response.status,
                ok: response.ok,
                ms: Date.now() - started
            };
            attempts.push(attempt);
            if (onAttempt) onAttempt(attempt);
            if (response.ok) return { ok: true, status: response.status, text, url, mirror, attempts };
            //GitHub 明确回答「没有这个东西」→ 换镜像也是同一个答案，直接收工
            if (response.status === 404 && looksLikeGithubJson(text)) {
                return { ok: false, status: 404, definitive: true, text, url, mirror, attempts };
            }
        } catch (err) {
            const attempt = {
                mirror: mirror.id,
                label: mirror.label,
                url,
                ok: false,
                error: err && err.name === "TimeoutError" ? err.message : String((err && err.message) || err),
                ms: Date.now() - started
            };
            attempts.push(attempt);
            if (onAttempt) onAttempt(attempt);
        }
    }
    const error = new Error(`所有镜像都失败了：${failedMirrors(attempts) || "没有可用镜像"}`);
    error.attempts = attempts;
    throw error;
}

/**
 * 逐个镜像 GET 文本并解析 JSON
 * @param {string} target
 * @param {object} [options]
 * @returns {Promise<{ok:boolean,status:number,data:any,url:string,mirror:object,attempts:object[],definitive?:boolean}>}
 */
export async function fetchJson(target, options = {}) {
    const result = await fetchText(target, options);
    if (!result.ok) {
        //404 且是 GitHub 的 JSON 错误页：把 data 给出去，由调用方判断语义（如「没有 Release」）
        let data = null;
        try {
            data = JSON.parse(result.text);
        } catch (err) {
            data = null;
        }
        return { ...result, data };
    }
    try {
        return { ...result, data: JSON.parse(result.text) };
    } catch (err) {
        const error = new Error(`${result.mirror.label} 返回的不是 JSON（可能被镜像拦截成了网页）`);
        error.attempts = result.attempts;
        throw error;
    }
}

/**
 * 逐个镜像 GET 二进制（更新包下载用），带下载进度
 * @param {string} target
 * @param {{
 *   preferred?: string, timeout?: number, mirrors?: Array<object>,
 *   onProgress?: (loaded: number, total: number) => void
 * }} [options]
 * @returns {Promise<{bytes:Uint8Array,contentType:string,url:string,mirror:object,attempts:object[],status:number}>}
 */
export async function fetchBinary(target, options = {}) {
    const { preferred = AUTO_MIRROR, timeout = 60000, mirrors = MIRRORS, onProgress } = options;
    const attempts = [];
    for (const mirror of orderMirrors(preferred, mirrors)) {
        const url = applyMirror(mirror.base, target);
        const started = Date.now();
        try {
            const response = await request(url, { timeout });
            if (!response.ok) {
                attempts.push({ mirror: mirror.id, label: mirror.label, url, status: response.status, ok: false, ms: Date.now() - started });
                continue;
            }
            const bytes = await readBody(response, onProgress);
            attempts.push({ mirror: mirror.id, label: mirror.label, url, status: response.status, ok: true, ms: Date.now() - started });
            return {
                bytes,
                contentType: String(response.headers.get("content-type") || ""),
                status: response.status,
                url,
                mirror,
                attempts
            };
        } catch (err) {
            attempts.push({
                mirror: mirror.id,
                label: mirror.label,
                url,
                ok: false,
                error: err && err.name === "TimeoutError" ? err.message : String((err && err.message) || err),
                ms: Date.now() - started
            });
        }
    }
    const error = new Error(`更新包下载失败：${failedMirrors(attempts) || "没有可用镜像"}`);
    error.attempts = attempts;
    throw error;
}

/**
 * 统一入口：没有 AbortController 的环境（老浏览器）退化为直接 fetch
 * @param {string} url
 * @param {{timeout:number,headers?:object}} options
 */
async function request(url, { timeout, headers = {} } = {}) {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    let timer = null;
    if (controller && timeout > 0) {
        timer = setTimeout(() => controller.abort(), timeout);
    }
    try {
        return await fetch(url, {
            method: "GET",
            mode: "cors",
            credentials: "omit",
            cache: "no-store",
            redirect: "follow",
            signal: controller ? controller.signal : void 0,
            headers: {
                Accept: "application/vnd.github+json, application/octet-stream, */*",
                ...headers
            }
        });
    } catch (err) {
        //AbortController 触发时 Chromium/Node 抛的是 AbortError，统一成可读文案
        if (controller && controller.signal.aborted) throw timeoutError(timeout);
        throw err;
    } finally {
        if (timer) clearTimeout(timer);
    }
}

/**
 * 读响应体（有 body.getReader 就流式读，顺带报进度）
 * @param {Response} response
 * @param {(loaded:number,total:number)=>void} [onProgress]
 * @returns {Promise<Uint8Array>}
 */
async function readBody(response, onProgress) {
    const total = Number(response.headers.get("content-length") || 0);
    if (typeof onProgress !== "function" || !response.body || typeof response.body.getReader !== "function") {
        const buffer = await response.arrayBuffer();
        if (typeof onProgress === "function") onProgress(buffer.byteLength, total || buffer.byteLength);
        return new Uint8Array(buffer);
    }
    const reader = response.body.getReader();
    const chunks = [];
    let loaded = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        onProgress(loaded, total);
    }
    const merged = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
    }
    return merged;
}

/** 把 attempts 压成一行人类可读的说明（设置页「上次检查用的镜像」等处用） */
export function describeAttempts(attempts) {
    if (!Array.isArray(attempts) || !attempts.length) return "";
    return attempts.map(item => `${item.label}${item.ok ? " ✓" : " ✗"}`).join(" · ");
}
