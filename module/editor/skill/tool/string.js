"use script";
export const PiChar = String.fromCharCode(960);
export const degChar = String.fromCharCode(176);
export const cnCharRange = '\u4e00-\u9fa5'
export const JavascriptOperators = [
    " = ", " += ", " -= ", " /= ", " *= ", " %= ", " >>= ", " <<= ", " **= ", "++", "--"
]
export const JavascriptKeywords = [
    'abstract', 'await', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const',
    'continue', 'debugger', 'default', 'delete', 'do', 'double', 'else', 'enum', 'export', 'extends',
    'false', 'final', 'finally', 'float', 'for', 'function', 'goto', 'if', 'implements', 'import',
    'in', 'instanceof', 'int', 'interface', 'let', 'long', 'native', 'new', 'null', 'package', 'private',
    'protected', 'public', 'return', 'short', 'static', 'super', 'switch', 'synchronized', 'this',
    'throw', 'throws', 'transient', 'true', 'try', 'typeof', 'var', 'void', 'volatile', 'while', 'with',
    'yield'
];
export const JavascriptUsualType = [
    'undefined',
    'boolean', 'Boolean',
    'number', 'Number',
    'string', 'String',
    'bigint', 'BigInt',
    'symbol', 'Symbol',
    'function', 'Function',
    'object', 'Object',
    'Array', 'Date', 'RegExp', 'Map', 'Set'
]
export const JavascriptGlobalVariable = [
    'NaN', 'Infinity', '-Infinity',
    'globalThis'
]
export const JavascriptOperatorppsiting = {
    "===": "!==",
    "!==": "===",
    "==": "!=",
    ">": "<=",
    "<=": ">",
    "<": ">=",
    ">=": "<",
    "++": "--"
}
export function getOppositingOperator(operator) {
    if (JavascriptOperatorppsiting[operator]) return JavascriptOperatorppsiting[operator];
    return operator;
}
export function stringToRegExp(string, flag) {
    if (typeof string !== "string") string = String(string);
    string = string.replace(/([^\w\s])/g, "\\$1");
    return new RegExp(string, flag);
}
/**
 * @param {string} str - 需要修正的字符串
 * @returns {string}
 */
export function correctPunctuation(str) {
    return str.replace(/,+[)]/g, ')')
        .replace(/[(],+/g, '(')
        .replace(/,,+/g, ',')
        .replace(/;;+/g, ';')
        .replace(/\,\}/g, '}')
        .replace(/\{\,/g, '{')
        .replace(/(?<!\.)\.{2}(?!\.)/, '.')
        .replace(/,:/g, ":")
        .replace(/:,/g, ":")
}
export function arrayToString(array) {
    let result = '[';
    for (const [index, item] of array.entries()) {
        if (Array.isArray(item)) result += arrayToString(item);
        result += item;
        if (index + 1 < array.length) result += ','
    }
    result += "]";
    return result;
}
export function objectToString(object) {
    if (typeof object === "object" && object.toString() === "[object Object]") {
        return JSON.stringify(object).replace(/"([a-zA-Z_$][a-zA-Z0-9_$]*)"(?=:)/g, "$1");
    }
    return `${object}`;
}

/**
 * 生成一个随机的36进制字符串。
 * 
 * 该函数用于生成指定长度的随机36进制字符串，可用于创建唯一标识符或其他需要随机字符串的场景。
 * 36进制字符串包含0-9和A-Z，共计36个字符。
 * 
 * @param {number} length - 指定生成的随机字符串的长度。
 * @returns {string} 生成的随机36进制字符串。
 */
export function randomBase36(length) {
    const temp = []
    for (let i = 0; i < length; i++) {
        temp.push(parseInt(Math.random() * 36).toString(36))
    }
    return temp.join("")
}
export const replaceAllStr = (raw, replacee, replacer) => {
    if (typeof raw != "string") throw new Error(raw, `不是一个字符串类型!`);
    if (replacee instanceof RegExp) {
        if (!replacee.flags.includes("g")) throw new Error(replacee, "正则表达式必须带有falg:g!")
        return raw.replace(replacee, replacer)
    } else {
        if (typeof replacee !== "string") replacee = String(replacee);
        if (typeof replacer !== "string") replacer = String(replacer);
        return raw.split(replacee).join(replacer);
    }
}
/**
 * 
 * @param {Element} element - 一个文本输入元素（input或textarea）
 * @returns {string[]} 当前行的输入索引的范围
 * @throws {Error} 如果传入的元素不是文本元素，抛出错误
 */
