"use script";
/**
 * 版本与更新 · 远端查询与状态判定
 *
 * 判定顺序（本仓库当前**没有任何 tag / Release**，所以提交号是主要依据）：
 *   1. 两边都有提交号 → 相同即最新；不同则用 compare 接口定方向（behind / ahead / diverged）
 *   2. compare 不可用（本地提交还没推上去 → 404）→ 看远端最近 20 个提交里有没有本地这个：
 *      有 = 落后（有更新）；没有 = 本地领先或已分叉（开发中，不提示更新）
 *   3. 没有提交号可比（zip 安装且无 installed.json）→ 退回版本号比较
 *
 * `evaluate()` 是纯函数，自检脚本可以直接喂矩阵；网络部分只负责取数据。
 */

import { githubUrl, fetchJson, AUTO_MIRROR } from "./mirrors.mjs";
import { readLocalVersion, compareVersions, shortSha, formatTimestamp } from "./version.mjs";

/**
 * 本仓库**当前没有任何 Release**，`/releases/latest` 每次都是 404（GitHub 的 404 会被
 * fetchText 判成「明确答案」立即返回，但仍是一次请求 + 一条噪声）。
 * 同一游戏会话里一旦确认「没有 Release」就不再重复问；仓库补了 Release 后重启游戏即可恢复探测。
 */
let releaseProbeDisabled = false;

export const UPDATE_STATE = {
    UP_TO_DATE: "up-to-date",
    AVAILABLE: "update-available",
    AHEAD: "ahead",
    DIVERGED: "diverged",
    UNKNOWN: "unknown",
    ERROR: "error"
};

/** 状态 → 中文文案与配色（设置页/徽标共用） */
export const STATE_LABEL = {
    [UPDATE_STATE.UP_TO_DATE]: { text: "已是最新版本", tone: "ok" },
    [UPDATE_STATE.AVAILABLE]: { text: "发现新版本", tone: "new" },
    [UPDATE_STATE.AHEAD]: { text: "本地领先（开发中）", tone: "warn" },
    [UPDATE_STATE.DIVERGED]: { text: "本地与远端已分叉", tone: "warn" },
    [UPDATE_STATE.UNKNOWN]: { text: "无法判断（缺少可比较的版本信息）", tone: "muted" },
    [UPDATE_STATE.ERROR]: { text: "检查失败", tone: "error" }
};

/** @param {string} state */
export function stateLabel(state) {
    return STATE_LABEL[state] || STATE_LABEL[UPDATE_STATE.UNKNOWN];
}

/**
 * GitHub release 对象 → 我们关心的字段
 * @param {any} raw
 */
export function normalizeRelease(raw) {
    if (!raw || typeof raw !== "object") return null;
    const tag = String(raw.tag_name || raw.name || "").trim();
    if (!tag) return null;
    const assets = Array.isArray(raw.assets) ? raw.assets : [];
    const zipAssets = assets
        .filter(asset => /\.zip$/i.test(String(asset && asset.name)))
        .map(asset => ({
            name: String(asset.name),
            url: String(asset.browser_download_url || ""),
            size: Number(asset.size) || 0
        }))
        .filter(asset => asset.url);
    return {
        tag,
        version: tag.replace(/^v/i, ""),
        name: String(raw.name || tag),
        body: String(raw.body || ""),
        publishedAt: String(raw.published_at || ""),
        zipUrl: String(raw.zipball_url || ""),
        assets: zipAssets
    };
}

/**
 * 纯判定：给定本地/远端信息，得出状态与更新目标
 * @param {{
 *   local?: {version?:string,sha?:string},
 *   remote?: {sha?:string,date?:string,message?:string}|null,
 *   recentShas?: string[],
 *   compareStatus?: string|null,
 *   release?: {version?:string,tag?:string}|null,
 *   error?: string|null
 * }} input
 * @returns {{state:string,reason:string,target:{kind:"release"|"commit",ref:string,version:string,label:string}|null}}
 */
