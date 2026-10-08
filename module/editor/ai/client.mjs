/**
 * AI 区域的网络层（纯逻辑模块：不碰 DOM、不改引擎状态）。
 *
 * 只做三件事：
 *  1. 把「用户填的地址」归一成真正要请求的 URL（填到根、填到 /v1、填到完整路径都能跑）；
 *  2. 把 HTTP/网络错误翻成**新手看得懂的中文**（哪一步错了、下一步该干什么）；
 *  3. 把各家 OpenAI 兼容服务五花八门的返回形状（b64_json / url / content 数组 /
 *     responses 风格 output_text）归一成一种结果。
 *
 * 桌面端无名杀是 Electron 且 `webSecurity: false`（resources/app/main.js:26），
 * 所以渲染进程里的 fetch 不受 CORS 限制，可以直接请求用户填的任意地址。
 * 请求全部直连用户填的地址，不经过任何第三方中转。
 */

/** 默认超时：写一份设计稿要几十秒，生图更慢 */
const DEFAULT_TIMEOUT = 180000;

/**
 * 归一 baseUrl：去掉首尾空白与末尾斜杠，并剥掉用户可能多填的接口路径
 * （很多人会把文档里的完整 URL 整个复制过来）
 * @param {string} baseUrl
 * @returns {string}
 */
export function normalizeBaseUrl(baseUrl) {
    let url = String(baseUrl || "").trim().replace(/\s+/g, "");
    url = url.replace(/\/+$/, "");
    url = url
        .replace(/\/chat\/completions$/i, "")
        .replace(/\/completions$/i, "")
        .replace(/\/images\/generations$/i, "")
        .replace(/\/models$/i, "")
        .replace(/\/+$/, "");
    return url;
}

/**
 * 拼出某个接口的完整地址
 * @param {string} baseUrl
 * @param {"chat/completions"|"images/generations"|"models"} path
 * @returns {string} 地址为空时返回 ""
 */
export function endpoint(baseUrl, path) {
    const base = normalizeBaseUrl(baseUrl);
    if (!base) return "";
    return `${base}/${String(path).replace(/^\/+/, "")}`;
}

/**
 * 请求头。本地服务（Ollama/LM Studio）不需要 key，但有些网关要求 Authorization 存在，
 * 所以填了就带上，没填就不带。
 * @param {string} apiKey
 * @returns {Object<string,string>}
 */
export function authHeaders(apiKey) {
    const headers = { "Content-Type": "application/json" };
    const key = String(apiKey || "").trim();
    if (key) headers.Authorization = `Bearer ${key}`;
    return headers;
}

/**
 * 从错误响应里抠出服务商自己给的说明（有的话，最有用）
 * @param {any} data
 * @param {string} text
 * @returns {string}
 */
function providerMessage(data, text) {
    const raw = (data && ((data.error && (data.error.message || data.error.type)) || data.message || data.msg))
        || (typeof text === "string" ? text.slice(0, 300) : "");
    return String(raw || "").replace(/\s+/g, " ").trim().slice(0, 300);
}

/**
 * HTTP 错误 → 中文人话 + 下一步怎么做
 * @param {number} status
 * @param {any} data 已解析的 JSON（可能为 null）
 * @param {string} text 原始响应文本
 * @param {string} url
 * @returns {{message:string, hint:string, detail:string}}
 */
