import { _status, ai, game, get, lib, ui } from "../../../../noname.js";
import url from "./url.mjs";
const chineseRegex = /[\u4e00-\u9fff]+/;
const contentTypeToExtension = {
    'text/html': 'html',
    'text/css': 'css',
    'text/javascript': 'js',
    'application/json': 'json',
    'application/xml': 'xml',
    'application/pdf': 'pdf',
    'application/zip': 'zip',
    'application/msword': 'doc',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
    'image/webp': 'webp',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'font/woff': 'woff',
    'font/woff2': 'woff2',
    'application/octet-stream': 'bin', // 默认二进制文件
};
const parseSkill = (skillId, characterId) => {
    if (!(skillId in lib.skill)) return null;
    const skillName = lib.translate[skillId] || "";
    const description = lib.translate[skillId + "_info"] || "";
    const audios = get.Audio.skill({ skill: skillId, player: characterId }).audioList.filter(audio => audio.text);
    return { id: skillId, name: skillName, description, audios };
}
const parseCharacter = (characterId) => {
    for (const packageId in lib.characterPack) {
        const characterPack = lib.characterPack[packageId];
        if (!(characterId in characterPack)) continue;
        const packageName = lib.translate[packageId + "_character_config"];
        const characterSort = lib.characterSort[packageId];
        const characterSortId = (() => {
            for (const sortId in characterSort) {
                if (characterSort[sortId].includes(characterId)) return sortId;
            }
        })()
        const characterSortName = lib.translate[characterSortId] ?? "未分包";
        const character = characterPack[characterId];
        const name = get.translation(characterId);
        const group = character.doubleGroup.length ? character.doubleGroup.map(group => lib.translate[group]).join("/") : lib.translate[character.group];
        const sex = character.trashBin.includes("sex:male_castrated") ? "男（太监）" : lib.translate[character.sex];
        const clans = character.clans.length ? character.clans : "无"
        const dieAudios = get.Audio.die({ player: characterId }).audioList.filter(audio => audio.text);
        const skills = character.skills.map(skillId => parseSkill(skillId, characterId));
        const skillList = skills.map(skill => `${skill.name}(${skill.id})`);
        return { id: characterId, name, packageName, characterSortName, sex, group, clans, hp: character.hp, maxHp: character.maxHp, hujia: character.hujia, characterSortId, dieAudios, skillList, skills };
    }
    return null;
}
class Searcher {
    static cache = {
        skill: {},
        character: {},
        bwikiSkin: {}
    }
    /**
     * @type {function|null}
     */
    onSearcherLoad = null
    /**
     * @type {Iterator}
     */
    searcher;
    constructor(keyWords, type, config) {
        switch (type) {
            case "skill": {
                new Promise((reslove) => {
                    setTimeout(() => {
                        this.searcher = Searcher.searchSkillGenerator(keyWords, config);
                        this.onSearcherLoad?.();
                        reslove();
                    }, 0)
                });
            }; break;
            case "character": {
                new Promise((reslove) => {
                    setTimeout(() => {
                        this.searcher = Searcher.searchCharacterGenerator(keyWords, config);
                        this.onSearcherLoad?.();
                        reslove();
                    }, 0)
                });
            }; break;
            case "bwikiSkin": {
                new Promise((resolve) => {
                    resolve(Searcher.searchBwikiSkinGenerator(keyWords, config));
                }).then(generator => {
                    this.searcher = generator;
                    this.onSearcherLoad?.();
                });
            }; break;
        }
    }
    /**
     * @param {num} require 
     * @returns {any[]}
     */
    search(require) {
        let collected = [];
        for (let i = 0; i < require; i++) {
            const next = this.searcher.next();
            if (next.done) break;
            collected.push(next.value);
        }
        return collected;
    }
    static * searchCharacterGenerator(keyWords, config) {
        for (const packageId in lib.characterPack) {
            const packageName = lib.translate[packageId + "_character_config"];
            const characterPack = lib.characterPack[packageId];
            const characterSort = lib.characterSort[packageId];
            for (const id in characterPack) {
                const characterSortId = (() => {
                    for (const sortId in characterSort) {
                        if (characterSort[sortId].includes(id)) return sortId;
                    }
                })()
                const characterSortName = lib.translate[characterSortId] ?? "未分包";
                const character = characterPack[id];
                const name = get.translation(id);
                const group = character.doubleGroup.length ? character.doubleGroup.map(group => lib.translate[group]).join("/") : lib.translate[character.group];
                const sex = character.trashBin.includes("sex:male_castrated") ? "男（太监）" : lib.translate[character.sex];
                const clans = character.clans.length ? character.clans : "无"
                const dieAudios = get.Audio.die({ player: id }).audioList.filter(audio => audio.text);
                const skills = character.skills.map(skillId => parseSkill(skillId, id));
                const skillList = skills.map(skill => `${skill.name}(${skill.id})`);
                let searchText = get.plainText(`${name}(${id})${packageName}${characterSortName}${group}${sex}${clans}${skillList.join("")}`);
                if (Array.isArray(config?.filter) && config.filter.some(word => searchText.includes(word))) {
                    continue;
                }
                if (keyWords.every(word => searchText.includes(word))) {
                    yield { id, name, packageName, characterSortName, sex, group, clans, hp: character.hp, maxHp: character.maxHp, hujia: character.hujia, characterSortId, characterSortName, dieAudios, skillList, skills };
                }
            }
        }
    }
    static * searchSkillGenerator(keyWords, config) {
        for (const id in lib.skill) {
            const skill = lib.skill[id];
            if (skill.sub === true || skill.sourceSkill) continue;
            const { name, description, audios } = parseSkill(id);
            let searchText = `${name}${id}${description}`;
            if (Array.isArray(config?.filter) && config.filter.some(word => searchText.includes(word))) {
                continue;
            }
            if (keyWords.every(word => searchText.includes(word))) {
                yield { id, name, audios, description };
            }
        }
    }
    static async searchBwikiSkinGenerator(keyWords, config) {
        const urls = [
            "https://wiki.biligame.com/sgs/api.php",
            "https://wiki.biligame.com/sgsol/api.php",
            "https://wiki.biligame.com/msgs/api.php"
        ];
        const skins = [];
        await Promise.all(urls.map(async url => {
            const URLObject = new URL(url);
            URLObject.searchParams.append("action", "parse");
            URLObject.searchParams.append("format", "json");
            URLObject.searchParams.append("disablelimitreport", "true");
            URLObject.searchParams.append("prop", "text");
            URLObject.searchParams.append("contentmodel", "wikitext");
            URLObject.searchParams.append("smaxage", "3600");
            URLObject.searchParams.append("maxage", "3600");
            URLObject.searchParams.append("origin", "*");
            URLObject.searchParams.append("text", `{{#ask:[[分类:皮肤]][[所属武将::~*${keyWords}]]|?所属武将|?皮肤名|?品质|?画师|?下载链接|sort=品质等级,所属武将,皮肤名|order=desc,asc,asc|offset=0|limit=1000|mainlabel=-|headers=hide|format=list|link=none|searchlabel=|sep=、}}`);
            const response = await fetch(URLObject.toString());
            if (!response.ok) throw new Error(response.statusText);
            const json = await response.json();
            const html = json?.parse?.text?.["*"];
            if (!html) return;
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");
            const rows = doc.querySelectorAll(".smw-row");
            rows.forEach((row) => {
                const fields = row.querySelectorAll(".smw-field");
                if (fields.length < 4) return;
                const name = fields[0].querySelector(".smw-value")?.textContent.trim();
                const skinName = fields[1].querySelector(".smw-value")?.textContent.trim();
                const quality = fields[2].querySelector(".smw-value")?.textContent.trim();
                const artist = fields[3].querySelector(".smw-value")?.textContent.trim();
                const downloadLinks = Array.from(fields[4]?.querySelectorAll("a") || []).map((link) => (link.href));
                skins.push({
                    skinName,
                    quality,
                    artist,
                    downloadLinks,
                });
            });
        }))
        return (function* () {
            for (const skin of skins) {
                for (const link of skin.downloadLinks) {
                    yield {
                        skinName: skin.skinName,
                        quality: skin.quality,
                        artist: skin.artist,
                        link
                    };
                }
            }
        })();
    }
}
class EventManager {
    #eventMap = {}
    on(type, callback) {
        this.#eventMap[type] = callback;
    }
    async emit(type, ...data) {
        if (type in this.#eventMap && typeof this.#eventMap[type] === "function") {
            await this.#eventMap[type](...data);
        }
    }
}
class ASTWorkerSession {
    static #cache = [];
    data = null;
    #getASTWorker() {
        return new Worker(`./${url}/worker-ast.worker.js`, { type: "module" });
    }
    /**
     * 
     * @param {Worker} worker 
     * @param {any[]} data 
     */
    constructor(data, timeout = 18e4) {
        const worker = this.#getASTWorker();
        worker.postMessage(data);
        this.ready = Promise.race([
            new Promise((reslove, reject) => {
                const listener = (e) => {
                    this.data = e.data;
                    worker.removeEventListener("message", listener);
                    reslove();
                }
                worker.onmessageerror = (reject);
                worker.addEventListener("message", listener);
            }).then(() => {
                this.ok = true;
            }),
            new Promise(reslove => {
                setTimeout(reslove, timeout);
            }).then(() => {
                this.ok = false;
                this.timeout = true;
            })
        ]).then(() => {
            worker.terminate();
        });
        this.worker = worker;
    }
}