export function evaluate(input = {}) {
    const local = input.local || {};
    const remote = input.remote || null;
    const release = input.release || null;
    const recentShas = Array.isArray(input.recentShas) ? input.recentShas : [];
    const compareStatus = input.compareStatus || "";
    const localSha = String(local.sha || "");
    const remoteSha = String((remote && remote.sha) || "");
    const localVersion = String(local.version || "");

    if (input.error) {
        return { state: UPDATE_STATE.ERROR, reason: String(input.error), target: null };
    }
    if (!localSha && !localVersion) {
        return { state: UPDATE_STATE.UNKNOWN, reason: "读不到本地版本信息（info.json / .git 都读不到）", target: null };
    }

    const commitTarget = ref => ({
        kind: "commit",
        ref,
        version: "",
        label: `提交 ${shortSha(ref)}${remote && remote.date ? `（${formatTimestamp(remote.date)}）` : ""}`
    });
    const releaseTarget = () => ({
        kind: "release",
        ref: release.tag,
        version: release.version || String(release.tag || "").replace(/^v/i, ""),
        label: `发布版 ${release.tag}`
    });

    if (remoteSha && localSha) {
        if (remoteSha === localSha) {
            return { state: UPDATE_STATE.UP_TO_DATE, reason: `本地提交 ${shortSha(localSha)} 与远端一致`, target: null };
        }
        if (compareStatus === "identical") {
            return { state: UPDATE_STATE.UP_TO_DATE, reason: "git 比较结果：两边完全一致", target: null };
        }
        if (compareStatus === "behind") {
            return {
                state: UPDATE_STATE.AVAILABLE,
                reason: `远端比本地多若干提交（本地 ${shortSha(localSha)} → 远端 ${shortSha(remoteSha)}）`,
                target: commitTarget(remoteSha)
            };
        }
        if (compareStatus === "ahead") {
            return { state: UPDATE_STATE.AHEAD, reason: `本地提交 ${shortSha(localSha)} 尚未推送（远端没有它）`, target: null };
        }
        if (compareStatus === "diverged") {
            return { state: UPDATE_STATE.DIVERGED, reason: "本地与远端各有对方没有的提交，一键更新会覆盖本地提交", target: commitTarget(remoteSha) };
        }
        if (recentShas.includes(localSha)) {
            return {
                state: UPDATE_STATE.AVAILABLE,
                reason: `远端最近提交里有本地 ${shortSha(localSha)}，说明远端更新`,
                target: commitTarget(remoteSha)
            };
        }
        return {
            state: UPDATE_STATE.AHEAD,
            reason: `本地提交 ${shortSha(localSha)} 不在远端最近提交里（开发中/未推送）`,
            target: null
        };
    }

    if (release) {
        const releaseVersion = String(release.version || release.tag || "").replace(/^v/i, "");
        if (!localVersion) {
            return { state: UPDATE_STATE.AVAILABLE, reason: `本地没有版本号，远端最新发布为 ${release.tag}`, target: releaseTarget() };
        }
        const order = compareVersions(releaseVersion, localVersion);
        if (order > 0) {
            return { state: UPDATE_STATE.AVAILABLE, reason: `远端发布版 ${release.tag} 高于本地 v${localVersion}`, target: releaseTarget() };
        }
        if (order === 0) {
            return { state: UPDATE_STATE.UP_TO_DATE, reason: `本地 v${localVersion} 与最新发布版一致`, target: null };
        }
        return { state: UPDATE_STATE.AHEAD, reason: `本地 v${localVersion} 高于最新发布版 ${release.tag}`, target: null };
    }

    if (remoteSha) {
        return { state: UPDATE_STATE.UNKNOWN, reason: "本地没有可比较的提交号（非 git 安装且没有安装记录）", target: null };
    }
    return { state: UPDATE_STATE.UNKNOWN, reason: "远端没有可比较的版本信息", target: null };
}

/** 把 fetch 抛出来的错误翻成人话（限流/网络都有专门文案） */
export function describeError(error) {
    const attempts = (error && error.attempts) || [];
    const statuses = attempts.map(item => item.status).filter(Boolean);
    if (statuses.includes(429) || statuses.includes(403)) {
        return "GitHub API 触发限流（403/429），请过一会儿再试";
    }
    const message = String((error && error.message) || error || "未知错误");
    return message;
}