export function getLineRangeOfInput(element) {
    const tagName = element.tagName.toLowerCase();
    const errorNotText = new Error(`传入的元素类型不是文本元素:${tagName}`);
    if (!['input', 'textarea'].includes(tagName)) throw errorNotText
    if (tagName === 'input' && ['text', 'password', 'search'].includes(element.type)) throw errorNotText
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const content = element.value
    if (content.slice(start, end).includes('\n')) return [0, 0];
    let last = 0;
    for (let index of getStrAllIndex(content, '\n')) {
        if (index >= start) return [last, index]
        last = index + 1;
    }
    return [last, content.length];
}
export function getLastLine(str) {
    const lastNewLineIndex = str.lastIndexOf('\n');
    return lastNewLineIndex !== -1 ? str.substring(lastNewLineIndex + 1) : str;
}
/**
 * 获取指定元素中的某一行文本内容。
 * 
 * @param {HTMLElement} element - 需要获取文本内容的DOM元素。
 * @returns {string} 返回指定元素某一行的内容字符串。
 */
export function getLineOfInput(element) {
    return element.value.slice(...getLineRangeOfInput(element));
}
/**
 * 获取字符串中所有指定子字符串的索引
 * 
 * @param {string} str 原始字符串
 * @param {string} searchValue 需要搜索的子字符串
 * @throws {TypeError} 如果任一参数不是字符串类型
 * @returns {number[]} 包含所有匹配的索引的数组，如果没有匹配则返回空数组
 */
export function getStrAllIndex(str, searchValue) {
    if (typeof str !== 'string' || typeof searchValue !== 'string') throw new TypeError('参数都应为string类型');
    if (!str.length || !searchValue.length) return [];
    const result = [];
    for (let i = 0; i < str.length; i++) {
        str[i] === searchValue && result.push(i);
    }
    return result;
}
/**
 * 检查给定字符串是否为独立的中文句子。
 * 中文句子指的是不被引号或特定标点直接包围的中文字符序列。
 * 这个函数主要用于判断一段文本中是否存在符合要求的中文句子。
 * 
 * @param {string} str 待检查的字符串。
 * @returns {boolean} 如果字符串是一个独立的中文句子，则返回true；否则返回false。
 */