export class NonameData {
    static rawGroup = ["wei", "shu", "wu", "qun", "shen", "western", "key"];
    static rawClans = ["陈留吴氏", "颍川荀氏", "琅琊诸葛氏", "颍川韩氏", "太原王氏", "颍川钟氏", "弘农杨氏", "吴郡陆氏", "颍川陈氏"];
    /**
     * @param {string} contentType 
     * @returns {string}
     */
    getExtFromContentType(contentType) {
        const cleanType = contentType.split(';')[0].trim().toLowerCase();
        return contentTypeToExtension[cleanType] || 'bin';
    }
    resolvePath(basePath, ...paths) {
        try {
            basePath = new URL(basePath).href;
        } catch (err) {
            paths.unshift(basePath);
            basePath = location.origin;
        }
        const resultPath = paths.reduce((acc, path) => {
            return acc.endsWith("/") ? acc + path : acc + "/" + path;
        }, basePath);
        return new URL(resultPath).href;
    }
    changeToExtPath(path) {
        return path.replace(/^\/?extension\//, "ext:");
    }
    /**
     * @param {Blob} file 
     * @param {"text"|"arrayBuffer"|"url"} type 
     * @returns 
     */
    async readFile(file, type = "text") {
        if (!(file instanceof Blob)) {
            throw new TypeError(file + "不是可以被读取的文件");
        }
        return new Promise((resolve) => {
            const fileReader = new FileReader();
            fileReader.addEventListener("loadend", e => {
                resolve(e.target.result);
            })
            switch (type) {
                case "text": fileReader.readAsText(file); break;
                case "arrayBuffer": fileReader.readAsArrayBuffer(file); break;
                case "URL": case "url": fileReader.readAsDataURL(file); break;
            }
        })
    }
    async readFolder(path) {
        return game.promises.getFileList(path);
    }
    async getAllFolderFileList(path) {
        const folderList = [], fileList = [];
        try {
            const [folders, files] = await game.promises.getFileList(path);
            fileList.push(...files);
            if (folders.length) {
                folderList.push(...folders);
                await Promise.all(folders.map(async folder => {
                    const [subFolderNames, subFileNames] = (await this.getAllFolderFileList(path + "/" + folder))
                    folderList.push(...subFolderNames.map(subFolder => folder + "/" + subFolder));
                    fileList.push(...subFileNames.map(subFile => folder + "/" + subFile));
                }));
            }
            return [folderList, fileList];
        } catch (err) {
            return [folderList, fileList];
        }
    }
    async getAllFileList(path) {
        return await this.getAllFolderList(path)[1];
    }
    async getAllFolderList(path) {
        const folderList = [];
        try {
            const [folders] = await game.promises.getFileList(path);
            if (folders.length) {
                folderList.push(...folders);
                await Promise.all(folders.map(async folder => {
                    const subFolder = (await this.getAllFolderList(path + "/" + folder)).map(subFolder => folder + "/" + subFolder);
                    folderList.push(...subFolder);
                }));
            }
            return folderList;
        } catch (err) {
            return folderList;
        }
    }
    async submitFile(format, multiple = false) {
        const input = document.createElement("input");
        input.setAttribute("type", "file");
        if (Array.isArray(format)) {
            input.accept = format.join(",");
        } else if (format) {
            input.accept = format;
        }
        if (multiple) input.setAttribute("multiple", true);
        let resolveFile;
        const promise = new Promise((resolve) => {
            resolveFile = resolve;
        })
        input.onchange = (e) => {
            resolveFile(Array.from(input.files));
        }
        input.click();
        return promise;
    }
    async download(url, path, name) {
        const response = await fetch(url);
        const contentType = response.headers.get('Content-Type');
        const buffer = await response.arrayBuffer();
        const fileName = name + "." + this.getExtFromContentType(contentType)
        return game.promises.writeFile(buffer, path, fileName).then(() => {
            return path + "/" + fileName.replace(/\/+/, "/");
        });
    }
    async writeTextFile(path, content) {
        const [dirPath, filePath] = path.split(/\/(?=[^/]*$)/);
        return game.promises.writeFile(content, dirPath, filePath);
    }
    async createDir(path) {
        return game.promises.createDir(path);
    }
    /**
     * 按路径读文本（引擎 readFileAsText 走 node fs，utf-8）
     * @param {string} path
     * @returns {Promise<string>}
     */
    async readTextFile(path) {
        return game.promises.readFileAsText(path);
    }
    /**
     * 校验当前工作区：不在 `lib.config.extensions` 里，或磁盘上已没有该扩展目录 → 清空设置。
     * （引擎自己的「重置无效扩展」也是用 checkDir 判目录，`lib.config.extensions` 里可能残留已删扩展的名字。）
     * @returns {Promise<string>} 有效的工作区名；无效则 ""
     */
    async checkWorkspace() {
        const workspace = this.getConfig("x19D6_editor.settings.workspace") || "";
        if (!workspace) return "";
        let valid = Array.from(this.getExtensionList() || []).includes(workspace);
        if (valid) {
            try {
                valid = (await game.promises.checkDir(`extension/${workspace}`)) === 1;
            } catch (err) {
                valid = false;
            }
        }
        if (!valid) {
            this.writeConfig("x19D6_editor.settings.workspace", "");
            return "";
        }
        return workspace;
    }
    checkId(val, type, ...args) {
        switch (type) {
            case "character": return !(val in Object.assign({}, ...Object.values(lib.characterPack)));
            case "skill": return !(val in lib.skill);
            case "characterSort": {
                const [packageId] = args;
                //我不确定 这里空引用返回true是否是一个好的选择 
                if (!lib.characterSort[packageId]) return true;
                return !(val in lib.characterSort[packageId]);
            }
            default: return false;
        }
    }
    /**
     * 归一成引擎认得的写入载荷。
     * ⚠️ `game.writeFile()`（`init/node.js:168`）**只对 `[object File]` 走 FileReader**，其它对象直接落到
     * `new Uint8Array(data)` —— 而 **Blob 没有 `length`**，于是写出 **0 字节**文件（把原图直接毁掉）。
     * 2026-10 踩过：裁剪结果与 AI 候选图都用 Blob 写 → 立绘变 0 字节 → 界面「有重置/裁剪按钮但图空白」。
     * @param {Blob|ArrayBuffer|string} data
     * @param {string} [name] 文件名（包 File 时用；引擎也会拿它当落盘的文件名）
     * @returns {File|ArrayBuffer|string}
     */
    toWritable(data, name = "asset.bin") {
        if (typeof data === "string" || data instanceof ArrayBuffer) return data;
        if (typeof Blob === "undefined" || !(data instanceof Blob)) return data;
        if (Object.prototype.toString.call(data) === "[object File]") return data;
        return new File([data], name || "asset.bin", { type: data.type || "application/octet-stream" });
    }
    /**
     * 写文件到扩展目录（`game.writeFile` 内部会先 ensureDirectory，父目录自动建；data 可以是 File/Blob/ArrayBuffer/string）
     * @param {Blob|ArrayBuffer|string} data
     * @param {string} path 相对 resources/app 的完整文件路径
     */
    async writeFile(data, path) {
        const [dirPath, filePath] = path.split(/\/(?=[^/]*$)/);
        const payload = this.toWritable(data, filePath);
        //空载荷一律拒绝：写下去只会用 0 字节覆盖掉原来那张好图（宁可报错让调用方处理）
        const size = typeof payload === "string" ? payload.length : (payload?.size ?? payload?.byteLength ?? 0);
        if (!size) throw new Error(`拒绝写入空内容：${path}`);
        return game.promises.writeFile(payload, dirPath, filePath);
    }
    /**
     * 按路径读二进制（引擎 readFile 返回 Buffer）——改名/搬运媒体文件用
     * @param {string} path
     * @returns {Promise<Buffer|ArrayBuffer>}
     */
    async readBinaryFile(path) {
        return game.promises.readFile(path);
    }
    /**
     * 删除文件（不存在时静默返回 false）
     * @param {string} path 相对 resources/app 的完整文件路径
     * @returns {Promise<boolean>}
     */
    async removeFile(path) {
        try {
            await game.promises.removeFile(path);
            return true;
        } catch (err) {
            console.warn("删除文件失败", path, err);
            return false;
        }
    }
    checkMemberExistence(member) {
        const [root, ...properties] = member.split(".");
        let currentObject = root === "lib" ? lib : root === "game" ? game : root === "ui" ? ui :
            root === "get" ? get : root === "_status" ? _status : root === "ai" ? ai : window;
        for (const property of properties) {
            if (currentObject[property]) {
                currentObject = currentObject[property];
            } else {
                return false;
            }
        }
        return currentObject !== void 0;
    }
    checkSkillTags(id, tags) {
        if (!(id in lib.skill)) return false;
        const info = lib.skill[id];
        if (!info) return false;
        return tags.every(tag => info[tag]);
    }
    parseSkill(skillId, characterId) {
        return parseSkill(skillId, characterId)
    }
    parseCharacter(characterId) {
        return parseCharacter(characterId)
    }
    getConfig(member) {
        const properties = member.split(".");
        let currentObject = lib.config;
        for (const property of properties) {
            if (currentObject[property]) {
                currentObject = currentObject[property]
            } else {
                return null;
            }
        }
        return currentObject;
    }
    /**
     * 删掉一个配置成员（**delete 语义**，不是写 null）。
     * 置 null 会在 `lib.config` 里留下一个 null 键，`getConfig()` 读回来又是 null，
     * 于是"删过的自建势力"下次打开仍会被渲染回选项列表（用户会认为删除没生效）。
     * @param {string} member 点号路径，如 `x19D6_editor.groups.cs_test`
     */
    removeConfigMember(member) {
        const properties = member.split(".");
        const [name] = properties;
        const last = properties.pop();
        let currentObject = lib.config;
        for (const property of properties) {
            if (currentObject == null || typeof currentObject !== "object") return Promise.resolve();
            currentObject = currentObject[property];
        }
        if (currentObject && typeof currentObject === "object") delete currentObject[last];
        return game.promises.saveConfigValue(name);
    }
    writeConfig(member, val) {
        const properties = member.split(".");
        const [name] = properties;
        let currentObject = lib.config;
        for (let i = 0; i < properties.length; i++) {
            const property = properties[i];
            if (properties.length - 1 === i) {
                if (currentObject == null || typeof currentObject !== "object") break;
                currentObject[property] = val;
            } else {
                //⚠️ 判 `== null` 而不是 `!`：置 null 过的路径段在 lib.config 里是真的 null，
                //只判 `!` 会把 null 当成已存在，一路把 currentObject 走成 null，最后一行静默抛错（写不进去）
                if (currentObject[property] == null || typeof currentObject[property] !== "object") currentObject[property] = {};
                currentObject = currentObject[property];
            }
        }
        return game.promises.saveConfigValue(name);
    }
    getExtensionList(filter) {
        return typeof filter === "function" ? lib.config.extensions.filter(filter) : lib.config.extensions;
    }
    getCharacterSortList(packageId) {
        const result = { "": "未分类" };
        for (const characterSortId in lib.characterSort[packageId]) {
            result[characterSortId] = lib.translate[characterSortId];
        }
        return result;
    }
    setCharacterSort(packageId, id, characterList = []) {
        if (!lib.character[packageId]) lib.character[packageId] = {};
        lib.characterSort[packageId][id] = characterList;
    }
    /**
     * @param {number} hp 
     * @param {number} maxHp 
     * @returns {"healthy"|"damaged"|"dangerous"}
     */
    getHpStatus(hp, maxHp) {
        if (hp > Math.round(maxHp / 2) || hp === maxHp) {
            return "healthy";
        } else if (hp > Math.floor(maxHp / 3)) {
            return "damaged";
        } else {
            return "dangerous";
        }
    }
    getClanSkillId(clanName) {
        switch (clanName) {
            case "陈留吴氏": {
                return 'clanmuyin';
            };
            case "颍川荀氏": {
                return "clandaojie";
            };
            case "颍川韩氏": {
                return "clanxumin"
            };
            case "太原王氏": {
                return "clanzhongliu";
            }
            case "颍川钟氏": {
                return "clanbaozu";
            }
        }
    }
    getCharacterIntro(id) {
        return get.characterIntro(id);
    }
    /**
     * @param {"character"|"skill"|"skills"} type 
     * @param {"sex"|"group"|"name"|"name"|"description"|"info"|"nameid"} attr 
     * @param {string} text 
     */
    getTranslation(type, attr, target) {
        switch (type) {
            case "character": {
                switch (attr) {
                    case "sex": {
                        if (target === "none") return "无性";
                        if (target === "male-castrated") return "太监";
                        return (lib.translate[target] || target) + "性";
                    }
                    case "group": {
                        let group = lib.translate[target] || target;
                        return group + "势力";
                    }
                    case "name": {
                        return lib.translate[target] || target;
                    }
                }
            }
            case "skill": {
                switch (attr) {
                    case "name": {
                        return lib.translate[target] || target;
                    };
                    case "description": case "info": {
                        return lib.translate[target + "_info"] || ""
                    }
                }
            }
            case "skills": {
                switch (attr) {
                    case "nameid": {
                        if (Array.isArray(target)) return target.map(skill => `${lib.translate[skill] || skill}(${skill})`);
                    }
                }
            }
            case "characterPackage": {
                return lib.translate[target + "_character_config"] || target;
            }
            default: return get.translation(target);
        }
    }
    setTranslation(en, cn) {
        lib.translate[en] = cn;
    }
    /**
     * @param {string} text 
     * @param {boolean} withTone 
     * @returns 
     */
    getPinyin(text, withTone) {
        if (!chineseRegex.test(text)) return [];
        return get.pinyin(text, withTone);
    }
    /**
     * @param {string} string 
     * @param {"camel"|"kebab"} to 
     * @returns 
     */
    camelKebabSwitch(string, to) {
        switch (to) {
            case "kebab": return string.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
            case "camel": return string.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
        }
    }
    toEscapedHTML(string) {
        return string.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    /**
     * @param {"wei"|"shu"|"wu"|"qun"|"jin"|"shen"|"western"|"key"|string} group 
     * @returns 
     */
    getTextShadowStyle(nature) {
        switch (nature) {
            case "wei": return "rgb(78 117 140) 0 0 2px, rgb(78 117 140) 0 0 2px, rgb(78 117 140) 0 0 2px, rgb(78 117 140) 0 0 2px, black 0 0 1px";
            case "shu": return "rgb(128 59 2) 0 0 2px, rgb(128 59 2) 0 0 2px, rgb(128 59 2) 0 0 2px, rgb(128 59 2) 0 0 2px, black 0 0 1px";
            case "wu": return "rgb(57 123 4) 0 0 2px, rgb(57 123 4) 0 0 2px, rgb(57 123 4) 0 0 2px, rgb(57 123 4) 0 0 2px, black 0 0 1px";
            case "qun": return "rgb(164 164 164) 0 0 2px, rgb(164 164 164) 0 0 2px, rgb(164 164 164) 0 0 2px, rgb(164 164 164) 0 0 2px, black 0 0 1px";
            case "jin": case "western": return "rgb(100 74 139) 0 0 2px, rgb(100 74 139) 0 0 2px, rgb(100 74 139) 0 0 2px, rgb(100 74 139) 0 0 2px, black 0 0 1px";
            case "shen": return "rgb(243 171 27) 0 0 2px, rgb(243 171 27) 0 0 2px, rgb(243 171 27) 0 0 2px, rgb(243 171 27) 0 0 2px, black 0 0 1px";
            case "key": return "rgb(203 177 255) 0 0 2px, rgb(203 177 255) 0 0 2px, rgb(203 177 255) 0 0 2px, rgb(203 177 255) 0 0 2px, black 0 0 1px";
        }
    }
    /**
     * @param {string} src 
     * @param {{volume:number}} config 
     * @returns 
     */
    playAudio(src, config = {}) {
        return new Promise((resolve, reject) => {
            const audio = game.playAudio({
                path: src,
                addVideo: false,
                onEnded: resolve,
                onError: reject,
            });
            if (config.volume) audio.volume = config.volume;
        })
    }
    getFrame(data, type, config) {
        const manager = new EventManager();
        ; (async () => {
            const decoder = new ImageDecoder({ data, type, ...config });
            await decoder.tracks.ready;
            const count = decoder.tracks.selectedTrack?.frameCount;
            for (let index = 0; index < count; index++) {
                const result = await decoder.decode({ frameIndex: index });
                await manager.emit("data", result);
            }
            manager.emit("finished");
        })()
        return manager;
    }
    /**
     * @template {"getExtensionAllPackage"|"genCharacterCode"|"genCharacterSortCode"} T
     * @param {T} order 
     * @param {*} data 
     * @returns 
     */
    async astRequest(order, data) {
        const session = new ASTWorkerSession({ order, data });
        await session.ready;
        if (session.ok) {
            return session.data;
        }
    }
    /**
     * @param {HTMLImageElement} img 
     * @param {Object} config 
     */
    clipGif(img, config) {
        if (!(img instanceof HTMLImageElement)) throw new Error(`${img}必须为HTMLImageElement对象！`)
        if (!("ImageDecoder" in window)) throw new Error("当前浏览器暂不支持该功能！请切换至chorme94浏览器或更改版本！");
        const clipManager = new EventManager();
        const {
            useClientData = true,
            quality = 1,
            dataForm = "url",
            minDelay
        } = config;
        let { x, y, height, width } = config;
        if (!x) x = 0;
        if (!y) y = 0;
        if (!width) width = img.naturalWidth;
        if (!height) height = img.naturalHeight;
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
        const drawFrame = useClientData === true ? (() => {
            const rateX = img.clientWidth / img.naturalWidth,
                rateY = img.clientHeight / img.naturalHeight;
            width /= rateX;
            height /= rateY;
            return (result) => {
                tempCanvas.height = height;
                tempCanvas.width = width;
                tempCtx.drawImage(result,
                    x / rateX, y / rateY, width, height,
                    0, 0, width, height
                );
            }
        })() : (() => {
            return (result) => {
                tempCanvas.height = height;
                tempCanvas.width = width;
                tempCtx.drawImage(result,
                    x, y, img.naturalWidth, img.naturalHeight,
                    0, 0, width, height
                )
            }
        })();
        (async () => {
            if (!("GIF" in window)) await import("./libs/gif.js/gif.js");
            const gif = window.GIF({
                worker: 20,
                quality,
                workerScript: `./${url}/libs/gif.js/gif.worker.js`
            })
            const response = await fetch(img.src);
            const frameManager = this.getFrame(await response.arrayBuffer(), "image/gif");
            const frameResults = []
            frameManager.on("data", async (result) => {
                frameResults.push(result);
                drawFrame(result.image);
                const frame = new Image(width, height);
                frame.src = tempCanvas.toDataURL();
                await new Promise(r => {
                    frame.onload = () => {
                        let delay = (result.image?.duration || 1e4) / 1e6;
                        if (!isNaN(minDelay) && delay < minDelay) delay = minDelay;
                        gif.addFrame(frame, { delay });
                        r()
                    }
                });
                clipManager.emit("data", result);
            })
            frameManager.on("finished", () => {
                clipManager.emit("dataend", frameResults)
                gif.on("finished", (blob) => {
                    if (dataForm.toLocaleLowerCase() === "blob") {
                        clipManager.emit("finished", blob);
                    } else if (dataForm === "blobURL") {
                        clipManager.emit("finished", URL.createObjectURL(blob));
                    } else if (dataForm.toLocaleLowerCase() === "url") {
                        this.readFile(blob, "url").then(data => {
                            clipManager.emit("finished", data);
                        });
                    } else {
                        clipManager.emit("finished", null);
                    }
                });
                gif.render();
            })
        })()
        return clipManager;
    }
    /**
     * @param {HTMLImageElement} img 
     * @param {Object} config 
     */
    async clipStaticImg(img, config) {
        if (!(img instanceof HTMLImageElement)) throw new Error(`${img}必须为HTMLImageElement对象！`)
        const {
            useClientData = true,
            quality = 1,
            type = "image/png",
            dataForm = "url",
        } = config;
        let { x, y, height, width } = config
        if (!x) x = 0;
        if (!y) y = 0;
        if (!width) width = img.naturalWidth;
        if (!height) height = img.naturalHeight;
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
        const drawFrame = useClientData === true ? (() => {
            const rateX = img.clientWidth / img.naturalWidth,
                rateY = img.clientHeight / img.naturalHeight;
            width /= rateX;
            height /= rateY;
            return (result) => {
                tempCanvas.height = height;
                tempCanvas.width = width;
                tempCtx.drawImage(result,
                    x / rateX, y / rateY, width, height,
                    0, 0, width, height
                );
            }
        })() : (() => {
            return (result) => {
                tempCanvas.height = height;
                tempCanvas.width = width;
                //x/y/width/height 已经是**原图像素**坐标 → 源矩形就该用它自己。
                //原来写 `img.naturalWidth, img.naturalHeight`，等于把整张图缩进目标框（只有「不裁剪、只缩放」才碰巧对）。
                tempCtx.drawImage(result,
                    x, y, width, height,
                    0, 0, width, height
                )
            }
        })();
        const data = await new Promise((resolve) => {
            drawFrame(img);
            if (dataForm.toLocaleLowerCase() === "url") {
                tempCanvas.toDataURL(resolve, type, quality);
            } else if (dataForm.toLocaleLowerCase() === "blob" || dataForm === "blobURL") {
                tempCanvas.toBlob(resolve, type, quality);
            } else {
                resolve(null);
            }
        });
        if (dataForm === "blobURL") return URL.createObjectURL(data);
        return data;
    }
    /**
     * @type {Object<string,(null|Searcher)>}
     */
    #searchManager = {
        "character": null,
        "skill": null,
        "skin": null,
    };
    async search(type, config = {}) {
        const { require, keyWords, filter } = config;
        return new Promise((reslove) => {
            const searcher = new Searcher(keyWords, type, { filter });
            searcher.onSearcherLoad = () => {
                reslove(searcher.search(require));
            }
            this.#searchManager[type] = searcher;
        })
    }
    continueSearch(type, require) {
        if (!this.#searchManager[type]) return [];
        return this.#searchManager[type].search(require);
    }
}