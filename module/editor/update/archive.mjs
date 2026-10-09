"use script";
/**
 * 版本与更新 · 纯 JS zip 解包
 *
 * 为什么不引第三方库：扩展跑在游戏渲染进程里，`adm-zip` / `extract-zip` 之类不一定存在，
 * 而 Node 内置的 `zlib` 一定能拿到（window.require("zlib")）。zip 容器的结构又足够简单：
 * 从「中央目录」读出每个条目的位置与压缩方式，再按方式解压即可，不需要扫描 local header 链
 * （那样要处理 data descriptor，更麻烦也更容易错）。
 *
 * 只支持 store(0) 与 deflate(8)——GitHub 的 archive zip 用的就是这两种。
 * 本文件不依赖任何 noname 全局量，可以在 Node 里直接 import 做自检。
 */

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_EOCD = 0x06054b50;
const EOCD_MIN_SIZE = 22;
const MAX_COMMENT = 0xffff;
const U32_MAX = 0xffffffff;
const U16_MAX = 0xffff;

/**
 * 取 inflateRawSync：优先用调用方注入的（自检脚本传 node:zlib），
 * 否则从 window.require / 全局 require 里取 Node 内置 zlib。
 * @param {Function} [injected]
 * @returns {Function}
 */
export function resolveInflateRaw(injected) {
    if (typeof injected === "function") return injected;
    const candidates = [];
    if (typeof window !== "undefined" && typeof window.require === "function") candidates.push(window.require);
    if (typeof require === "function") candidates.push(require);
    for (const req of candidates) {
        try {
            const zlib = req("zlib");
            if (zlib && typeof zlib.inflateRawSync === "function") return zlib.inflateRawSync;
        } catch (err) { /* 换下一个通道 */ }
    }
    throw new Error("当前环境拿不到 zlib，无法解压更新包（网页端请手动更新）");
}

/**
 * @param {Uint8Array|ArrayBuffer|ArrayBufferView} input
 * @returns {Uint8Array}
 */
function toBytes(input) {
    if (input instanceof Uint8Array) return input;
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    throw new Error("readZip 需要一个二进制缓冲区");
}

/**
 * 压缩包里的路径必须落在包内：拒绝绝对路径、盘符、`..` 逃逸（zip-slip）。
 * PowerShell 的 Compress-Archive 写出来的条目用反斜杠，这里一并归一成 `/`。
 * @param {string} name
 * @returns {string} 归一后的相对路径
 */
export function normalizeEntryPath(name) {
    const raw = String(name == null ? "" : name).replace(/\\/g, "/");
    if (!raw) throw new Error("压缩包里存在空路径条目");
    if (raw.startsWith("/")) throw new Error(`压缩包条目是绝对路径，拒绝解包：${raw}`);
    if (/^[a-zA-Z]:/.test(raw)) throw new Error(`压缩包条目带盘符，拒绝解包：${raw}`);
    const parts = raw.split("/").filter(part => part !== "" && part !== ".");
    if (parts.some(part => part === "..")) throw new Error(`压缩包条目越出目录（zip-slip），拒绝解包：${raw}`);
    if (!parts.length) throw new Error(`压缩包条目归一后为空：${raw}`);
    return parts.join("/");
}

/** 读 EOCD（中央目录结束记录）：从尾部往前找签名，并校验注释长度自洽 */
function findEocd(view, length) {
    const lowest = Math.max(0, length - (MAX_COMMENT + EOCD_MIN_SIZE));
    for (let offset = length - EOCD_MIN_SIZE; offset >= lowest; offset--) {
        if (view.getUint32(offset, true) !== SIG_EOCD) continue;
        const commentLength = view.getUint16(offset + 20, true);
        if (offset + EOCD_MIN_SIZE + commentLength === length) return offset;
    }
    return -1;
}

/**
 * 解出压缩包里的全部文件条目
 * @param {Uint8Array|ArrayBuffer} input
 * @param {{inflateRawSync?: Function}} [options]
 * @returns {{entries: Array<{path:string,size:number,compressedSize:number,method:number,data:Uint8Array}>, comment:string, count:number}}
 */
