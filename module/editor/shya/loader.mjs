// shya 编译器加载器：WASM 优先（网页版/桌面版通用）
// 产物由 D:\project\shya\build-wasm.bat 生成，随扩展放在 shya/bin/ 下。
let compilerPromise = null;

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
    compilerPromise = import("./bin/shya.mjs").then(mod => mod.default()).then(Module => {
        prepareVirtualFS(Module);
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