export function describeHttpError(status, data, text, url) {
    const detail = providerMessage(data, text);
    switch (status) {
        case 401:
            return {
                message: "密钥被拒绝（401 Unauthorized）",
                hint: "key 填错、复制不全或已失效。回服务商后台重新复制一次完整 key（注意别把空格、换行一起粘进来），粘贴后重新点「测试连接」。",
                detail
            };
        case 402:
            return {
                message: "余额不足（402）",
                hint: "服务商要求先充值。去它的控制台充值页充最小额度即可。",
                detail
            };
        case 403:
            return {
                message: "没有权限（403 Forbidden）",
                hint: "常见原因：该服务要求先实名/开通对应模型、或该模型未开通。去服务商控制台开通模型，或换一个已开通的模型名。",
                detail
            };
        case 404:
            return {
                message: "接口地址不存在（404）",
                hint: "多半是地址写错了：「接口地址」一般只写到 /v1 为止（例：https://api.deepseek.com/v1），不要带 /chat/completions；用本地模型时确认端口（Ollama 是 11434，LM Studio 是 1234）。",
                detail
            };
        case 405:
            return {
                message: "该地址不接受这种请求（405）",
                hint: "地址可能填成了网页地址或另一个接口路径。对照服务商文档里「Base URL」那一行重填。",
                detail
            };
        case 429:
            return {
                message: "请求太频繁或额度用尽（429）",
                hint: "等一分钟再试；如果一直这样，去服务商后台看余额/免费额度是否用完，充点钱或换一家。",
                detail
            };
        case 400:
        case 422: {
            const lower = `${detail}`.toLowerCase();
            if (/response_format|json_object/.test(lower)) {
                return {
                    message: "该服务不支持强制 JSON 输出（400）",
                    hint: "换个模型或换一家服务商；编辑器已经自动重试过一次不带该参数的请求，如果仍失败就是模型本身不支持结构化输出。",
                    detail
                };
            }
            if (/model/.test(lower) && /(not\s*exist|not\s*found|invalid|unsupported|no\s*such)/.test(lower)) {
                return {
                    message: "模型名不对（400）",
                    hint: "点「拉取模型列表」挑一个，或去服务商控制台复制准确的模型 ID（注意大小写与日期后缀）。",
                    detail
                };
            }
            if (/\bn\b|number of images|batch/.test(lower)) {
                return {
                    message: "张数参数不被接受（400）",
                    hint: "部分模型一次只能出 1 张（如 dall-e-3）：把「张数」改成 1，或换成 gpt-image-1 / Kolors 这类支持多张的模型。",
                    detail
                };
            }
            return {
                message: "请求被服务商拒绝（400）",
                hint: "模型名/尺寸/参数有一项它不认。按服务商文档核对，或换一个模型试试。",
                detail
            };
        }
        default:
            if (status >= 500) {
                return {
                    message: `服务商服务器出错（${status}）`,
                    hint: "这是对方的问题，不是你填错了：稍等几分钟重试，或换一家服务商（面板里随时可切换）。",
                    detail
                };
            }
            return {
                message: `请求失败（HTTP ${status}）`,
                hint: `目标是 ${url}。可先点「测试连接」确认地址与 key，再回来重试。`,
                detail
            };
    }
}

/**
 * 网络层异常 → 中文人话
 * @param {Error} err
 * @param {string} url
 * @returns {{message:string, hint:string, detail:string}}
 */
export function describeNetworkError(err, url) {
    const name = err && err.name;
    const text = String((err && err.message) || err || "");
    if (name === "AbortError" || /abort/i.test(text)) {
        return {
            message: "请求超时",
            hint: "写一份设计稿通常 10~60 秒；若一直超时：换更快的模型（flash/小参数）、或换一家国内服务商。",
            detail: url
        };
    }
    return {
        message: "连不上这个地址（网络错误）",
        hint: `目标是 ${url}。检查：① 网络/代理能不能出去（国内服务商不需要代理）；② 地址有没有打错；③ 用本地模型时确认 Ollama/LM Studio 已经启动。`,
        detail: text.slice(0, 200)
    };
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 发一个 JSON 请求
 * @param {string} url
 * @param {{method?:string, apiKey?:string, body?:any, timeout?:number, signal?:AbortSignal}} options
 * @returns {Promise<{ok:true,status:number,data:any,text:string}|{ok:false,kind:"http"|"network"|"shape",status?:number,data?:any,text?:string,error:{message:string,hint:string,detail?:string}}>}
 */
async function requestOnce(url, { method = "POST", apiKey, body, timeout = DEFAULT_TIMEOUT, signal } = {}) {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, timeout);
    const onAbort = () => controller.abort();
    if (signal) signal.addEventListener("abort", onAbort, { once: true });
    let response, text;
    try {
        response = await fetch(url, {
            method,
            headers: authHeaders(apiKey),
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: controller.signal
        });
        text = await response.text();
    } catch (err) {
        const error = timedOut
            ? describeNetworkError(Object.assign(new Error("timeout"), { name: "AbortError" }), url)
            : describeNetworkError(err, url);
        return { ok: false, kind: "network", error };
    } finally {
        clearTimeout(timer);
        if (signal) signal.removeEventListener("abort", onAbort);
    }
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch (err) {
        data = null;
    }
    if (!response.ok) {
        return {
            ok: false,
            kind: "http",
            status: response.status,
            data,
            text,
            error: describeHttpError(response.status, data, text, url)
        };
    }
    if (data === null && text) {
        return {
            ok: false,
            kind: "shape",
            status: response.status,
            text,
            error: {
                message: "接口返回的不是 JSON",
                hint: "地址可能填成了网页地址（返回的是 HTML）。对照服务商文档的「Base URL」重填。",
                detail: text.slice(0, 200)
            }
        };
    }
    return { ok: true, status: response.status, data, text };
}