export function isOpenCnStr(str) {
    const regexp = /(?<!["'`][\u4e00-\u9fa5，。？！“”]*?)[\u4e00-\u9fa5]+(?![\u4e00-\u9fa5，。？！“”]*?["'`])/;
    return regexp.test(str);
}

export function moveWordToEnd(str, word, space = "", judge1 = () => true, judge2 = () => true) {
    const regexp = new RegExp(`^(.*?)(${word.replace(/[-\/\\^$*+?.()|[\]{}]/, "\\$&")})(.*?)$`, "mg");
    return str.replace(regexp, (match, p1, p2, p3) => {
        if (!judge1(p1, p2, p3) || !judge2(p1, p2, p3)) return match;
        return `${p1}${p3}${space}${p2}`
    })
}
/**
 * @param {String} str 
 * @param {number} basic 
 * @returns {String}
 */
export function adjustTab(str, basic = 0, start = '{', end = '}', ingoreInitialTab) {
    const arr1 = str.split('\n');
    const stack = [];
    let tabLevel = basic;
    let arr2 = arr1.map(line => {
        const times = ingoreInitialTab ? 0 :
            line.match(/^\t+/) ? line.match(/^\t+/)[0].length : 0;
        const bool = line.endsWith(start)
        let chars = line.match(new RegExp(`(${start.replace(/[-\/\\^$*+?.()|[\]{}]/, "\\$&")}|${end.replace(/[-\/\\^$*+?.()|[\]{}]/, "\\$&")})`, 'g'));
        chars && chars.forEach((char, index) => {
            if (char == start) {
                stack.push(index === chars.length - 1 && bool);
            } else if (stack.length) {
                if (stack.pop()) tabLevel--
            }
        })
        const deltaValue = times - tabLevel;
        let result = line;
        if (deltaValue > 0) result = line.slice(deltaValue);
        else if (deltaValue < 0) result = '\t'.repeat(Math.abs(deltaValue)) + line;
        bool && (tabLevel++);
        return result;
    })
    return arr2.join('\n');
};
/**
 * 
 * @param {string} str 
 * @param {function} callback 
 * @returns {string}
 */
export function eachLine(str, callback) {
    let result;
    let splited = str.split("\n");
    result = splited.map((item, index, arg) => {
        if (index > 0) callback.lastLine = splited[index - 1]
        if (index != splited.length) callback.nextLine = splited[index + 1]
        return callback(item, index, arg) || item;
    }).join("\n");
    return result;
}
/**
 * 查找并返回字符串中包含指定单词组的所有匹配项。
 * @param {string} str - 需要搜索的原始字符串。
 * @param {string[]} wordsgroup - 包含多个单词的数组，用于构建正则表达式进行匹配。
 * @returns {string[]} 返回一个数组，包含所有在字符串str中找到的与wordsgroup中的单词匹配的项。
 */
export function findWordsGroup(str, wordsgroup, requirePrefix, requireSurfix) {
    let result = [];
    wordsgroup = [...new Set(wordsgroup.filter(item => item && str.includes(item)))];
    if (wordsgroup.length == 0) return [];
    let regexp = new RegExp(`${requirePrefix ? "(?<" + requirePrefix + ")" : ""}(${wordsgroup.join("|")})${requireSurfix ? "(?" + requireSurfix + ")" : ""}`, "g"),
        match
    while ((match = regexp.exec(str)) !== null) {
        result.push(match[0]);
    }
    return result
};

/**
 * 移除字符串中指定单词组的所有出现。
 * @param {string} str - 需要处理的原始字符串。
 * @param {string[]} wordsgroup - 包含多个需要移除的单词的数组，用于构建正则表达式。
 * @returns {string} 返回一个新的字符串，其中wordsgroup中的所有单词已被移除。
 */
export function clearWordsGroup(str, wordsgroup, requirePrefix, requireSurfix) {
    let regexp = new RegExp(`${requirePrefix ? "(?<" + requirePrefix + ")" : ""}(${wordsgroup.join("|")})${requireSurfix ? "(?" + requireSurfix + ")" : ""}`, "g")
    return str.replace(regexp, "")
}
export function pointInWhichLine(str, point) {
    if (!str || point < 0) return null;
    let acc = 0;
    const lines = Array.isArray(str) ? str : str.split("\n")
    for (const [num, line] of lines.entries()) {
        acc += line.length + 1;
        if (point < acc) return num;
    }
    return null;
}
/**
 * 
 * @param {String} str 
 * @param {String} target 
 * @returns {Array<Array<number>>} 
 */
export function indexRange(str, target, mode = 'g') {
    const result = [];
    const { length } = target;
    const regexp = new RegExp(target, mode);
    let match;
    while ((match = regexp.exec(str)) !== null) {
        const i = match.index;
        result.push([i, i + length - 1])
    }
    return result;
}
/**
 * @param {string} str 
 * @param {string} insertContent 
 * @param {number} i int
 * @returns {string}
 */
export function insertStr(str, insertStart, insertContent, i = 0) {
    let range = indexRange(str, insertStart);
    if (!range.length) return false;
    i = parseInt(i);
    const index = range[i][1] + 1;
    return `${str.slice(0, index)}${insertContent || ""}${str.slice(index)}`
}

/**
 * 
 * @param {number} number 
 * @param {Array} range 
 * @param {boolean}  close
 * @returns {boolean}
 */
export function selectionIsInRange(number, range, close) {
    const max = range[1] + 1, min = range[0];
    if ((close ? number <= max : number < max) && number > min) return true;
}
/**
 * 
 * @param {string} str 
 * @param {string} start 
 * @param {string} end 
 * @returns {Array<Array<Array<number>>>}
 */
export function validParenthness(str, start, end) {
    let stack = [];
    let result = [];
    let arrStart = indexRange(str, start);
    let arrEnd = indexRange(str, end);
    let tree = [...arrStart, ...arrEnd].sort((a, b) => a[1] - b[1]);
    tree.forEach(range => {
        const subStr = str.slice(range[0], range[1] + 1);
        if (subStr === start) stack.push(range);
        else if (subStr === end && stack.length) {
            result.push([stack.pop(), range])
        }
    });
    return result;
};
/**
 * @param {Array<string>} arr 
 * @param {string} prefix
 * @returns {Array<string>}
 */
export function findPrefix(arr, prefix) {
    return arr.filter(str => str.startsWith(prefix));
}
/**
 * @param {string} str 
 * @param {Array<string>} list 
 * @returns {string}
 */
export function whichPrefix(str, list) {
    let result = ''
    list.forEach(prefix => {
        if (str.startsWith(prefix)) result = prefix;
    })
    return result;
}

/**
 * @param {string} str 
 * @param {RegExp} match 
 * @param {string} prefix 
 * @param {string} suffix 
 */
export function addPSFix(str, match, prefix, suffix) {
    let result = str.replace(match, function (match, ...p) {
        return `${prefix}${match}${suffix}`;
    })
    return result;
}
/**
 * 
 * @param {string} str 
 * @param {RegExp} regexp 
 * @returns 
 */
export function deleteRepeat(str, regexp) {
    let result = str;
    let match;
    let pList = [];
    while ((match = regexp.exec(str)) !== null) {
        pList.push(match[0])
    }
    pList = [...new Set(pList)].map(p => {
        return p.replace(/([\\^$.|?*+(){}\[\]])/g, '\\$1')
    });
    for (let k of pList) {
        result = result.replace(new RegExp(`(?<=${k})\\s*(${k})+`, 'g'), '')
    }
    return result;
}
/**
 * 
 * @param {string} str 
 * @returns {string}
 */
export function trimEnd(str) {
    if (typeof str !== 'string') throw new TypeError(`${str} is not string`)
    return str.slice(0, -1);
}
/**
 * 
 * @param {string} str 
 * @param {string|RegExp} match 
 * @returns {number}
 */
export function countWords(str, match) {
    if (typeof match === 'string') {
        match = new RegExp(match, 'g')
    }
    if (!match.global) {
        match = new RegExp(match.source, 'g')
    }
    return [...str.matchAll(match)].length;
}