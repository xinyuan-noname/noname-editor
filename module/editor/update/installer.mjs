"use script";
/**
 * 版本与更新 · 下载与安装
 *
 * 一次安装的完整链路：
 *   1. 按「Release 资产 → Release 源码包 → tag 归档 → 提交归档 → 主分支归档」排出候选下载源
 *   2. 每个候选源都过一遍镜像列表（fetchBinary 内部轮询），拿到 zip 字节
 *   3. 解包（archive.mjs，纯 JS）→ 剥掉顶层目录 → 校验包里确实有 extension.js
 *   4. 逐文件：先把被覆盖的旧文件复制进 backup/update-<时间戳>/，再写新内容
 *   5. 全部成功才写 installed.json（记录安装的提交/版本/时间/来源），失败不写
 *
 * 两条硬规则：
 *   - **不删除**压缩包里没有的文件（用户的素材、backup/、.git 都得留住）
 *   - 写盘前把整包解完并校验完，中途出错绝不半途覆盖
 *
 * 本文件不依赖 noname 全局量（data 注入），可在 Node 里直接 import 做自检。
 */

import { githubUrl, fetchBinary, AUTO_MIRROR, REPO } from "./mirrors.mjs";
import { readZip, stripTopLevel, isZipBytes, resolveInflateRaw } from "./archive.mjs";
import { readBinarySafe, writeInstalledRecord, parseJson, shortSha } from "./version.mjs";

/** 包完整性锚点：压缩包里必须有它，否则不认这个包 */
export const PACKAGE_ANCHOR = "extension.js";

/** 安装记录里要用的清单文件 */
export const MANIFEST_FILE = "info.json";

/**
 * 备份目录名（本地时间）：update-20261009-221530
 * @param {Date} [date]
 */