/**
 * 5xx / 网络抖动重试一次。
 * **超时不重试**（一次就等了两分钟，再等一轮对用户是折磨），用户主动「停止」也不重试。
 * @param {object} result requestOnce 的结果
 * @param {{signal?:AbortSignal}} options
 * @returns {boolean}
 */
function shouldRetry(result) {
    if (!result || result.ok) return false;
    if (result.kind === "shape") return false;
    if (result.kind === "network") return !/超时/.test((result.error && result.error.message) || "");
    return typeof result.status === "number" && result.status >= 500;
}

/**
 * 发请求（失败可重试一次的外壳）
 * @param {string} url
 * @param {object} options
 * @returns {Promise<object>}
 */
async function requestJSON(url, options = {}) {
    const first = await requestOnce(url, options);
    if (!shouldRetry(first)) return first;
    if (options.signal && options.signal.aborted) return first;
    await delay(800);
    if (options.signal && options.signal.aborted) return first;
    const second = await requestOnce(url, options);
    //两次都失败时，优先把服务端真给过的说明（第一次的错误）留给用户
    return second.ok ? second : Object.assign({}, second, { retried: true });
}

/** 把 message.content 的各种形状（字符串 / 分段数组）拍平成文本 */
function flattenContent(content) {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
        return content
            .map(part => (typeof part === "string" ? part : (part && (part.text || part.content)) || ""))
            .join("");
    }
    return "";
}

/**
 * 从各家形状里取回复正文
 * @param {any} payload
 * @returns {string}
 */
export function extractContent(payload) {
    if (!payload || typeof payload !== "object") return "";
    let content = "";
    const choice = Array.isArray(payload.choices) ? payload.choices[0] : null;
    if (choice) {
        const message = choice.message || choice.delta;
        if (message) content = flattenContent(message.content);
        if (!content && typeof choice.text === "string") content = choice.text;
    }
    //OpenAI Responses 风格：{ output: [{ content: [{ type:"output_text", text }] }] }
    if (!content && Array.isArray(payload.output)) {
        content = payload.output
            .flatMap(item => (item && Array.isArray(item.content) ? item.content : []))
            .map(part => (part && (part.text || part.content)) || "")
            .join("");
    }
    if (!content && typeof payload.output_text === "string") content = payload.output_text;
    if (!content && typeof payload.response === "string") content = payload.response;
    if (!content && typeof payload.content === "string") content = payload.content;
    return String(content || "").trim();
}

/** 从第一个 `{` 起做括号配对扫描（跳过字符串里的括号），用于从说明文字里抠出 JSON */
function scanBalanced(text) {
    const start = text.indexOf("{");
    if (start < 0) return "";
    let depth = 0, inString = false, escaped = false;
    for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (inString) {
            if (escaped) escaped = false;
            else if (ch === "\\") escaped = true;
            else if (ch === '"') inString = false;
            continue;
        }
        if (ch === '"') inString = true;
        else if (ch === "{") depth++;
        else if (ch === "}") {
            depth--;
            if (depth === 0) return text.slice(start, i + 1);
        }
    }
    return "";
}