/**
 * 取最近的 Release（没有 Release 时返回 null，不算失败；
 * 网络整体挂掉时给 error，让调用方决定是致命还是可以忽略）
 */
export async function fetchLatestRelease(options = {}) {
    try {
        const result = await fetchJson(githubUrl.latestRelease(), options);
        if (!result.ok) return { release: null, attempts: result.attempts, mirror: result.mirror, error: "" };
        return { release: normalizeRelease(result.data), attempts: result.attempts, mirror: result.mirror, error: "" };
    } catch (err) {
        return { release: null, attempts: (err && err.attempts) || [], mirror: null, error: describeError(err) };
    }
}

/** 取 Release 列表 */
export async function fetchReleaseList(options = {}) {
    try {
        const result = await fetchJson(githubUrl.releaseList(options.perPage || 20), options);
        if (!result.ok) return { releases: [], attempts: result.attempts, mirror: result.mirror, error: "" };
        const list = Array.isArray(result.data) ? result.data : [];
        return { releases: list.map(normalizeRelease).filter(Boolean), attempts: result.attempts, mirror: result.mirror, error: "" };
    } catch (err) {
        return { releases: [], attempts: (err && err.attempts) || [], mirror: null, error: describeError(err) };
    }
}

/** 取提交列表 */
export async function fetchCommitList(options = {}) {
    const { sha = "", perPage = 20 } = options;
    try {
        const result = await fetchJson(githubUrl.commitList(sha || undefined, perPage), options);
        if (!result.ok) return { commits: [], attempts: result.attempts, mirror: result.mirror, error: "" };
        const list = Array.isArray(result.data) ? result.data : [];
        return {
            commits: list.filter(item => item && item.sha).map(item => ({
                sha: String(item.sha),
                short: shortSha(item.sha),
                date: String((item.commit && (item.commit.committer || item.commit.author) && (item.commit.committer || item.commit.author).date) || ""),
                message: String((item.commit && item.commit.message) || "").split(/\r?\n/)[0],
                author: String((item.commit && item.commit.author && item.commit.author.name) || "")
            })),
            attempts: result.attempts,
            mirror: result.mirror,
            error: ""
        };
    } catch (err) {
        return { commits: [], attempts: (err && err.attempts) || [], mirror: null, error: describeError(err) };
    }
}

/** 取 compare 状态；本地提交没推上去会 404 → 返回 null（交给 recentShas 兜底） */
export async function fetchCompareStatus(base, head, options = {}) {
    try {
        const result = await fetchJson(githubUrl.compare(base, head), options);
        if (!result.ok) return { status: null, attempts: result.attempts, mirror: result.mirror, error: "" };
        const status = result.data && typeof result.data.status === "string" ? result.data.status : null;
        return { status, attempts: result.attempts, mirror: result.mirror, error: "" };
    } catch (err) {
        return { status: null, attempts: (err && err.attempts) || [], mirror: null, error: describeError(err) };
    }
}

/**
 * 检查更新（永不抛错：失败也以一个 ERROR 状态返回，界面直接显示原因）
 * @param {{
 *   data: object, pkgRoot?: string, preferred?: string, timeout?: number,
 *   onProgress?: (stage: string, detail?: string) => void
 * }} options
 */