export function backupStamp(date = new Date()) {
    const pad = num => String(num).padStart(2, "0");
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

/**
 * 排下载源：越精确的排越前（Release 资产 > Release 源码包 > tag > 提交 > 主分支）
 * @param {{target?: {kind?:string,ref?:string,version?:string}|null, release?: {tag?:string,assets?:Array<{name:string,url:string}>}|null, branch?: string}} input
 * @returns {Array<{kind:string,label:string,url:string}>}
 */
export function buildDownloadPlan(input = {}) {
    const target = input.target || null;
    const release = input.release || null;
    const branch = input.branch || REPO.branch;
    const plan = [];
    const push = (kind, label, url) => {
        if (url && !plan.some(item => item.url === url)) plan.push({ kind, label, url });
    };
    if (target && target.kind === "release") {
        for (const asset of (release && release.assets) || []) {
            push("release-asset", `发布资产 ${asset.name}`, asset.url);
        }
        if (release && release.zipUrl) push("release-zipball", `Release 源码包 ${release.tag || ""}`.trim(), release.zipUrl);
        const tag = target.ref || (release && release.tag) || "";
        if (tag) push("release-tag", `标签归档 ${tag}`, githubUrl.tagZip(tag));
    } else if (target && target.kind === "commit" && target.ref) {
        push("commit", `提交归档 ${shortSha(target.ref)}`, githubUrl.commitZip(target.ref));
    }
    push("branch", `主分支归档 ${branch}`, githubUrl.branchZip(branch));
    return plan;
}

/**
 * 解包 + 校验：剥掉顶层目录、确认锚点文件在
 * @param {Uint8Array|ArrayBuffer} bytes
 * @param {{inflateRawSync?: Function}} [options]
 * @returns {{root:string, entries:Array<object>, count:number, totalSize:number, manifest:object|null}}
 */
export function extractPackage(bytes, options = {}) {
    if (!isZipBytes(bytes)) throw new Error("下载到的不是 zip（镜像可能返回了错误页）");
    const { entries } = readZip(bytes, options);
    const { root, entries: stripped } = stripTopLevel(entries);
    if (!stripped.length) throw new Error(`压缩包里没有可解出的文件（顶层目录：${root || "无"}）`);
    if (!stripped.some(entry => entry.path === PACKAGE_ANCHOR)) {
        throw new Error(`压缩包里没有 ${PACKAGE_ANCHOR}，不像是「${REPO.label}」的包（顶层目录：${root || "无"}）`);
    }
    const manifestEntry = stripped.find(entry => entry.path === MANIFEST_FILE);
    const manifest = manifestEntry ? parseJson(new TextDecoder("utf-8").decode(manifestEntry.data)) : null;
    const totalSize = stripped.reduce((sum, entry) => sum + entry.data.length, 0);
    return { root, entries: stripped, count: stripped.length, totalSize, manifest };
}

/**
 * 逐文件备份 + 覆盖写
 * @param {{
 *   data: object, pkgRoot: string, entries: Array<object>,
 *   target?: object|null, manifest?: object|null, backup?: boolean,
 *   onProgress?: (info: object) => void
 * }} options
 * @returns {Promise<{written:string[],backedUp:string[],skipped:Array<object>,failed:Array<object>,backupDir:string,totalBytes:number}>}
 */
export async function installEntries(options) {
    const { data, pkgRoot, entries, target = null, manifest = null, backup = true, onProgress } = options;
    const report = typeof onProgress === "function" ? onProgress : () => { };
    const backupDir = `${pkgRoot}/backup/update-${backupStamp()}`;
    const written = [];
    const backedUp = [];
    const skipped = [];
    const failed = [];
    let totalBytes = 0;
    for (let index = 0; index < entries.length; index++) {
        const entry = entries[index];
        report({ phase: "write", index: index + 1, count: entries.length, path: entry.path });
        const destination = `${pkgRoot}/${entry.path}`;
        if (backup) {
            const existing = await readBinarySafe(data, destination);
            if (existing && existing.length) {
                try {
                    await data.writeFile(existing, `${backupDir}/${entry.path}`);
                    backedUp.push(entry.path);
                } catch (err) {
                    failed.push({ path: entry.path, phase: "backup", error: String((err && err.message) || err) });
                }
            }
        }
        //NonameData.writeFile 拒绝空载荷（那是「0 字节毁文件」的护栏）——空文件跳过并记一笔
        if (!entry.data.length) {
            skipped.push({ path: entry.path, reason: "0 字节" });
            continue;
        }
        try {
            await data.writeFile(entry.data, destination);
            written.push(entry.path);
            totalBytes += entry.data.length;
        } catch (err) {
            failed.push({ path: entry.path, phase: "write", error: String((err && err.message) || err) });
        }
    }
    if (!failed.length && written.length) {
        const ref = target && (target.ref || "");
        await writeInstalledRecord(data, { pkgRoot }, {
            ref: ref || "",
            sha: target && target.kind === "commit" ? ref : "",
            version: String((manifest && manifest.version) || (target && target.version) || ""),
            subject: String((target && target.label) || ""),
            source: target ? target.kind : "branch",
            installedAt: new Date().toISOString(),
            backupDir: backedUp.length ? backupDir : "",
            files: written.length
        });
    }
    return { written, backedUp, skipped, failed, backupDir, totalBytes };
}

/**
 * 只下载 + 解包校验（不写盘）：候选下载源依次尝试
 * @param {{
 *   plan?: Array<object>, target?: object|null, release?: object|null,
 *   preferred?: string, timeout?: number, onProgress?: (info: object) => void
 * }} options
 * @returns {Promise<object>}
 */
export async function downloadPackage(options = {}) {
    const { plan, target = null, release = null, preferred = AUTO_MIRROR, timeout = 120000, onProgress } = options;
    const report = typeof onProgress === "function" ? onProgress : () => { };
    const candidates = Array.isArray(plan) && plan.length ? plan : buildDownloadPlan({ target, release });
    const errors = [];
    for (const candidate of candidates) {
        try {
            report({ phase: "download", label: candidate.label, url: candidate.url, loaded: 0, total: 0 });
            const download = await fetchBinary(candidate.url, {
                preferred,
                timeout,
                onProgress: (loaded, total) => report({ phase: "download", label: candidate.label, url: candidate.url, loaded, total })
            });
            report({ phase: "extract", label: candidate.label, url: candidate.url, loaded: download.bytes.length, total: download.bytes.length });
            const pkg = extractPackage(download.bytes);
            return { ok: true, candidate, download, pkg, errors, error: "" };
        } catch (err) {
            errors.push({ label: candidate.label, url: candidate.url, error: String((err && err.message) || err) });
        }
    }
    return {
        ok: false,
        candidate: null,
        download: null,
        pkg: null,
        errors,
        error: `全部下载源都失败了：${errors.map(item => `${item.label}=${item.error}`).join("；")}`
    };
}

/**
 * 下载 + 解包 + （可选二次确认）+ 安装
 * @param {{
 *   data: object, pkgRoot: string, target?: object|null, release?: object|null,
 *   preferred?: string, timeout?: number, backup?: boolean, plan?: Array<object>,
 *   confirm?: (info: object) => Promise<boolean>|boolean,
 *   onProgress?: (info: object) => void
 * }} options
 * @returns {Promise<object>}
 */
export async function downloadAndInstall(options) {
    const {
        data,
        pkgRoot,
        target = null,
        release = null,
        preferred = AUTO_MIRROR,
        timeout = 120000,
        backup = true,
        plan,
        confirm,
        onProgress
    } = options;
    const report = typeof onProgress === "function" ? onProgress : () => { };
    const prepared = await downloadPackage({ plan, target, release, preferred, timeout, onProgress: report });
    if (!prepared.ok) {
        return {
            ok: false,
            cancelled: false,
            url: "",
            kind: "",
            label: "",
            mirror: null,
            bytes: 0,
            root: "",
            version: "",
            written: [],
            backedUp: [],
            skipped: [],
            failed: [],
            backupDir: "",
            totalBytes: 0,
            errors: prepared.errors,
            error: prepared.error
        };
    }
    const { candidate, download, pkg } = prepared;
    const version = String((pkg.manifest && pkg.manifest.version) || (target && target.version) || "");
    if (typeof confirm === "function") {
        const agreed = await confirm({ candidate, download, pkg, target, release });
        if (!agreed) {
            return {
                ok: false,
                cancelled: true,
                url: candidate.url,
                kind: candidate.kind,
                label: candidate.label,
                mirror: download.mirror,
                bytes: download.bytes.length,
                root: pkg.root,
                version,
                written: [],
                backedUp: [],
                skipped: [],
                failed: [],
                backupDir: "",
                totalBytes: 0,
                errors: prepared.errors,
                error: "已取消"
            };
        }
    }
    report({ phase: "install", label: candidate.label, count: pkg.count, root: pkg.root });
    const result = await installEntries({ data, pkgRoot, entries: pkg.entries, target, manifest: pkg.manifest, backup, onProgress: report });
    const summary = {
        ok: !result.failed.length,
        cancelled: false,
        url: candidate.url,
        kind: candidate.kind,
        label: candidate.label,
        mirror: download.mirror,
        bytes: download.bytes.length,
        root: pkg.root,
        version,
        ...result,
        errors: prepared.errors
    };
    if (!summary.ok) summary.error = `${result.failed.length} 个文件写入失败`;
    return summary;
}

/** 供自检使用：显式拿 zlib（游戏里走 window.require） */
export { resolveInflateRaw };