function tryParseJSON(text) {
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch (err) { /* 继续修 */ }
    //最常见的毛病：尾逗号
    try {
        return JSON.parse(text.replace(/,\s*([}\]])/g, "$1"));
    } catch (err) {
        return null;
    }
}

/**
 * 从模型回复里抠出 JSON 对象（容忍 ```json 围栏、前后解说、尾逗号）
 * @param {string} text
 * @returns {object|null}
 */
export function extractJSON(text) {
    if (typeof text !== "string" || !text.trim()) return null;
    let source = text.trim();
    const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(source);
    if (fenced && fenced[1].trim()) source = fenced[1].trim();
    const candidates = [];
    const balanced = scanBalanced(source);
    if (balanced) candidates.push(balanced);
    const first = source.indexOf("{");
    const last = source.lastIndexOf("}");
    if (first >= 0 && last > first) candidates.push(source.slice(first, last + 1));
    candidates.push(source);
    for (const candidate of candidates) {
        const parsed = tryParseJSON(candidate);
        if (parsed && typeof parsed === "object") return parsed;
    }
    return null;
}

/**
 * 从响应里取用量（token 消耗）。
 * 各家字段名不完全一致：OpenAI 系是 `prompt_tokens/completion_tokens/total_tokens`，
 * 部分网关用 `input_tokens/output_tokens`；DeepSeek 还会给 `prompt_cache_hit_tokens`（命中缓存的便宜）。
 * 一个都没给（本地小模型常见）就返回 null —— 界面上会显示「服务商未返回用量」，而不是编一个数。
 * @param {any} payload
 * @returns {{prompt:number, completion:number, total:number, cached:number}|null}
 */
export function extractUsage(payload) {
    const usage = payload && payload.usage;
    if (!usage || typeof usage !== "object") return null;
    const pick = (...keys) => {
        for (const key of keys) {
            const value = Number(usage[key]);
            if (Number.isFinite(value)) return value;
        }
        return 0;
    };
    const prompt = pick("prompt_tokens", "input_tokens");
    const completion = pick("completion_tokens", "output_tokens");
    const total = pick("total_tokens") || prompt + completion;
    const details = usage.prompt_tokens_details || usage.input_tokens_details || {};
    const cached = pick("prompt_cache_hit_tokens", "cached_tokens") || Number(details.cached_tokens) || 0;
    if (!prompt && !completion && !total) return null;
    return { prompt, completion, total, cached };
}

/**
 * 对话补全
 * @param {{
 *   baseUrl:string, apiKey:string, model:string, messages:Array<{role:string,content:string}>,
 *   temperature?:number, timeout?:number, jsonMode?:boolean, signal?:AbortSignal
 * }} options
 * @returns {Promise<{ok:true, content:string, usage:object|null, raw:any}|{ok:false, error:{message:string,hint:string,detail?:string}}>}
 */
export async function chat({ baseUrl, apiKey, model, messages, temperature = 0.8, timeout, jsonMode = true, signal }) {
    const url = endpoint(baseUrl, "chat/completions");
    if (!url) return { ok: false, error: { message: "还没填接口地址", hint: "点右上角「⚙ 接口配置」，选一张服务商卡片，地址会自动填好。" } };
    const name = String(model || "").trim();
    if (!name) return { ok: false, error: { message: "还没填模型名", hint: "在「接口配置」里从下拉挑一个模型，或点「拉取模型列表」。" } };
    const body = { model: name, messages, temperature, stream: false };
    if (jsonMode) body.response_format = { type: "json_object" };
    let result = await requestJSON(url, { apiKey, body, timeout, signal });
    //部分兼容服务不认 response_format —— 服务商明说了才去掉重试一次
    if (!result.ok && result.kind === "http" && result.status === 400 && /response_format|json_object/i.test(result.text || "")) {
        delete body.response_format;
        result = await requestJSON(url, { apiKey, body, timeout, signal });
    }
    if (!result.ok) return result;
    const content = extractContent(result.data);
    if (!content) {
        const reasoning = result.data && result.data.choices && result.data.choices[0]
            && result.data.choices[0].message && result.data.choices[0].message.reasoning_content;
        return {
            ok: false,
            error: {
                message: "模型没有返回正文",
                hint: reasoning
                    ? "该模型只回了思考过程（reasoning_content）。换成非推理模型（如 deepseek-chat / Qwen3 非 thinking 模式）再试。"
                    : "返回结果是空的：确认模型名可用，或换一家服务商试试。",
                detail: JSON.stringify(result.data || {}).slice(0, 200)
            }
        };
    }
    return { ok: true, content, usage: extractUsage(result.data), raw: result.data };
}