export function readZip(input, options = {}) {
    const bytes = toBytes(input);
    if (bytes.length < EOCD_MIN_SIZE) throw new Error("不是有效的 zip（文件太小）");
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const eocd = findEocd(view, bytes.length);
    if (eocd < 0) throw new Error("不是有效的 zip（找不到中央目录结束记录）");

    const diskNumber = view.getUint16(eocd + 4, true);
    const cdStartDisk = view.getUint16(eocd + 6, true);
    const entriesOnDisk = view.getUint16(eocd + 8, true);
    const totalCount = view.getUint16(eocd + 10, true);
    const cdSize = view.getUint32(eocd + 12, true);
    const cdOffset = view.getUint32(eocd + 16, true);
    const commentLength = view.getUint16(eocd + 20, true);
    if (totalCount === U16_MAX || entriesOnDisk === U16_MAX || cdOffset === U32_MAX || cdSize === U32_MAX) {
        throw new Error("这个 zip 用了 ZIP64，当前解包器不支持");
    }
    if (diskNumber !== 0 || cdStartDisk !== 0 || entriesOnDisk !== totalCount) throw new Error("分卷 zip 不受支持");
    if (cdOffset + cdSize > bytes.length) throw new Error("zip 的中央目录越界（文件可能没下载完整）");

    //deflate 条目才需要 zlib：纯 store(0) 的包在没有 zlib 的环境里也能解（自检脚本靠这条）
    let inflateRawSync = null;
    const needInflate = () => {
        if (!inflateRawSync) inflateRawSync = resolveInflateRaw(options.inflateRawSync);
        return inflateRawSync;
    };
    const decoder = new TextDecoder("utf-8");    const entries = [];
    let cursor = cdOffset;
    for (let index = 0; index < totalCount; index++) {
        if (cursor + 46 > bytes.length) throw new Error("zip 中央目录被截断");
        if (view.getUint32(cursor, true) !== SIG_CENTRAL) throw new Error(`第 ${index + 1} 个中央目录条目签名不对`);
        const method = view.getUint16(cursor + 10, true);
        const compressedSize = view.getUint32(cursor + 20, true);
        const size = view.getUint32(cursor + 24, true);
        const nameLength = view.getUint16(cursor + 28, true);
        const extraLength = view.getUint16(cursor + 30, true);
        const entryCommentLength = view.getUint16(cursor + 32, true);
        const localOffset = view.getUint32(cursor + 42, true);
        const nameBytes = bytes.subarray(cursor + 46, cursor + 46 + nameLength);
        const rawName = decoder.decode(nameBytes);
        cursor += 46 + nameLength + extraLength + entryCommentLength;

        //目录条目：名字以 / 结尾，本身没有内容
        if (/\/$/.test(String(rawName).replace(/\\/g, "/"))) continue;
        const path = normalizeEntryPath(rawName);
        if (localOffset + 30 > bytes.length) throw new Error(`zip 条目 ${path} 的局部头越界`);
        if (view.getUint32(localOffset, true) !== SIG_LOCAL) throw new Error(`zip 条目 ${path} 的局部头签名不对`);
        const localNameLength = view.getUint16(localOffset + 26, true);
        const localExtraLength = view.getUint16(localOffset + 28, true);
        const dataStart = localOffset + 30 + localNameLength + localExtraLength;
        const dataEnd = dataStart + compressedSize;
        if (dataEnd > bytes.length) throw new Error(`zip 条目 ${path} 的数据越界（文件可能没下载完整）`);
        const raw = bytes.subarray(dataStart, dataEnd);
        let data;
        if (method === 0) {
            data = raw.slice();
        } else if (method === 8) {
            try {
                data = new Uint8Array(needInflate()(raw));
            } catch (err) {
                throw new Error(`zip 条目 ${path} 解压失败：${(err && err.message) || err}`);
            }
        } else {
            throw new Error(`zip 条目 ${path} 用了不支持的压缩方式（method=${method}）`);
        }
        if (size && data.length !== size) {
            throw new Error(`zip 条目 ${path} 解出来的长度不对（期望 ${size}，实际 ${data.length}）`);
        }
        entries.push({ path, size, compressedSize, method, data });
    }
    const comment = commentLength ? decoder.decode(bytes.subarray(eocd + EOCD_MIN_SIZE, eocd + EOCD_MIN_SIZE + commentLength)) : "";
    return { entries, comment, count: entries.length };
}

/**
 * 剥掉 GitHub 归档包的顶层目录（`noname-editor-main/…`）
 * @param {Array<{path:string}>} entries
 * @returns {{root:string, entries:Array<object>}}
 */
export function stripTopLevel(entries) {
    const paths = entries.map(entry => normalizeEntryPath(entry.path));
    const roots = new Set(paths.map(path => path.split("/")[0]));
    const withSlash = paths.filter(path => path.includes("/"));
    //顶层目录 = 所有条目第一段里那个「既是目录、又有内容」的名字
    let root = "";
    if (withSlash.length) {
        const counters = new Map();
        for (const path of withSlash) {
            const first = path.split("/")[0];
            counters.set(first, (counters.get(first) || 0) + 1);
        }
        root = Array.from(counters.entries()).sort((a, b) => b[1] - a[1])[0][0];
    } else if (roots.size === 1) {
        root = Array.from(roots)[0];
    }
    const stripped = [];
    for (const entry of entries) {
        const path = normalizeEntryPath(entry.path);
        if (!root) {
            stripped.push({ ...entry, path });
            continue;
        }
        if (!path.startsWith(root + "/")) continue;
        const rest = path.slice(root.length + 1);
        if (!rest) continue;
        stripped.push({ ...entry, path: rest });
    }
    return { root, entries: stripped };
}

/** zip 魔数：本地文件头 / 空归档 / 分卷标记 */
export function isZipBytes(input) {
    const bytes = toBytes(input);
    if (bytes.length < 4) return false;
    const signature = bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24);
    return signature === SIG_LOCAL || signature === SIG_EOCD || signature === 0x08074b50 || signature === 0x30304b50;
}