export async function checkRemote(options) {
    const { data, pkgRoot, preferred = AUTO_MIRROR, timeout = 12000, onProgress } = options;
    const notify = typeof onProgress === "function" ? onProgress : () => { };
    const at = new Date().toISOString();
    let local = null;
    try {
        local = await readLocalVersion(data, { pkgRoot });
    } catch (err) {
        return { state: UPDATE_STATE.ERROR, ...stateLabel(UPDATE_STATE.ERROR), reason: describeError(err), local: null, remote: null, release: null, target: null, at, attempts: [], error: String((err && err.message) || err) };
    }
    const networkOptions = { preferred, timeout };
    const notes = [];
    try {
        notify("release", "查询 Release");
        const releaseResult = releaseProbeDisabled
            ? { release: null, attempts: [], mirror: null, error: "" }
            : await fetchLatestRelease(networkOptions);
        if (releaseResult.error) notes.push(`Release 查询失败：${releaseResult.error}`);
        //确认「没有 Release」→ 本会话不再重复探测（有 Release 或网络出错都不置位）
        if (!releaseProbeDisabled && !releaseResult.release && !releaseResult.error) releaseProbeDisabled = true;
        notify("commits", "查询主分支提交");
        const commitResult = await fetchCommitList({ ...networkOptions, sha: "main", perPage: 1 });
        const attempts = [...(releaseResult.attempts || []), ...(commitResult.attempts || [])];
        const remoteCommit = commitResult.commits[0] || null;
        if (!remoteCommit) {
            const reason = commitResult.error || "远端没有返回任何提交";
            return {
                state: UPDATE_STATE.ERROR,
                ...stateLabel(UPDATE_STATE.ERROR),
                reason,
                local,
                remote: null,
                release: releaseResult.release,
                target: null,
                at,
                preferred,
                attempts,
                notes,
                error: reason
            };
        }
        const remote = { sha: remoteCommit.sha, short: remoteCommit.short, date: remoteCommit.date, message: remoteCommit.message };

        let compareStatus = null;
        let recentShas = [];
        if (local.sha && local.sha !== remote.sha) {
            notify("compare", "比较提交关系");
            const compareResult = await fetchCompareStatus(local.sha, "main", networkOptions);
            compareStatus = compareResult.status;
            attempts.push(...(compareResult.attempts || []));
            if (compareResult.error) notes.push(`提交比较失败：${compareResult.error}`);
            if (!compareStatus) {
                notify("commits", "查看远端最近提交");
                const recent = await fetchCommitList({ ...networkOptions, sha: "main", perPage: 20 });
                recentShas = recent.commits.map(item => item.sha);
                attempts.push(...(recent.attempts || []));
            }
        }
        const verdict = evaluate({
            local,
            remote,
            recentShas,
            compareStatus,
            release: releaseResult.release
        });
        return {
            ...verdict,
            ...stateLabel(verdict.state),
            local,
            remote,
            release: releaseResult.release,
            at,
            preferred,
            attempts,
            notes,
            mirror: releaseResult.mirror || commitResult.mirror || null
        };
    } catch (err) {
        const reason = describeError(err);
        return {
            state: UPDATE_STATE.ERROR,
            ...stateLabel(UPDATE_STATE.ERROR),
            reason,
            local,
            remote: null,
            release: null,
            target: null,
            at,
            preferred,
            attempts: (err && err.attempts) || [],
            notes,
            error: reason
        };
    }
}

/**
 * 列出可安装的版本（Release 标签 + 最近提交），供「选择版本 / 回退」用
 * @param {{data:object, pkgRoot?:string, preferred?:string, timeout?:number, perPage?:number}} options
 */
export async function listVersions(options) {
    const { data, pkgRoot, preferred = AUTO_MIRROR, timeout = 12000, perPage = 20 } = options;
    let local = null;
    try {
        local = await readLocalVersion(data, { pkgRoot });
    } catch (err) {
        return { local: null, releases: [], commits: [], at: new Date().toISOString(), mirror: null, attempts: [], error: describeError(err) };
    }
    const networkOptions = { preferred, timeout };
    const releaseResult = await fetchReleaseList({ ...networkOptions, perPage });
    const commitResult = await fetchCommitList({ ...networkOptions, sha: "main", perPage });
    const releases = releaseResult.releases.slice().sort((a, b) => compareVersions(b.version, a.version));
    return {
        local,
        releases,
        commits: commitResult.commits,
        at: new Date().toISOString(),
        mirror: releaseResult.mirror || commitResult.mirror || null,
        attempts: [...(releaseResult.attempts || []), ...(commitResult.attempts || [])],
        error: [releaseResult.error, commitResult.error].filter(Boolean).join("；")
    };
}