/**
 * 拉取模型列表（GET {baseUrl}/models）
 * @param {{baseUrl:string, apiKey:string, timeout?:number}} options
 * @returns {Promise<{ok:true, models:string[]}|{ok:false, error:object, kind?:string, status?:number}>}
 */
export async function listModels({ baseUrl, apiKey, timeout = 30000 }) {
    const url = endpoint(baseUrl, "models");
    if (!url) return { ok: false, kind: "input", error: { message: "还没填接口地址", hint: "先填「接口地址」（一般写到 /v1 为止）。" } };
    const result = await requestJSON(url, { method: "GET", apiKey, timeout });
    if (!result.ok) return result;
    const list = (result.data && Array.isArray(result.data.data) && result.data.data)
        || (result.data && Array.isArray(result.data.models) && result.data.models)
        || [];
    const models = list
        .map(item => (typeof item === "string" ? item : item && (item.id || item.name)))
        .filter(Boolean)
        .map(String)
        .sort((a, b) => a.localeCompare(b));
    if (!models.length) {
        return { ok: false, kind: "shape", error: { message: "这个地址没有返回模型列表", hint: "服务商可能不提供 /models：直接在「模型」框里手填模型名即可（填完再点测试连接）。" } };
    }
    return { ok: true, models };
}

/**
 * 测试连接：先试 /models（便宜、不消耗生成额度），不支持就用一次最小对话请求
 * @param {{baseUrl:string, apiKey:string, model?:string, timeout?:number}} options
 * @returns {Promise<{ok:true, mode:"models"|"chat", models:string[]}|{ok:false, error:object}>}
 */
export async function testConnection({ baseUrl, apiKey, model, timeout = 30000 }) {
    const listed = await listModels({ baseUrl, apiKey, timeout });
    if (listed.ok) return { ok: true, mode: "models", models: listed.models };
    const status = listed.status;
    //有些服务不暴露 /models：退化成一次极小的对话请求
    if (status === 404 || status === 405 || status === 403) {
        if (String(model || "").trim()) {
            const probe = await chat({
                baseUrl,
                apiKey,
                model,
                messages: [{ role: "user", content: "ping" }],
                temperature: 0,
                timeout,
                jsonMode: false
            });
            if (probe.ok) return { ok: true, mode: "chat", models: [] };
            return probe;
        }
        return {
            ok: false,
            error: {
                message: "地址能连通，但该服务不提供 /models 列表",
                hint: "在「模型」框里手填模型名（服务商控制台里复制），然后再点一次测试连接。"
            }
        };
    }
    return listed;
}

/**
 * 生成图片（POST {baseUrl}/images/generations）
 * @param {{
 *   baseUrl:string, apiKey:string, model:string, prompt:string,
 *   n?:number, size?:string, timeout?:number, extra?:object, signal?:AbortSignal
 * }} options
 * @returns {Promise<{ok:true, images:Array<{b64:string,url:string,revised:string}>}|{ok:false, error:object}>}
 */
