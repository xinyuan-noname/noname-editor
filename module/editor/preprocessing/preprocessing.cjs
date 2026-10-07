/**
 * @example
 * usecode:
 * node ./module/editor/preprocessing/preprocessing.cjs 1
 * nodemon --ext mjs,html --exec "node ./module/editor/preprocessing/preprocessing.cjs 1"
 */
/**
 * html-minifier ./module/editor/html/character-editor.html --collapse-whitespace --remove-comments --minify-js --minify-css -o ./module/editor/html/character-editor.min.html
 */
//
const fs = require("fs");
const path = require("path");
const minimatch = require("minimatch");
const configs = require("./config.json");
(() => {
    const inputs = process.argv.slice(2);
    for (let configName of inputs) {
        const config = configs[configName];
        if (!config) process.exit();
        const { warp, argUse, insert } = config;
        const argUseMap = new Map(argUse), insertMap = new Map(insert);
        const dirPath = path.resolve(__dirname, config.dir);
        const fileList = fs.readdirSync(dirPath)
            .filter(file => config.targets.some(match => minimatch(file, match)) && !config.ignore.some(match => minimatch(file, match)))
        fileList.forEach(file => {
            const filePath = path.resolve(dirPath, file)
            const raw = fs.readFileSync(filePath, { encoding: "utf-8" });
            const processed = raw.replace(/(?<=\/\/ *\$: *(.+?) *\/\/)(?:.|\r?\n)*(?=\/\/ *#: *\1 *\/\/)/g, (match, p) => {
                const args = p.split(/[ ]*,[ ]*/);
                let result = ""
                result += warp ?? "\r\n";
                result += insertMap.get(0) ?? "";
                for (let i = 0; i < args.length; i++) {
                    const arg = args[i];
                    if (argUseMap.get(i + 1) === "file") {
                        const matchResult = /:(\d+)-(\d+)$/.exec(arg);
                        if (matchResult) {
                            const [match, from, to] = matchResult;
                            result += fs.readFileSync(path.resolve(dirPath, arg.replace(match, "")), { encoding: "utf-8" }).split(warp ?? "\r\n").slice(from - 1, to).join(warp ?? "\r\n");
                        } else {
                            result += fs.readFileSync(path.resolve(dirPath, arg), { encoding: "utf-8" })
                        }
                    } else {
                        result += arg;
                    }
                    result += insertMap.get(i + 1);
                }
                result += warp || "\r\n";
                return result;
            });
            if (raw === processed) return;
            fs.writeFileSync(filePath, processed);
        })
    }
})();