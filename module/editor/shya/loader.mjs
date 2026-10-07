// shya 编译器加载器：WASM 优先（网页版/桌面版通用）
// 产物由 D:\project\shya\build-wasm.bat 生成，随扩展放在 shya/bin/ 下。
let compilerPromise = null;

// 宿主库：扩展自带的 .shya（host/*.shya）在编译前挂进 wasm 虚拟 FS 的 /work/host/，
// 这样用户源码里的 `import "./host/skill-type.shya"` 才能解析到。
// ⚠️ 新增 host 文件后要把文件名加进 HOST_FILES（网页端没有目录列举能力）。
const HOST_FILES = ["index.shya", "skill-type.shya", "player.shya", "card.shya", "event.shya", "game.shya"];
const EXTENSION_NAME = "魂氏编辑器";
const HOST_RELATIVE = "module/editor/shya/host";

/**
 * 读宿主库源码。桌面端走 lib.node.fs（window.__dirname 已被引擎规范成 resources/app），
 * 网页端退化成按自身 URL fetch。读不到不致命，只是 @skill_* 宏不可用。
 * @returns {Promise<Record<string, string>>} 文件名 → 源码
 */
async function readHostFiles() {
    const files = {};
    try {
        const { lib } = await import("../../../../../noname.js");
        const fs = lib && lib.node && lib.node.fs;
        const root = typeof window !== "undefined" ? window.__dirname : "";
        if (fs && fs.readFileSync && root) {
            for (const name of HOST_FILES) {
                const file = `${root}/extension/${EXTENSION_NAME}/${HOST_RELATIVE}/${name}`;
                try {
                    files[name] = fs.readFileSync(file, "utf-8");
                } catch (err) { /* 交给 fetch 通道重试 */ }
            }
        }
    } catch (err) {
        console.warn("shya: 宿主库的 node 读取通道不可用", err);
    }
    for (const name of HOST_FILES) {
        if (files[name] != null) continue;
        try {
            const response = await fetch(new URL(`host/${name}`, import.meta.url));
            if (response.ok) files[name] = await response.text();
        } catch (err) { /* 单个文件失败不致命 */ }
    }
    if (!Object.keys(files).length) console.warn("shya: 没读到宿主库 host/*.shya，@skill_* 宏将不可用");
    return files;
}

/**
 * 把宿主库写进虚拟 FS 的 /work/host/
 * @param {any} Module emscripten 模块（含 FS）
 * @returns {Promise<string[]>} 已挂载的文件名
 */
async function mountHostSources(Module) {
    if (!Module || !Module.FS) return [];
    const files = await readHostFiles();
    try {
        Module.FS.mkdir("/work/host");
    } catch (err) { /* 已存在 */ }
    const mounted = [];
    for (const name of Object.keys(files)) {
        try {
            Module.FS.writeFile("/work/host/" + name, files[name]);
            mounted.push(name);
        } catch (err) {
            console.warn("shya: 挂载宿主库失败 " + name, err);
        }
    }
    return mounted;
}

function prepareVirtualFS(Module) {
    if (!Module || !Module.FS) return;
    const FS = Module.FS;
    //--embed-file lib@/lib 已把宏库挂到 /lib；这里再拷一份到 /work，
    //这样 `import "./pystd.shya"`（相对源文件）才能解析到
    try {
        FS.mkdir("/work");
    } catch (err) { /* 已存在 */ }
    let files = [];
    try {
        files = FS.readdir("/lib");
    } catch (err) {
        console.warn("shya: 未找到内嵌宏库 /lib", err);
        return;
    }
    files.forEach(name => {
        if (name === "." || name === "..") return;
        try {
            const data = FS.readFile("/lib/" + name);
            FS.writeFile("/work/" + name, data);
        } catch (err) {
            console.warn("shya: 预载宏库失败 " + name, err);
        }
    });
}

/**
 * 载入编译器（单例）
 * @returns {Promise<{ compile: (source: string, filename?: string) => any, Module: any }>}
 */
export function loadCompiler() {
    if (compilerPromise) return compilerPromise;
    compilerPromise = import("./bin/shya.mjs").then(mod => mod.default()).then(async Module => {
        prepareVirtualFS(Module);
        await mountHostSources(Module);
        return {
            Module,
            /**
             * @param {string} source shya 源码
             * @param {string} [filename] 虚拟路径，用于诊断定位与相对 import
             * @returns {{ok:boolean, code:string, diagnostics:Array, rendered:string}}
             */
            compile(source, filename = "/work/input.shya") {
                const json = Module.ccall("shya_compile", "string", ["string", "string"], [source, filename]);
                return JSON.parse(json);
            }
        };
    }).catch(err => {
        compilerPromise = null;
        throw err;
    });
    return compilerPromise;
}

export function isCompilerReady() {
    return Boolean(compilerPromise);
}