export async function generateImages({ baseUrl, apiKey, model, prompt, n = 1, size = "1024x1024", timeout, extra, signal }) {
    const url = endpoint(baseUrl, "images/generations");
    if (!url) return { ok: false, error: { message: "还没配置生图接口", hint: "在「接口配置 → 生图接口」里选一家（硅基流动 / 火山方舟 Seedream / 智谱 / OpenAI）。" } };
    const name = String(model || "").trim();
    if (!name) return { ok: false, error: { message: "还没填生图模型名", hint: "例如 Kwai-Kolors/Kolors（硅基流动）、cogview-3-flash（智谱）。" } };
    const text = String(prompt || "").trim();
    if (!text) return { ok: false, error: { message: "还没有提示词", hint: "先写一句画面描述，或点「AI 扩写」由模型代写。" } };
    const body = { model: name, prompt: text, n: Math.max(1, Math.min(4, Number(n) || 1)), size };
    if (extra && typeof extra === "object") Object.assign(body, extra);
    if (!body.response_format) body.response_format = "b64_json";
    let result = await requestJSON(url, { apiKey, body, timeout, signal });
    //gpt-image-1 不接受 response_format（它总是返回 b64）
    if (!result.ok && result.kind === "http" && result.status === 400 && /response_format/i.test(result.text || "")) {
        delete body.response_format;
        result = await requestJSON(url, { apiKey, body, timeout, signal });
    }
    if (!result.ok) return result;
    const rawList = (result.data && Array.isArray(result.data.data) && result.data.data)
        || (result.data && Array.isArray(result.data.images) && result.data.images)
        || [];
    const images = rawList
        .map(item => ({
            b64: (item && (item.b64_json || item.b64 || item.image_base64)) || "",
            url: (item && (item.url || item.image_url)) || "",
            revised: (item && (item.revised_prompt || item.revisedPrompt)) || ""
        }))
        .filter(item => item.b64 || item.url);
    if (!images.length) {
        return {
            ok: false,
            error: {
                message: "接口没有返回图片",
                hint: "确认模型名是生图模型（不是对话模型），并检查「附加参数」是否符合该服务商要求。",
                detail: JSON.stringify(result.data || {}).slice(0, 300)
            }
        };
    }
    return { ok: true, images };
}

/**
 * 从图片二进制里猜 mime（有些服务返回的 base64 不带 data: 前缀）
 * @param {string} base64
 * @returns {string}
 */
export function guessImageMime(base64) {
    const clean = String(base64 || "").replace(/^data:[^;]+;base64,/, "").slice(0, 16);
    if (clean.startsWith("/9j/")) return "image/jpeg";
    if (clean.startsWith("iVBOR")) return "image/png";
    if (clean.startsWith("UklGR")) return "image/webp";
    if (clean.startsWith("R0lGOD")) return "image/gif";
    return "image/png";
}

/**
 * base64 → Blob（写文件用；`game.writeFile` 接受 Blob/File）
 * @param {string} base64
 * @param {string} mime
 * @returns {Blob}
 */
export function base64ToBlob(base64, mime = "image/png") {
    const clean = String(base64 || "").replace(/^data:[^;]+;base64,/, "");
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
}

/**
 * 下载图片（服务商给的是 url 时）→ Blob
 * @param {string} url
 * @param {number} [timeout]
 * @returns {Promise<Blob>}
 */
export async function fetchImageBlob(url, timeout = 60000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`下载图片失败（HTTP ${response.status}）`);
        return await response.blob();
    } finally {
        clearTimeout(timer);
    }
}

/** mime → 文件后缀 */
export function mimeToExt(mime) {
    switch (String(mime || "").toLowerCase()) {
        case "image/jpeg": case "image/jpg": return "jpg";
        case "image/webp": return "webp";
        case "image/gif": return "gif";
        default: return "png";
    }
}

/**
 * 粗略估算一段文字的 token 数（只用于界面提示，别拿它当账单）。
 * 经验值：汉字/中文标点约 1 字 ≈ 1 token，ASCII 约 4 字符 ≈ 1 token。
 * 真实用量以服务商返回的 usage 为准（`extractUsage`）。
 * @param {string} text
 * @returns {number}
 */
export function estimateTokens(text) {
    const source = String(text || "");
    let cjk = 0, other = 0;
    for (const ch of source) {
        if (/[\u3000-\u9fff\uff00-\uffef]/.test(ch)) cjk++;
        else other++;
    }
    return Math.ceil(cjk + other / 4);
}
