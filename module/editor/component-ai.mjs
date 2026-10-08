"use script";
import { lib, game, ui, get, ai, _status } from "../../../../noname.js";
import { HTMLNonameFocusUIElement } from "./component-base.mjs";
import { TEXT_PROFILES, IMAGE_PROFILES, findTextProfile, findImageProfile } from "./ai/profiles.mjs";
import {
    getTextConfig, saveTextConfig, getImageConfig, saveImageConfig,
    getHistory, pushHistory, clearHistory,
    getCandidates, getCandidateMap, addCandidate, removeCandidate as removeCandidateRecord,
    setAppliedSkill, getAppliedSkill, isGuided, markGuided
} from "./ai/store.mjs";
import {
    chat, testConnection, listModels, generateImages,
    extractJSON, base64ToBlob, guessImageMime, fetchImageBlob, mimeToExt, normalizeBaseUrl
} from "./ai/client.mjs";
import {
    ART_STYLES, buildCharacterMessages, buildImageMessages, normalizeDraft, fallbackArtPrompt
} from "./ai/prompts.mjs";
import { ensureHostImport, injectSkillRegistration } from "./ai/skills.mjs";

/**
 * <ai-panel>（侧栏 AI 页）—— 用 AI 生成武将设计稿与原画。
 *
 * 动线：① 接口配置（含新手引导）→ ② 生成设计稿（每个技能附一份 shya 源码）
 *      → ③ 一键应用（编译 → 局内生效 → 建武将草稿 → 逐个补技能卡）
 *      → ④ 生成原画 → 候选图 →「用作立绘」。
 *
 * 与外壳的耦合只有一处：`editorView`（挂载时由 NonameEditorView 挂上来）。
 * 用它读「主区开着的武将编辑器 / 侧栏过滤的武将包」，并调它建草稿、激活标签页。
 * 之所以不用 CustomEvent 走事件：立绘落盘必须走武将编辑器自己的 `saveLocalAsset`
 * （目录配置、`<武将id>.<ext>` 命名、与草稿同生共死都在那里），这里需要拿返回值，
 * 事件传不回来。
 *
 * 界面来自 html/aiPanel.html（经 preprocessing 注入到下方标记之间），样式来自 style/aiPanel.css。
 */
class HTMLNonameAiPanelElement extends HTMLNonameFocusUIElement {
    /**
     * 外壳（NonameEditorView）。非 null 时才有「用到主区」的能力。
     * @type {import("./nonameEditorView.mjs").NonameEditorView|null}
     */
    editorView = null;
    /** 最近一次生成/载入的设计稿（归一化后的对象，卡片顺序即数组下标） */
    #drafts = [];
    /** 正在进行的请求：用于「停止」按钮 */
    #taskAbort = null;
    /** 配置页当前在编辑哪一家（{ text: key, image: key }），「申请页」按钮要用它 */
    #editingProfile = {};
    constructor() {
        super();
        const shadow = this.attachShadow({ mode: "open" });
        //$: shadow , html/aiPanel.html//
shadow.innerHTML=`
<section class="main">
    <header class="topbar">
        <span class="status-dot"></span>
        <span class="status-text">未配置接口</span>
        <span class="topbar-actions">
            <button class="to-config" type="button" title="填写接口地址与 API Key">⚙ 配置</button>
            <button class="to-guide" type="button" title="不会设置？看这里">❓ 引导</button>
        </span>
    </header>

    <section class="block" data-block="draft">
        <h3>① 生成武将设计稿</h3>
        <textarea class="request" rows="3" spellcheck="false" placeholder="用一句话描述你要的武将，例如：蜀势力女性武将，靠卖血换爆发，体力3，两个技能"></textarea>
        <div class="examples">
            <span class="example" data-example="蜀势力女性武将，靠卖血换爆发，体力3，两个技能">卖血爆发</span>
            <span class="example" data-example="魏势力男性武将，靠弃牌控制距离，体力4，一个锁定技">控场封锁</span>
            <span class="example" data-example="群势力武将，回合外也能用牌，体力4，一个视为技一个触发技">回合外偷袭</span>
            <span class="example" data-example="吴势力女性武将，辅助队友摸牌并回复，体力3，两个技能">团队辅助</span>
        </div>
        <details class="advanced">
            <summary>高级设置（可选）</summary>
            <label class="row"><span>候选数量</span><select class="adv-count"><option value="1">1 个</option><option value="2" selected>2 个</option><option value="3">3 个</option></select></label>
            <label class="row"><span>势力</span><select class="adv-group">
                <option value="">不指定</option>
                <option value="wei">魏</option>
                <option value="shu">蜀</option>
                <option value="wu">吴</option>
                <option value="qun">群雄</option>
                <option value="jin">晋</option>
                <option value="shen">神</option>
            </select></label>
            <label class="row"><span>体力</span><select class="adv-hp">
                <option value="">不指定</option>
                <option value="1~3 血（多技能脆皮）">1~3 血（多技能脆皮）</option>
                <option value="3 血">3 血</option>
                <option value="4 血">4 血</option>
                <option value="5~6 血（少技能厚血）">5~6 血（少技能厚血）</option>
            </select></label>
            <label class="row"><span>技能数</span><select class="adv-skillcount">
                <option value="">不指定</option>
                <option value="1 个技能">1 个技能</option>
                <option value="2 个技能">2 个技能</option>
                <option value="3 个技能">3 个技能</option>
            </select></label>
            <label class="row"><span>id 前缀</span><input class="adv-prefix" value="ai_" spellcheck="false" title="生成的武将与技能 id 都会以它开头，避免和已有内容重名"></label>
            <label class="row"><span>不要出现</span><input class="adv-avoid" spellcheck="false" placeholder="如：卖血、觉醒、限定技"></label>
        </details>
        <div class="actions">
            <button class="gen-draft" type="button">生成设计稿</button>
            <button class="cancel-task" type="button" hidden>停止</button>
            <span class="progress"></span>
        </div>
        <div class="results" data-by="draft">
            <p class="empty-hint">生成的候选会出现在这里，点「一键应用」即可变成编辑器里的一份武将草稿。</p>
        </div>
    </section>

    <section class="block" data-block="art">
        <h3>② 生成原画</h3>
        <label class="row"><span>画谁</span><select class="art-subject"></select></label>
        <textarea class="art-prompt" rows="3" spellcheck="false" placeholder="画面描述；留空则按武将资料自动拼一段"></textarea>
        <label class="row"><span>画风</span><select class="art-style"></select></label>
        <div class="art-params">
            <label class="row"><span>尺寸</span><select class="art-size"></select></label>
            <label class="row"><span>张数</span><select class="art-count"><option value="1" selected>1 张</option><option value="2">2 张</option><option value="4">4 张</option></select></label>
        </div>
        <label class="row"><span>负面</span><input class="art-negative" spellcheck="false" placeholder="不要出现的元素（可选，部分服务支持）"></label>
        <div class="actions">
            <button class="expand-prompt" type="button" title="用对话模型把武将资料扩写成美术提示词">AI 扩写</button>
            <button class="gen-art" type="button">生成原画</button>
            <span class="progress art-progress"></span>
        </div>
        <div class="candidates" data-by="candidates">
            <p class="empty-hint">还没有候选图。生成后在这里点「用作立绘」才会真正换掉武将的立绘。</p>
        </div>
    </section>

    <section class="block" data-block="history">
        <h3>生成历史</h3>
        <ul class="history-list"></ul>
        <div class="actions"><button class="clear-history" type="button">清空历史</button></div>
    </section>

    <div class="sheet" data-sheet="config" hidden>
        <header class="sheet-head">
            <span class="sheet-title">接口配置</span>
            <button class="sheet-close" type="button" title="关闭">✕</button>
        </header>
        <div class="sheet-tabs">
            <button type="button" class="chosen" data-config-tab="text">对话接口</button>
            <button type="button" data-config-tab="image">生图接口</button>
        </div>

        <div class="sheet-pane" data-config-pane="text">
            <div class="provider-view" data-provider-view="list">
                <p class="muted">填入提供商的 API 密钥即可使用它的模型。点一行进入配置。</p>
                <ul class="provider-list"></ul>
            </div>
            <div class="provider-view" data-provider-view="edit" hidden>
                <header class="provider-head">
                    <button class="provider-back" type="button" title="返回列表">←</button>
                    <span class="provider-title"></span>
                    <button class="provider-site" type="button" title="在系统浏览器里打开申请页">申请页</button>
                </header>
                <label class="row column"><span>接口地址</span><input class="cfg-baseurl" spellcheck="false" placeholder="例如 https://api.deepseek.com/v1"></label>
                <label class="row column"><span>API Key</span>
                    <span class="key-field">
                        <input class="cfg-apikey" type="password" spellcheck="false" placeholder="粘贴服务商给的 key">
                        <button class="key-toggle" type="button" title="显示 / 隐藏 key">👁</button>
                    </span>
                </label>
                <label class="row column"><span>模型</span>
                    <span class="model-field">
                        <select class="cfg-model"></select>
                        <input class="cfg-model-manual" spellcheck="false" placeholder="手填模型名" hidden>
                        <button class="model-manual" type="button" title="列表里没有想要的模型？手填">✎</button>
                        <button class="cfg-pull" type="button" title="从该地址拉取可用模型列表">拉取</button>
                    </span>
                </label>
                <label class="row"><span>温度</span><input class="cfg-temperature" type="range" min="0" max="1.5" step="0.1" value="0.8"><b class="cfg-temperature-value">0.8</b></label>
                <details class="profile-help"><summary>怎么申请 key</summary><div class="help-body muted"></div></details>
                <div class="actions">
                    <button class="cfg-test" type="button">测试连接</button>
                    <button class="cfg-save" type="button">保存</button>
                    <button class="cfg-clear ghost" type="button" title="清空这一栏的地址与密钥">清空</button>
                </div>
            </div>
            <p class="result-line"></p>
        </div>

        <div class="sheet-pane" data-config-pane="image" hidden>
            <div class="provider-view" data-provider-view="list">
                <p class="muted">生图接口可以和对话接口用同一个 key（硅基流动、火山方舟、智谱、OpenAI 都是）。</p>
                <ul class="provider-list"></ul>
            </div>
            <div class="provider-view" data-provider-view="edit" hidden>
                <header class="provider-head">
                    <button class="provider-back" type="button" title="返回列表">←</button>
                    <span class="provider-title"></span>
                    <button class="provider-site" type="button" title="在系统浏览器里打开申请页">申请页</button>
                </header>
                <label class="row column"><span>接口地址</span><input class="cfg-baseurl" spellcheck="false" placeholder="例如 https://api.siliconflow.cn/v1"></label>
                <label class="row column"><span>API Key</span>
                    <span class="key-field">
                        <input class="cfg-apikey" type="password" spellcheck="false" placeholder="粘贴服务商给的 key">
                        <button class="key-toggle" type="button" title="显示 / 隐藏 key">👁</button>
                    </span>
                </label>
                <label class="row column"><span>模型</span>
                    <span class="model-field">
                        <select class="cfg-model"></select>
                        <input class="cfg-model-manual" spellcheck="false" placeholder="手填模型名" hidden>
                        <button class="model-manual" type="button" title="列表里没有想要的模型？手填">✎</button>
                        <button class="cfg-pull" type="button" title="从该地址拉取可用模型列表">拉取</button>
                    </span>
                </label>
                <label class="row"><span>尺寸</span><select class="cfg-size"></select></label>
                <label class="row column"><span>附加参数</span>
                    <input class="cfg-extra" spellcheck="false" placeholder='可留空；如 {"watermark": false}'>
                </label>
                <details class="profile-help"><summary>怎么申请 key</summary><div class="help-body muted"></div></details>
                <div class="actions">
                    <button class="cfg-test" type="button">测试连接</button>
                    <button class="cfg-save" type="button">保存</button>
                    <button class="cfg-clear ghost" type="button" title="清空这一栏的地址与密钥">清空</button>
                </div>
            </div>
            <p class="result-line"></p>
        </div>
    </div>

    <div class="sheet" data-sheet="guide" hidden>
        <header class="sheet-head">
            <span class="sheet-title">三步就能用上 AI</span>
            <button class="sheet-close" type="button" title="关闭">✕</button>
        </header>
        <ol class="guide-steps">
            <li>
                <b>第一步：去服务商网站拿一个 API Key</b>
                <p>AI 能力在服务商那边，编辑器只负责替你发请求，所以要有一个「钥匙」（API Key）。<br>
                    推荐两家国内直连、注册简单的：<b>DeepSeek</b>（写武将设计稿，便宜）和 <b>硅基流动</b>（一个 key 还能生图）。</p>
                <p class="muted">key 就像密码：只存在你自己的电脑上（游戏配置里），不要发到群里、不要截图给别人。</p>
            </li>
            <li>
                <b>第二步：把 key 填进编辑器</b>
                <p>点下面「去配置」→ 在「对话接口」里点一行服务商（如 DeepSeek，地址与模型会自动填好）→ 粘贴 key → 点「测试连接」。</p>
                <p class="muted">测试成功会显示「连接正常」并列出模型名；失败会告诉你具体是哪一步错了（key 错 / 地址错 / 余额不足 / 网络不通）。</p>
            </li>
            <li>
                <b>第三步：写一句话，生成设计稿</b>
                <p>回到「① 生成武将设计稿」，用一句话描述你想要的武将，点「生成设计稿」。<br>
                    每个技能都会附一份可在游戏里直接运行的 shya 源码；点「一键应用」就会变成编辑器里的一份武将草稿。</p>
            </li>
        </ol>
        <details class="faq">
            <summary>常见问题</summary>
            <dl>
                <dt>要不要花钱？</dt>
                <dd>多数服务商有新用户免费额度；DeepSeek 充几块钱就能用很久。本地模型（Ollama）完全免费。</dd>
                <dt>提示 401 / 密钥被拒绝</dt>
                <dd>key 复制不全或已失效。回服务商后台重新复制（注意别把空格、换行一起粘进来）。</dd>
                <dt>提示 404 / 地址不存在</dt>
                <dd>「接口地址」一般只写到 <b>/v1</b> 为止，不要带 <b>/chat/completions</b>。本地模型端口别填错（Ollama 11434、LM Studio 1234）。</dd>
                <dt>提示 429 / 额度用尽</dt>
                <dd>免费额度用完或余额不足，去服务商后台充值；也可能是问得太快，等一分钟再试。</dd>
                <dt>连不上（网络错误）</dt>
                <dd>国内服务商不需要代理；如果你开着全局代理，先关掉再试。用本地模型时确认 Ollama / LM Studio 已经启动。</dd>
                <dt>生成的技能编译报错怎么办？</dt>
                <dd>结果卡片上会显示哪一行错了，点「打开技能编辑器」可以直接改源码再编译；也可以点「重新生成」换一版。</dd>
                <dt>API Key 会泄露吗？</dt>
                <dd>请求直接从本机发往你填的地址，编辑器不经过任何中转，也不上传 key。</dd>
            </dl>
        </details>
        <div class="actions">
            <button class="guide-config" type="button">去配置</button>
            <button class="guide-done" type="button">我知道了</button>
        </div>
    </div>
</section>
`
//#: shadow , html/aiPanel.html//
    }

    // ──────────────────────────── 生命周期 ────────────────────────────

    connectedCallback() {
        this.loadCss("aiPanel", { root: this.shadowRoot });
        this.#renderArtOptions();
        this.#restoreConfigs();
        this.#bindEvents();
        this.#refreshStatus();
        this.renderHistory();
        this.renderCandidates();
        //首次进来：没配过接口也没看过引导，直接把引导摊开（不弹窗、不打断）
        const text = getTextConfig(this);
        if (!isGuided(this) && !text.baseUrl) this.openSheet("guide");
    }
    disconnectedCallback() {
        this.#taskAbort?.abort();
        this.#taskAbort = null;
    }
    /** 当前工作区（= 扩展名）；立绘落盘、草稿归属都要它 */
    get workspace() {
        return this.configQuery("get", { member: "x19D6_editor.settings.workspace" }) || "";
    }
    #q(selector) {
        return this.shadowRoot.querySelector(selector);
    }
    #qa(selector) {
        return Array.from(this.shadowRoot.querySelectorAll(selector));
    }

    // ──────────────────────────── 配置 / 引导浮层 ────────────────────────────

    /**
     * 打开浮层。**同面板内整块切换**，不做绝对定位覆盖层——侧栏会裁剪，覆盖层会错位。
     * @param {"config"|"guide"} name
     */
    openSheet(name) {
        this.#qa(".block").forEach(node => (node.hidden = true));
        this.#qa(".sheet").forEach(node => (node.hidden = node.dataset.sheet !== name));
        if (name === "config") {
            //每次打开都从「服务商列表」开始（DSH 那样：先看有哪几家，点进去才填表）
            this.#refreshStatus();
            ["text", "image"].forEach(kind => this.#showProviderView(kind, "list"));
        }
        if (typeof this.scrollTo === "function") this.scrollTo({ top: 0 });
    }
    closeSheet() {
        this.#qa(".sheet").forEach(node => (node.hidden = true));
        this.#qa(".block").forEach(node => (node.hidden = false));
        this.#refreshStatus();
    }

    // ──────────────────────────── 状态条 ────────────────────────────

    #refreshStatus() {
        const text = getTextConfig(this);
        const image = getImageConfig(this);
        const textReady = Boolean(text.baseUrl && text.model);
        const imageReady = Boolean(image.baseUrl && image.model);
        const dot = this.#q(".status-dot");
        const label = this.#q(".status-text");
        if (dot) dot.classList.toggle("ok", textReady);
        if (label) {
            const textPart = textReady ? text.model : "对话接口未配置";
            const imagePart = imageReady ? image.model : "未配置";
            label.textContent = `对话：${textPart} ｜ 生图：${imagePart}`;
            label.title = `对话接口：${text.baseUrl || "（未填地址）"}\n生图接口：${image.baseUrl || "（未填地址）"}`;
        }
    }

    // ──────────────────────────── 服务商列表 / 配置页 ────────────────────────────

    /** 某个页签（"text"|"image"）的 DOM 范围。两个页签的字段类名一致，只是 scope 不同 */
    #pane(kind) {
        return this.#q(`[data-config-pane="${kind}"]`);
    }
    #paneQ(kind, selector) {
        return this.#pane(kind)?.querySelector(selector) || null;
    }
    #configOf(kind) {
        return kind === "image" ? getImageConfig(this) : getTextConfig(this);
    }
    #profilesOf(kind) {
        return kind === "image" ? IMAGE_PROFILES : TEXT_PROFILES;
    }
    #profileOf(kind, key) {
        return (kind === "image" ? findImageProfile(key) : findTextProfile(key)) || null;
    }
    /** 当前地址对应哪一家（手改过地址 → 自定义） */
    #providerOf(kind, baseUrl) {
        const normalized = normalizeBaseUrl(baseUrl);
        if (!normalized) return null;
        return this.#profilesOf(kind).find(profile => normalizeBaseUrl(profile.baseUrl) === normalized)
            || { key: "custom", name: "自定义", keyUrl: "", siteUrl: "", models: [], sizes: [] };
    }
    /** 服务商列表：一行一家，只有 状态点 + 名字 + 备注 + 按钮（DSH 那种密度） */
    #renderProviders(kind) {
        const list = this.#paneQ(kind, ".provider-list");
        if (!list) return;
        const config = this.#configOf(kind);
        const activeKey = (this.#providerOf(kind, config.baseUrl) || {}).key || "";
        const ready = Boolean(config.baseUrl && config.model);
        list.replaceChildren();
        this.#profilesOf(kind).forEach(profile => {
            const inUse = profile.key === activeKey;
            const item = document.createElement("li");
            item.className = "provider";
            item.dataset.profileKey = profile.key;
            if (inUse) item.classList.add("in-use");
            const dot = document.createElement("span");
            dot.className = "provider-dot";
            if (inUse && ready) dot.classList.add("ok");
            const name = document.createElement("span");
            name.className = "provider-name";
            name.textContent = profile.name;
            const note = document.createElement("span");
            note.className = "provider-note";
            if (inUse) {
                note.classList.add("in-use");
                note.textContent = ready ? "使用中" : "缺模型";
            } else {
                note.textContent = profile.badge || "";
            }
            const edit = document.createElement("button");
            edit.type = "button";
            edit.className = "provider-edit";
            edit.textContent = inUse ? "编辑" : "配置";
            edit.addEventListener("pointerup", () => this.#openProviderEditor(kind, profile.key));
            item.append(dot, name, note, edit);
            list.appendChild(item);
        });
    }
    /** 在「列表 / 配置」两个视图之间切换 */
    #showProviderView(kind, view) {
        this.#qa(`[data-config-pane="${kind}"] .provider-view`).forEach(node => {
            node.hidden = node.dataset.providerView !== view;
        });
        if (view === "list") {
            this.#editingProfile = { ...(this.#editingProfile || {}), [kind]: "" };
            this.#renderProviders(kind);
        }
    }
    /**
     * 进某家的配置页。编辑「正在用的那家」时回填已保存的值，否则用预设默认值。
     * key 不跨服务商带过去——各家的 key 不通用，带过去只会换来一个 401。
     */
    #openProviderEditor(kind, profileKey) {
        const profile = this.#profileOf(kind, profileKey);
        if (!profile) return;
        const config = this.#configOf(kind);
        const activeKey = (this.#providerOf(kind, config.baseUrl) || {}).key || "";
        const inUse = profile.key === activeKey;
        const set = (selector, value) => {
            const node = this.#paneQ(kind, selector);
            if (node) node.value = value;
        };
        this.#editingProfile = { ...(this.#editingProfile || {}), [kind]: profile.key };
        set(".cfg-baseurl", inUse ? (config.baseUrl || profile.baseUrl || "") : (profile.baseUrl || ""));
        set(".cfg-apikey", inUse ? (config.apiKey || "") : "");
        this.#setModelOptions(kind, profile.models || []);
        this.#writeModel(kind, inUse ? config.model : (profile.defaultModel || (profile.models || [])[0] || ""));
        if (kind === "image") {
            const sizes = profile.sizes || [];
            this.#fillSizeOptions(sizes);
            const sizeNode = this.#paneQ(kind, ".cfg-size");
            if (sizeNode) {
                const wanted = inUse ? (config.size || "") : "";
                const has = Array.from(sizeNode.options).some(option => option.value === wanted);
                sizeNode.value = has ? wanted : (sizes.includes("768x1024") ? "768x1024" : (sizes[0] || "1024x1024"));
            }
            set(".cfg-extra", inUse ? (config.extra || "") : "");
        } else {
            const temperature = inUse ? (Number(config.temperature) || 0.8) : 0.8;
            set(".cfg-temperature", String(temperature));
            const label = this.#paneQ(kind, ".cfg-temperature-value");
            if (label) label.textContent = String(temperature);
        }
        //没有候选模型（自定义服务、或预设名过期）→ 直接进手填模式，别让用户对着空下拉发呆
        this.#toggleManualModel(kind, !(this.#paneQ(kind, ".cfg-model") || {}).options?.length);
        const title = this.#paneQ(kind, ".provider-title");
        if (title) title.textContent = profile.name;
        const site = this.#paneQ(kind, ".provider-site");
        if (site) site.hidden = !(profile.keyUrl || profile.siteUrl);
        this.#renderProfileHelp(kind, profile);
        this.#setResult(kind, inUse
            ? "这是正在使用的一家。改完点「保存」，或先点「测试连接」验证。"
            : `已按「${profile.name}」填好地址与模型，把它的 API Key 粘进来，再点「测试连接」。`, "warn");
        this.#showProviderView(kind, "edit");
    }
    /** 申请步骤：折叠在配置页底部（默认收起，保持界面干净） */
    #renderProfileHelp(kind, profile) {
        const details = this.#paneQ(kind, "details.profile-help");
        if (!details) return;
        const summary = details.querySelector("summary");
        const body = details.querySelector(".help-body");
        if (!(summary && body)) return;
        body.replaceChildren();
        details.open = false;
        if (!profile.key || profile.key === "custom") {
            summary.textContent = "自定义服务的填法";
            const tip = document.createElement("span");
            tip.className = "tip";
            tip.textContent = "地址与模型都要自己填；不确定模型名就点「拉取」，能连上就会列出可用模型。";
            body.appendChild(tip);
            return;
        }
        summary.textContent = `怎么申请「${profile.name}」的 key`;
        const list = document.createElement("ol");
        (profile.steps || []).forEach(step => {
            const item = document.createElement("li");
            item.textContent = step;
            list.appendChild(item);
        });
        body.appendChild(list);
        if (profile.tip) {
            const tip = document.createElement("span");
            tip.className = "tip";
            tip.textContent = profile.tip;
            body.appendChild(tip);
        }
    }
    /**
     * 写「模型」下拉的候选。
     * ⚠️ **故意不用 `<input list>` + `<datalist>`**：Chromium 会把候选按输入框里的当前文本过滤，
     * 且动态加进去的选项常常不刷新 —— 「点拉取 → 拉到 N 个模型 → 却看不到列表」就是这么来的
     * （2026-10 用户反馈）。原生 `<select>` 永远把选项摆出来，没有这层缓存/过滤。
     * @param {"text"|"image"} kind
     * @param {string[]} models
     */
    #setModelOptions(kind, models) {
        const select = this.#paneQ(kind, ".cfg-model");
        if (!select) return;
        const current = select.value || "";
        const merged = Array.from(new Set((models || []).filter(Boolean)));
        if (current && !merged.includes(current)) merged.unshift(current);
        select.replaceChildren();
        merged.forEach(model => {
            const option = document.createElement("option");
            option.value = model;
            option.textContent = model;
            select.appendChild(option);
        });
        if (current && merged.includes(current)) select.value = current;
    }
    /** 读当前模型（手填模式优先） */
    #readModel(kind) {
        const manual = this.#paneQ(kind, ".cfg-model-manual");
        if (manual && !manual.hidden) return manual.value.trim();
        const select = this.#paneQ(kind, ".cfg-model");
        return select ? select.value.trim() : "";
    }
    /** 写当前模型（不在候选里就补一个选项，历史配置/手填过的名字不会丢） */
    #writeModel(kind, value) {
        const select = this.#paneQ(kind, ".cfg-model");
        const manual = this.#paneQ(kind, ".cfg-model-manual");
        const text = String(value || "");
        if (!select) return;
        if (text && !Array.from(select.options).some(option => option.value === text)) {
            const option = document.createElement("option");
            option.value = text;
            option.textContent = text;
            select.appendChild(option);
        }
        if (text) select.value = text;
        if (manual) manual.value = text;
    }
    /** 在下拉 / 手填之间切换（✎ 按钮） */
    #toggleManualModel(kind, force) {
        const select = this.#paneQ(kind, ".cfg-model");
        const manual = this.#paneQ(kind, ".cfg-model-manual");
        if (!(select && manual)) return;
        const on = force === undefined ? manual.hidden : Boolean(force);
        if (on) manual.value = select.options.length ? (select.value || manual.value) : manual.value;
        else if (manual.value.trim()) this.#writeModel(kind, manual.value.trim());
        manual.hidden = !on;
        select.hidden = on;
        if (on) manual.focus();
    }
    /** 尺寸候选。预设自带的尺寸排在最前（各家支持的尺寸不一样，方舟填错会直接 400） */
    #fillSizeOptions(extra) {
        const common = ["1024x1024", "768x1024", "1024x768", "1024x1536", "1536x1024", "512x512"];
        const sizes = Array.from(new Set([...(extra || []), ...common]));
        const preferred = (extra || []).includes("768x1024") ? "768x1024" : ((extra || [])[0] || "768x1024");
        this.#qa("select.cfg-size, select.art-size").forEach(select => {
            const current = select.value || "";
            select.replaceChildren();
            sizes.forEach(size => {
                const option = document.createElement("option");
                option.value = size;
                option.textContent = size;
                select.appendChild(option);
            });
            select.value = sizes.includes(current) ? current : preferred;
        });
    }

    // ──────────────────────────── 配置读写 ────────────────────────────

    /**
     * 打开配置页时回填：两个页签各自的列表 + 表单值。
     * 表单默认停在「列表」视图（DSH 那样：先看有哪些服务商，点进去才填表）。
     */
    #restoreConfigs() {
        ["text", "image"].forEach(kind => {
            const config = this.#configOf(kind);
            const profile = this.#profileOf(kind, config.provider) || this.#providerOf(kind, config.baseUrl);
            const set = (selector, value) => {
                const node = this.#paneQ(kind, selector);
                if (node) node.value = value;
            };
            set(".cfg-baseurl", config.baseUrl || "");
            set(".cfg-apikey", config.apiKey || "");
            this.#setModelOptions(kind, (profile && profile.models) || []);
            this.#writeModel(kind, config.model || "");
            this.#toggleManualModel(kind, !config.model && !(profile && profile.models || []).length);
            if (kind === "image") {
                this.#fillSizeOptions(profile ? profile.sizes : null);
                set(".cfg-size", config.size || "768x1024");
                set(".cfg-extra", config.extra || "");
            } else {
                const temperature = Number.isFinite(Number(config.temperature)) ? Number(config.temperature) : 0.8;
                set(".cfg-temperature", String(temperature));
                const label = this.#paneQ(kind, ".cfg-temperature-value");
                if (label) label.textContent = String(temperature);
            }
            if (profile) this.#renderProfileHelp(kind, profile);
            this.#renderProviders(kind);
            this.#showProviderView(kind, "list");
        });
        //原画区的尺寸下拉也要有值（它和生图配置共用同一批候选）
        const artSize = this.#q(".art-size");
        if (artSize && !artSize.options.length) this.#fillSizeOptions(getImageConfig(this).size ? [getImageConfig(this).size] : null);
        if (artSize && !artSize.value) artSize.value = "768x1024";
    }
    /**
     * 保存配置
     * @param {"text"|"image"} kind
     * @param {boolean} [silent] 测试连接后顺手保存时不要盖掉测试结果
     */
    #saveConfig(kind, silent = false) {
        const baseUrl = (this.#paneQ(kind, ".cfg-baseurl") || {}).value?.trim() || "";
        const provider = this.#providerOf(kind, baseUrl);
        const patch = {
            provider: provider ? provider.key : "custom",
            baseUrl,
            apiKey: (this.#paneQ(kind, ".cfg-apikey") || {}).value?.trim() || "",
            model: this.#readModel(kind)
        };
        if (kind === "image") {
            patch.size = (this.#paneQ(kind, ".cfg-size") || {}).value?.trim() || "1024x1024";
            patch.extra = (this.#paneQ(kind, ".cfg-extra") || {}).value?.trim() || "";
            saveImageConfig(this, patch);
            if (!silent) this.#setResult("image", "生图接口已保存 ✓", "ok");
        } else {
            patch.temperature = Number((this.#paneQ(kind, ".cfg-temperature") || {}).value) || 0.8;
            saveTextConfig(this, patch);
            if (!silent) this.#setResult("text", "对话接口已保存 ✓", "ok");
        }
        this.#refreshStatus();
        this.#renderProviders(kind);
    }
    #setResult(kind, message, level = "") {
        const node = this.#q(`[data-config-pane="${kind}"] .result-line`);
        if (!node) return;
        node.textContent = message;
        node.className = `result-line ${level}`.trim();
    }
    /** 清空当前这一栏（地址 / 密钥 / 模型），列表上那家随即变回「未配置」 */
    #clearConfig(kind) {
        const set = (selector, value) => {
            const node = this.#paneQ(kind, selector);
            if (node) node.value = value;
        };
        set(".cfg-baseurl", "");
        set(".cfg-apikey", "");
        this.#setModelOptions(kind, []);
        this.#writeModel(kind, "");
        this.#toggleManualModel(kind, true);
        if (kind === "image") {
            set(".cfg-size", "768x1024");
            set(".cfg-extra", "");
            saveImageConfig(this, { provider: "", baseUrl: "", apiKey: "", model: "", size: "1024x1024", extra: "" });
        } else {
            saveTextConfig(this, { provider: "", baseUrl: "", apiKey: "", model: "", temperature: 0.8 });
        }
        this.#refreshStatus();
        this.#renderProviders(kind);
        this.#setResult(kind, "已清空这一栏 ✓", "ok");
    }
    /** 把 {message, hint, detail} 拼成新手看得懂的几行 */
    #errorText(error) {
        if (!error) return "未知错误";
        return [error.message, error.hint, error.detail ? `（服务商返回：${error.detail}）` : ""].filter(Boolean).join("\n");
    }

    // ──────────────────────────── 事件绑定 ────────────────────────────

    #bindEvents() {
        //配置 / 引导浮层
        this.#q(".to-config").addEventListener("pointerup", () => this.openSheet("config"));
        this.#q(".to-guide").addEventListener("pointerup", () => this.openSheet("guide"));
        this.#qa(".sheet-close").forEach(node => node.addEventListener("pointerup", () => this.closeSheet()));
        this.#q(".guide-config").addEventListener("pointerup", () => this.openSheet("config"));
        this.#q(".guide-done").addEventListener("pointerup", () => {
            markGuided(this);
            this.closeSheet();
        });
        //配置页签
        const tabs = this.#qa("[data-config-tab]");
        tabs.forEach(tab => tab.addEventListener("pointerup", () => {
            tabs.forEach(node => node.classList.toggle("chosen", node === tab));
            this.#qa(".sheet-pane").forEach(pane => (pane.hidden = pane.dataset.configPane !== tab.dataset.configTab));
        }));
        //key 显示 / 隐藏
        this.#qa(".key-toggle").forEach(button => button.addEventListener("pointerup", () => {
            const input = button.parentElement.querySelector("input");
            if (!input) return;
            input.type = input.type === "password" ? "text" : "password";
        }));
        //两个页签的字段类名一致 → 按页签委托一次绑完，不用给 text/image 各写一遍
        this.#qa(".sheet-pane").forEach(pane => {
            const kind = pane.dataset.configPane;
            const on = (selector, handler) => pane.querySelectorAll(selector).forEach(node => node.addEventListener("pointerup", handler));
            on(".provider-back", () => this.#showProviderView(kind, "list"));
            on(".provider-site", () => this.#openProfileSite(kind));
            on(".model-manual", () => this.#toggleManualModel(kind));
            on(".cfg-pull", () => this.#pullModels(kind));
            on(".cfg-test", () => this.#testConnection(kind));
            on(".cfg-clear", () => this.#clearConfig(kind));
            on(".cfg-save", () => {
                this.#saveConfig(kind);
                this.#showProviderView(kind, "list");
                this.#setResult(kind, "已保存 ✓ 列表里带绿点的那家就是当前使用的。", "ok");
            });
            const temperature = pane.querySelector(".cfg-temperature");
            if (temperature) temperature.addEventListener("input", () => {
                const label = pane.querySelector(".cfg-temperature-value");
                if (label) label.textContent = temperature.value;
            });
            //填了 key 就顺手把引导标记成看过，免得下次又摊开
            const apiKey = pane.querySelector(".cfg-apikey");
            if (apiKey) apiKey.addEventListener("change", () => {
                if (apiKey.value.trim()) markGuided(this);
            });
        });
        //生成设计稿
        this.#qa(".example").forEach(node => node.addEventListener("pointerup", () => {
            this.#q(".request").value = node.dataset.example || "";
            this.#q(".request").focus();
        }));
        this.#q(".gen-draft").addEventListener("pointerup", () => this.generateDraft());
        this.#q(".cancel-task").addEventListener("pointerup", () => {
            this.#taskAbort?.abort();
            this.#setProgress("draft", "已请求停止…");
        });
        //原画
        this.#q(".expand-prompt").addEventListener("pointerup", () => this.expandArtPrompt());
        this.#q(".gen-art").addEventListener("pointerup", () => this.generateArt());
        this.#q(".art-subject").addEventListener("change", () => this.#prefillArtPrompt());
        this.#q(".clear-history").addEventListener("pointerup", () => {
            clearHistory(this);
            this.renderHistory();
        });
        //鼠标落到原画区时刷新一次「画谁」（主区可能刚打开了新的武将草稿）
        this.#q('[data-block="art"]').addEventListener("pointerdown", () => this.#renderArtOptions(), true);
    }
    #setProgress(scope, text) {
        const node = this.#q(scope === "art" ? ".art-progress" : ".progress");
        if (node) node.textContent = text || "";
    }
    #setBusy(scope, busy, text = "") {
        const draftBusy = scope === "draft" && busy;
        this.#q(".gen-draft").disabled = draftBusy;
        this.#q(".gen-art").disabled = scope === "art" && busy;
        this.#q(".expand-prompt").disabled = scope === "art" && busy;
        this.#q(".cancel-task").hidden = !draftBusy;
        this.#setProgress(scope, busy ? text : "");
    }
    async #testConnection(kind) {
        const baseUrl = (this.#paneQ(kind, ".cfg-baseurl") || {}).value?.trim() || "";
        const apiKey = (this.#paneQ(kind, ".cfg-apikey") || {}).value?.trim() || "";
        const model = this.#readModel(kind);
        if (!baseUrl) {
            this.#setResult(kind, "先填「接口地址」——在列表里点一家服务商会自动填。", "warn");
            return;
        }
        this.#setResult(kind, "正在测试连接…", "warn");
        const result = await testConnection({ baseUrl, apiKey, model });
        if (result.ok) {
            const current = this.#readModel(kind);
            this.#setModelOptions(kind, result.models);
            this.#writeModel(kind, current || result.models[0] || "");
            this.#setResult(kind, result.models.length
                ? `连接正常 ✓ 已拉到 ${result.models.length} 个模型，在「模型」下拉里挑一个（没有要的就点 ✎ 手填）。`
                : "连接正常 ✓（该服务不提供模型列表，手填的模型名可用）", "ok");
            //测试通过就顺手保存，省一次点击（silent：别盖掉上面这条成功提示）
            this.#saveConfig(kind, true);
            return;
        }
        this.#setResult(kind, `测试失败：\n${this.#errorText(result.error)}`, "err");
    }
    /**
     * 拉取模型列表。
     * ⚠️ 结果填进**原生 `<select>`**（以前是 `<input list>` + `<datalist>`）：Chromium 会把
     * datalist 候选按输入框当前文本过滤、动态加的选项还常不刷新，于是「拉到 N 个模型」
     * 却一个都看不到（2026-10 用户反馈）。select 没有这层过滤/缓存，选项一定摆得出来。
     */
    async #pullModels(kind) {
        const baseUrl = (this.#paneQ(kind, ".cfg-baseurl") || {}).value?.trim() || "";
        const apiKey = (this.#paneQ(kind, ".cfg-apikey") || {}).value?.trim() || "";
        if (!baseUrl) {
            this.#setResult(kind, "先填「接口地址」，再点「拉取」。", "warn");
            return;
        }
        this.#setResult(kind, "正在拉取模型列表…", "warn");
        const result = await listModels({ baseUrl, apiKey });
        if (!result.ok) {
            this.#setResult(kind, `拉取失败：\n${this.#errorText(result.error)}`, "err");
            return;
        }
        const current = this.#readModel(kind);
        this.#setModelOptions(kind, result.models);
        this.#writeModel(kind, current || result.models[0] || "");
        this.#setResult(kind, `拉到 ${result.models.length} 个模型 ✓ 在「模型」下拉里挑一个（点 ✎ 可以手填别的）。`, "ok");
    }
    #openProfileSite(kind) {
        const baseUrl = (this.#paneQ(kind, ".cfg-baseurl") || {}).value?.trim() || "";
        const profile = this.#providerOf(kind, baseUrl) || this.#profileOf(kind, (this.#editingProfile || {})[kind]);
        const url = (profile && (profile.keyUrl || profile.siteUrl)) || "";
        if (!url) {
            this.#setResult(kind, "自定义地址没有申请页：去服务商官网找「API 密钥」页即可。", "warn");
            return;
        }
        if (this.#openExternal(url)) this.#setResult(kind, `已在系统浏览器打开：${url}`, "ok");
        else this.#setResult(kind, `无法自动打开浏览器，请手动访问：${url}`, "warn");
    }
    /** 用系统浏览器打开外部链接（Electron shell → remote.shell → window.open） */
    #openExternal(url) {
        if (!url) return false;
        const req = typeof window.require === "function" ? window.require : null;
        if (req) {
            try {
                const electron = req("electron");
                if (electron && electron.shell && typeof electron.shell.openExternal === "function") {
                    electron.shell.openExternal(url);
                    return true;
                }
            } catch (err) { /* 继续退 */ }
            try {
                const electronVersion = parseFloat((window.process && window.process.versions && window.process.versions.electron) || "0");
                const remote = electronVersion >= 14 ? req("@electron/remote") : (req("electron") || {}).remote;
                if (remote && remote.shell && typeof remote.shell.openExternal === "function") {
                    remote.shell.openExternal(url);
                    return true;
                }
            } catch (err) { /* 继续退 */ }
        }
        try {
            return Boolean(window.open(url, "_blank"));
        } catch (err) {
            return false;
        }
    }
    /** 用系统看图工具打开扩展里的候选图 */
    #openLocalImage(relative) {
        if (!relative) return;
        const root = String(window.__dirname || "").replace(/\\/g, "/");
        const req = typeof window.require === "function" ? window.require : null;
        if (req && root) {
            try {
                const electron = req("electron");
                if (electron && electron.shell && typeof electron.shell.openPath === "function") {
                    electron.shell.openPath(`${root}/extension/${relative}`.replace(/\//g, "\\"));
                    return;
                }
            } catch (err) { /* 退到 window.open */ }
        }
        try {
            window.open(`/extension/${relative}`, "_blank");
        } catch (err) {
            console.warn("打开图片失败", relative, err);
        }
    }

    // ──────────────────────────── 生成设计稿 ────────────────────────────

    /** 已被占用的武将 id / 技能 id（避免生成的东西覆盖游戏自带内容） */
    #takenIds() {
        const characters = new Set();
        Object.values(lib.characterPack || {}).forEach(pack => Object.keys(pack || {}).forEach(id => characters.add(id)));
        Object.keys(lib.character || {}).forEach(id => characters.add(id));
        const records = this.configQuery("get", { member: "x19D6_editor.characters" }) || {};
        Object.values(records).forEach(record => {
            if (record && record.id) characters.add(record.id);
        });
        return { characters: Array.from(characters), skills: Object.keys(lib.skill || {}) };
    }
    /** 高级设置 → 生成参数 */
    #advancedOptions() {
        return {
            count: Number(this.#q(".adv-count").value) || 2,
            prefix: (this.#q(".adv-prefix").value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "") || "ai_"),
            group: this.#q(".adv-group").value,
            hpRange: this.#q(".adv-hp").value,
            skillCount: this.#q(".adv-skillcount").value,
            avoid: this.#q(".adv-avoid").value.trim()
        };
    }
    /** ① 生成设计稿：对话模型 → JSON → 归一化 → 结果卡片 */
    async generateDraft() {
        const config = getTextConfig(this);
        if (!config.baseUrl || !config.model) {
            this.openSheet("config");
            this.#setResult("text", "还没配好对话接口：先点一张服务商卡片、粘上 API Key，再点「测试连接」。", "warn");
            return;
        }
        const request = this.#q(".request").value.trim();
        if (!request) {
            this.#setProgress("draft", "先写一句你想要的武将描述（或点上面的示例）。");
            return;
        }
        const options = this.#advancedOptions();
        const controller = new AbortController();
        this.#taskAbort = controller;
        this.#setBusy("draft", true, "正在生成设计稿…（通常 10~60 秒，可点「停止」）");
        try {
            const result = await chat({
                baseUrl: config.baseUrl,
                apiKey: config.apiKey,
                model: config.model,
                temperature: Number(config.temperature) || 0.8,
                messages: buildCharacterMessages({ request, ...options }),
                signal: controller.signal
            });
            if (!result.ok) {
                this.#setBusy("draft", false);
                this.#setProgress("draft", `生成失败：\n${this.#errorText(result.error)}`);
                return;
            }
            const parsed = extractJSON(result.content);
            if (!parsed) {
                this.#setBusy("draft", false);
                this.#setProgress("draft", `模型没有返回合法的 JSON（可能被截断，或该模型不擅长结构化输出）。\n返回内容开头：${result.content.slice(0, 160)}`);
                return;
            }
            const taken = this.#takenIds();
            const draft = normalizeDraft(parsed, {
                prefix: options.prefix,
                count: options.count,
                fallbackGroup: options.group,
                takenCharacterIds: taken.characters,
                takenSkillIds: taken.skills
            });
            if (!draft.characters.length) {
                this.#setBusy("draft", false);
                this.#setProgress("draft", `模型没给出武将（JSON 结构对不上）。\n返回内容开头：${result.content.slice(0, 160)}`);
                return;
            }
            this.#drafts = draft.characters;
            pushHistory(this, { request, draft: draft.characters[0] });
            this.renderDrafts();
            this.renderHistory();
            this.#setBusy("draft", false);
            this.#setProgress("draft", `生成完成 ✓ 共 ${draft.characters.length} 个候选，点卡片上的「一键应用」就能用到编辑器里。`);
        } catch (err) {
            this.#setBusy("draft", false);
            this.#setProgress("draft", `生成出错：${(err && err.message) || err}`);
        } finally {
            this.#taskAbort = null;
            this.#q(".cancel-task").hidden = true;
        }
    }

    /** 渲染设计稿卡片（生成 / 历史载入 / 应用后都会走它） */
    renderDrafts() {
        const root = this.#q('.results[data-by="draft"]');
        if (!root) return;
        root.replaceChildren();
        if (!this.#drafts.length) {
            const hint = document.createElement("p");
            hint.className = "empty-hint";
            hint.textContent = "生成的候选会出现在这里，点「一键应用」即可变成编辑器里的一份武将草稿。";
            root.appendChild(hint);
            return;
        }
        this.#drafts.forEach((draft, index) => root.appendChild(this.#createDraftCard(draft, index)));
        this.#renderArtOptions();
    }
    #createDraftCard(draft, index) {
        const card = document.createElement("div");
        card.className = "draft-card";
        card.dataset.draftIndex = String(index);
        if (draft.__applied) card.classList.add("applied");

        const head = document.createElement("div");
        head.className = "draft-head";
        const name = document.createElement("span");
        name.className = "draft-name";
        name.textContent = draft.name;
        const meta = document.createElement("span");
        meta.className = "draft-meta";
        meta.textContent = [
            draft.id,
            this.textQuery("characterTranslation", { attr: "group", text: draft.group }) || draft.group,
            draft.sex === "female" ? "女" : "男",
            `${draft.hp}${draft.maxHp !== draft.hp ? `/${draft.maxHp}` : ""} 体力`,
            draft.title || ""
        ].filter(Boolean).join(" ｜ ");
        head.append(name, meta);

        const note = document.createElement("div");
        note.className = "draft-note";
        note.textContent = [draft.designNote, draft.intro].filter(Boolean).join("\n");

        card.append(head, note);
        draft.skills.forEach(skill => card.appendChild(this.#createSkillItem(draft, skill)));

        const actions = document.createElement("div");
        actions.className = "draft-actions";
        const applyButton = document.createElement("button");
        applyButton.type = "button";
        applyButton.textContent = draft.__applied ? "重新应用" : "一键应用";
        applyButton.title = "编译技能 → 局内生效 → 新建武将草稿并填好属性";
        applyButton.addEventListener("pointerup", () => this.applyDraft(index));
        const copyButton = document.createElement("button");
        copyButton.type = "button";
        copyButton.className = "ghost";
        copyButton.textContent = "复制 JSON";
        copyButton.addEventListener("pointerup", () => this.#copyText(
            JSON.stringify(draft, (key, value) => (key.startsWith("__") ? undefined : value), 2),
            copyButton
        ));
        actions.append(applyButton, copyButton);
        card.appendChild(actions);
        return card;
    }
    #createSkillItem(draft, skill) {
        const state = (draft.__compile || {})[skill.id] || null;
        const item = document.createElement("div");
        item.className = "skill-item";
        if (state) item.classList.add(state.status === "ok" ? "good" : "bad");

        const head = document.createElement("div");
        head.className = "skill-head";
        const name = document.createElement("span");
        name.className = "skill-name";
        name.textContent = skill.name;
        const id = document.createElement("span");
        id.className = "skill-id";
        id.textContent = skill.id;
        head.append(name, id);
        if (!skill.hasCode) {
            const warn = document.createElement("span");
            warn.className = "skill-id";
            warn.textContent = "⚠ 模型没给源码";
            head.appendChild(warn);
        }
        item.appendChild(head);

        const desc = document.createElement("div");
        desc.className = "skill-desc";
        desc.textContent = skill.description || "（模型没有给出技能描述）";
        item.appendChild(desc);

        if (state) {
            const diag = document.createElement("div");
            diag.className = `diag ${state.status === "ok" ? "ok" : ""}`;
            if (state.status === "ok") diag.textContent = "编译通过 ✓ 可一键应用";
            else if (state.diagnostics && state.diagnostics.length) {
                diag.textContent = state.diagnostics
                    .map(d => `${d.line}:${d.col} ${d.severity === "error" ? "错误" : "警告"} [${d.code}] ${d.message}`)
                    .join("\n");
            } else diag.textContent = state.message || "编译失败";
            item.appendChild(diag);
        }

        if (skill.hasCode) {
            const details = document.createElement("details");
            const summary = document.createElement("summary");
            summary.textContent = "查看 shya 源码";
            const pre = document.createElement("pre");
            pre.className = "skill-code";
            pre.textContent = skill.shya;
            details.append(summary, pre);
            item.appendChild(details);
        }

        const actions = document.createElement("div");
        actions.className = "draft-actions";
        const compileButton = document.createElement("button");
        compileButton.type = "button";
        compileButton.className = "ghost";
        compileButton.textContent = "编译校验";
        compileButton.addEventListener("pointerup", async () => {
            compileButton.disabled = true;
            compileButton.textContent = "编译中…";
            await this.#compileSkills(draft);
            this.renderDrafts();
        });
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "ghost";
        editButton.textContent = "打开技能编辑器";
        editButton.title = "把这份源码带进 shya 技能编辑器，改完可以编译、生成";
        editButton.addEventListener("pointerup", () => this.openInSkillEditor(skill));
        actions.append(compileButton, editButton);
        item.appendChild(actions);
        return item;
    }

    /**
     * 编译设计稿里的所有技能，结果写回 `draft.__compile[技能id]`
     * @param {object} draft
     * @returns {Promise<object>}
     */
    async #compileSkills(draft) {
        draft.__compile = draft.__compile || {};
        if (!draft.skills.some(skill => skill.hasCode)) return draft.__compile;
        let compiler = null;
        try {
            const { loadCompiler } = await import("./shya/loader.mjs");
            compiler = await loadCompiler();
        } catch (err) {
            draft.skills.forEach(skill => {
                draft.__compile[skill.id] = { status: "fail", message: `编译器载入失败：${(err && err.message) || err}` };
            });
            return draft.__compile;
        }
        draft.skills.forEach(skill => {
            if (!skill.hasCode) {
                draft.__compile[skill.id] = { status: "fail", message: "模型没有给出 shya 源码，无法应用（可点「重新生成」换一版）" };
                return;
            }
            const prepared = ensureHostImport(skill.shya);
            let result = null;
            try {
                result = compiler.compile(prepared.source);
            } catch (err) {
                draft.__compile[skill.id] = { status: "fail", message: `编译器异常：${(err && err.message) || err}` };
                return;
            }
            const diagnostics = ((result && result.diagnostics) || [])
                .filter(d => d.severity === "error")
                .map(d => ({ ...d, line: Math.max(1, d.line - prepared.injected) }));
            if (!result || !result.ok) {
                draft.__compile[skill.id] = {
                    status: "fail",
                    diagnostics,
                    message: diagnostics.length ? "" : "编译没有通过，但没有给出具体诊断"
                };
                return;
            }
            const injected = injectSkillRegistration(result.code, skill.id, { name: skill.name, description: skill.description });
            if (!injected.ok) {
                draft.__compile[skill.id] = { status: "fail", message: injected.reason };
                return;
            }
            draft.__compile[skill.id] = { status: "ok", code: injected.code, diagnostics };
        });
        return draft.__compile;
    }

    /**
     * ② 一键应用：编译 → 注册进 lib.skill（局内生效）→ 建武将草稿 → 逐个补技能卡
     * @param {number} index #drafts 下标
     */
    async applyDraft(index) {
        const draft = this.#drafts[index];
        if (!draft) return;
        if (!this.workspace) {
            this.#setProgress("draft", "还没选工作区：请到左侧「设置 → 工作区」选一个扩展（武将草稿与立绘都要落在它下面）。");
            return;
        }
        if (!this.editorView) {
            this.#setProgress("draft", "编辑器外壳还没就绪，请关掉编辑器再打开一次。");
            return;
        }
        this.#setProgress("draft", "正在编译技能…");
        await this.#compileSkills(draft);
        const applied = [];
        const failed = [];
        draft.skills.forEach(skill => {
            const state = draft.__compile[skill.id];
            if (!state || state.status !== "ok") {
                failed.push(skill.name);
                return;
            }
            //安全线：与游戏自带技能重名（且不是我们之前生成过的）就跳过，绝不覆盖别人的技能
            if (lib.skill[skill.id] && !getAppliedSkill(this, skill.id)) {
                state.status = "fail";
                state.message = `技能 id「${skill.id}」与游戏/其它扩展已有的技能重名，已跳过（换个 id 前缀重新生成即可）`;
                failed.push(skill.name);
                return;
            }
            try {
                //与 shya 编辑器的「生成」同一套求值环境；注入那一步见 ai/skills.mjs
                const run = new Function("_status", "lib", "game", "ui", "get", "ai", state.code);
                run(_status, lib, game, ui, get, ai);
                if (!lib.skill[skill.id]) throw new Error("注册后 lib.skill 里仍然没有这个技能");
                setAppliedSkill(this, skill.id, { code: skill.shya, name: skill.name, description: skill.description });
                applied.push(skill.id);
            } catch (err) {
                state.status = "fail";
                state.message = `局内生效失败：${(err && err.message) || err}`;
                failed.push(skill.name);
            }
        });
        //落成武将草稿：属性走 applyData，技能必须逐个 addSkill
        //（changeData 的 skills 分支只认 append/remove/rewrite，applyData 传的 replace 不会写入 —— 实测）
        const filterData = (this.editorView.filterDraftData && this.editorView.filterDraftData()) || {};
        const data = {
            ...filterData,
            name: draft.name,
            id: draft.id,
            sex: draft.sex,
            group: draft.group,
            hp: draft.hp,
            maxHp: draft.maxHp,
            intro: draft.intro || ""
        };
        //空 title 不要往下传：getAllData 不会删掉空的 title，会原样写进生成的武将文件
        if (draft.title) data.title = draft.title;
        if (draft.pinyin) data.pinyin = draft.pinyin;
        const editor = this.editorView.createCharacterEditor("", data);
        this.editorView.activateMainPane(editor);
        applied.forEach(id => {
            if (!editor.getData("skills").includes(id)) editor.addSkill(id);
        });
        editor.saveDraft();
        this.editorView.loadSideBarCharacter?.();
        draft.__applied = true;
        this.renderDrafts();
        //选中态（性别/势力）要走选择管理器，而管理器是 connectedCallback 里建的：
        //保险起见在下一个宏任务里再回填一次属性（技能卡已经加好，applyData 不会动它们）
        setTimeout(() => {
            if (!editor.isConnected) return;
            editor.applyData(data);
            editor.saveDraft();
        }, 0);
        this.#setProgress("draft", failed.length
            ? `已应用 ${applied.length}/${draft.skills.length} 个技能：${failed.join("、")} 没成功（见技能卡上的诊断，可点「打开技能编辑器」改好再应用）。武将草稿已建好。`
            : `已应用 ✓ 武将「${draft.name}」已建成草稿，${applied.length} 个技能已在局内生效（技能卡片见主区）。`);
    }

    /** 把某份技能源码带进 shya 技能编辑器 */
    async openInSkillEditor(skill) {
        const stored = getAppliedSkill(this, skill.id);
        const source = skill.shya || (stored && stored.code) || "";
        if (typeof game.x19D6_openShyaSkillEditor !== "function") {
            this.#setProgress("draft", "当前版本没有开放 shya 技能编辑器入口。");
            return;
        }
        if (!source) {
            this.#setProgress("draft", "这份技能没有源码，没什么可编辑的：点「重新生成」换一版吧。");
            return;
        }
        try {
            const node = await game.x19D6_openShyaSkillEditor({ source, skillId: skill.id });
            node?.setSource?.(source, skill.id);
        } catch (err) {
            this.#setProgress("draft", `打开技能编辑器失败：${(err && err.message) || err}`);
        }
    }
    #copyText(text, button) {
        const area = document.createElement("textarea");
        area.value = text;
        this.shadowRoot.appendChild(area);
        area.select();
        try {
            document.execCommand("copy");
            if (button) {
                const original = button.textContent;
                button.textContent = "已复制 ✓";
                setTimeout(() => (button.textContent = original), 1200);
            }
        } catch (err) {
            console.warn("复制失败", err);
        } finally {
            area.remove();
        }
    }

    // ──────────────────────────── 生成历史 ────────────────────────────

    renderHistory() {
        const root = this.#q(".history-list");
        if (!root) return;
        const history = getHistory(this);
        root.replaceChildren();
        if (!history.length) {
            const hint = document.createElement("p");
            hint.className = "empty-hint";
            hint.textContent = "还没有生成记录。";
            root.appendChild(hint);
            return;
        }
        history.forEach(entry => {
            const item = document.createElement("li");
            const name = document.createElement("span");
            name.className = "history-name";
            name.textContent = `${entry.draft.name}（${entry.draft.id}）`;
            name.title = entry.request || "";
            const time = document.createElement("span");
            time.className = "history-time";
            time.textContent = this.#formatTime(entry.at);
            const load = document.createElement("button");
            load.type = "button";
            load.className = "ghost";
            load.textContent = "载入";
            load.addEventListener("pointerup", () => {
                this.#drafts = [entry.draft];
                this.renderDrafts();
                this.#setProgress("draft", "已从历史载入：点卡片上的「一键应用」即可使用。");
            });
            item.append(name, time, load);
            root.appendChild(item);
        });
    }
    #formatTime(at) {
        const date = new Date(Number(at) || Date.now());
        const pad = value => String(value).padStart(2, "0");
        return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    // ──────────────────────────── 原画 ────────────────────────────

    #renderArtOptions() {
        const styleSelect = this.#q(".art-style");
        if (styleSelect && !styleSelect.options.length) {
            ART_STYLES.forEach(style => {
                const option = document.createElement("option");
                option.value = style.key;
                option.textContent = style.name;
                styleSelect.appendChild(option);
            });
        }
        const subjectSelect = this.#q(".art-subject");
        if (!subjectSelect) return;
        const previous = subjectSelect.value;
        subjectSelect.replaceChildren();
        const add = (value, label) => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = label;
            subjectSelect.appendChild(option);
        };
        this.#drafts.forEach((draft, index) => add(`draft:${index}`, `设计稿：${draft.name}`));
        (this.editorView?.characterEditors || []).forEach(editor => {
            const id = editor.getData?.("id");
            if (!id) return;
            add(`editor:${id}`, `草稿：${editor.getData("name") || id}（${id}）`);
        });
        add("custom", "手动输入（不关联武将）");
        if (previous && Array.from(subjectSelect.options).some(option => option.value === previous)) subjectSelect.value = previous;
    }
    /** 选了「画谁」就把提示词预填成该武将的（用户改过就不动） */
    #prefillArtPrompt() {
        const area = this.#q(".art-prompt");
        if (!area) return;
        const subject = this.#currentSubject();
        area.value = subject.artPrompt || fallbackArtPrompt(subject, this.#q(".art-style").value);
    }
    /**
     * 当前「画谁」：优先设计稿，其次主区打开的草稿
     * @returns {object} {id,name,sex,group,intro,designNote,artPrompt,skills}
     */
    #currentSubject() {
        const value = this.#q(".art-subject").value || "";
        if (value.startsWith("draft:")) {
            const draft = this.#drafts[Number(value.slice(6))];
            if (draft) return draft;
        }
        if (value.startsWith("editor:")) {
            const id = value.slice(7);
            const editor = (this.editorView?.characterEditors || []).find(item => item.getData?.("id") === id);
            if (editor) {
                return {
                    id,
                    name: editor.getData("name") || id,
                    sex: editor.getData("sex"),
                    group: editor.getData("group"),
                    intro: editor.getData("intro"),
                    artPrompt: "",
                    skills: editor.getData("skills").map(skillId => ({
                        name: this.textQuery("skillTranslation", { text: skillId, attr: "name" }) || skillId
                    }))
                };
            }
        }
        return { id: "", name: "未命名武将", skills: [] };
    }
    /** 用对话模型把武将资料扩写成美术提示词 */
    async expandArtPrompt() {
        const config = getTextConfig(this);
        if (!config.baseUrl || !config.model) {
            this.openSheet("config");
            this.#setResult("text", "「AI 扩写」要用对话接口，先把对话接口配好（也可以在下面自己写画面描述）。", "warn");
            return;
        }
        const subject = this.#currentSubject();
        const styleKey = this.#q(".art-style").value;
        this.#setBusy("art", true, "正在扩写提示词…");
        try {
            const result = await chat({
                baseUrl: config.baseUrl,
                apiKey: config.apiKey,
                model: config.model,
                temperature: 0.9,
                jsonMode: false,
                messages: buildImageMessages(subject, styleKey)
            });
            if (!result.ok) {
                this.#setBusy("art", false);
                this.#setProgress("art", `扩写失败：${this.#errorText(result.error)}（也可以直接用本地拼好的提示词生成）`);
                return;
            }
            this.#q(".art-prompt").value = result.content.trim();
            this.#setBusy("art", false);
            this.#setProgress("art", "提示词已写好 ✓ 可以直接改，然后点「生成原画」。");
        } catch (err) {
            this.#setBusy("art", false);
            this.#setProgress("art", `扩写出错：${(err && err.message) || err}`);
        }
    }
    /** 生图接口的「附加参数」→ 对象（写错就忽略，不因为一个参数把整次生成卡住） */
    #parseExtra(text) {
        const source = String(text || "").trim();
        if (!source) return null;
        try {
            const parsed = JSON.parse(source);
            return parsed && typeof parsed === "object" ? parsed : null;
        } catch (err) {
            console.warn("附加参数不是合法 JSON，已忽略：", source);
            return null;
        }
    }
    /** 候选图 / 立绘的存放目录（与武将编辑器共用同一份目录配置） */
    #characterImageDir() {
        const workspace = this.workspace;
        const config = this.configQuery("get", { member: `x19D6_editor.extensionFileConfig.${workspace}` }) || {};
        return config["extension-character-image"] || `${workspace}/image/character`;
    }
    /**
     * 生图超时。预设可以覆盖（阿里百炼官方就建议开 600s：出图本身就慢，多张更久），
     * 默认给 300s —— 比对话的 180s 宽，别让用户等到一半被自己掐断。
     * @param {object} config 生图接口配置
     * @returns {number} 毫秒
     */
    #imageTimeout(config) {
        const profile = this.#profileOf("image", config.provider) || this.#providerOf("image", config.baseUrl);
        return Number(profile && profile.timeout) || 300000;
    }
    /** ③ 生成原画 → 存成候选图（**不动**正式立绘，点「用作立绘」才生效） */
    async generateArt() {
        const config = getImageConfig(this);
        if (!config.baseUrl || !config.model) {
            this.openSheet("config");
            const imageTab = this.#qa("[data-config-tab]").find(node => node.dataset.configTab === "image");
            imageTab?.dispatchEvent(new Event("pointerup"));
            this.#setResult("image", "还没配好生图接口：点一张服务商卡片、粘 key、填模型（生图模型名与对话模型不同）。", "warn");
            return;
        }
        if (!this.workspace) {
            this.#setProgress("art", "还没选工作区：请到左侧「设置 → 工作区」选一个扩展，候选图要存到它下面。");
            return;
        }
        const subject = this.#currentSubject();
        const styleKey = this.#q(".art-style").value;
        const prompt = this.#q(".art-prompt").value.trim() || fallbackArtPrompt(subject, styleKey);
        if (!prompt) {
            this.#setProgress("art", "先写一句画面描述（或点「AI 扩写」）。");
            return;
        }
        const size = this.#q(".art-size").value.trim() || config.size || "1024x1024";
        const count = Number(this.#q(".art-count").value) || 1;
        //负面提示词：并进附加参数（各家的字段名都是 negative_prompt，不认的服务商也只会忽略它）
        const negative = this.#q(".art-negative").value.trim();
        const extra = { ...(this.#parseExtra(config.extra) || {}) };
        if (negative) extra.negative_prompt = negative;
        this.#setBusy("art", true, `正在出图…（${count} 张，通常 10~60 秒）`);
        try {
            const result = await generateImages({
                baseUrl: config.baseUrl,
                apiKey: config.apiKey,
                model: config.model,
                prompt,
                n: count,
                size,
                timeout: this.#imageTimeout(config),
                extra: Object.keys(extra).length ? extra : null
            });
            if (!result.ok) {
                this.#setBusy("art", false);
                this.#setProgress("art", `出图失败：${this.#errorText(result.error)}`);
                return;
            }
            const directory = this.#characterImageDir();
            const baseName = subject.id || "ai-unassigned";
            let saved = 0;
            for (let index = 0; index < result.images.length; index++) {
                const image = result.images[index];
                try {
                    const blob = image.b64
                        ? base64ToBlob(image.b64, guessImageMime(image.b64))
                        : await fetchImageBlob(image.url);
                    const ext = mimeToExt(blob.type || "image/png");
                    const relative = `${directory}/${baseName}-cand-${Date.now()}-${index + 1}.${ext}`;
                    await this.fileQuery("writeFile", { path: `extension/${relative}`, data: blob });
                    addCandidate(this, subject.id, { path: `ext:${relative}`, prompt, model: config.model });
                    saved++;
                } catch (err) {
                    console.warn("候选图保存失败", err);
                }
            }
            this.#setBusy("art", false);
            this.renderCandidates();
            this.#setProgress("art", saved
                ? `出图完成 ✓ 已存 ${saved} 张候选图（在下面点「用作立绘」才会真正换立绘）。`
                : "接口返回了图片，但保存失败：检查「设置 → 工作区」里的资源目录是否存在。");
        } catch (err) {
            this.#setBusy("art", false);
            this.#setProgress("art", `出图出错：${(err && err.message) || err}`);
        }
    }

    /** 候选图列表（按武将分组，每张可单独用作立绘 / 删除） */
    renderCandidates() {
        const root = this.#q('.candidates[data-by="candidates"]');
        if (!root) return;
        root.replaceChildren();
        const map = getCandidateMap(this);
        const keys = Object.keys(map);
        if (!keys.length) {
            const hint = document.createElement("p");
            hint.className = "empty-hint";
            hint.textContent = "还没有候选图。生成后在这里点「用作立绘」才会真正换掉武将的立绘。";
            root.appendChild(hint);
            return;
        }
        keys.forEach(characterId => {
            const list = getCandidates(this, characterId);
            if (!list.length) return;
            const title = document.createElement("div");
            title.className = "draft-meta";
            title.textContent = characterId === "__unassigned" ? "未关联武将" : `武将：${characterId}`;
            root.appendChild(title);
            const grid = document.createElement("div");
            grid.className = "candidate-grid";
            list.forEach(candidate => grid.appendChild(this.#createCandidateItem(characterId, candidate)));
            root.appendChild(grid);
        });
    }
    #createCandidateItem(characterId, candidate) {
        const item = document.createElement("div");
        item.className = "candidate";
        const relative = candidate.path.startsWith("ext:") ? candidate.path.slice(4) : candidate.path.replace(/^\/?extension\//, "");
        const meta = document.createElement("div");
        meta.className = "candidate-meta";
        meta.textContent = `${this.#formatTime(candidate.at)}｜${candidate.model || ""}`;
        meta.title = candidate.prompt || "";
        const img = document.createElement("img");
        img.src = `${lib.assetURL || ""}extension/${relative}`;
        img.alt = candidate.prompt || "候选原画";
        img.title = candidate.prompt || "";
        img.addEventListener("pointerup", () => this.#openLocalImage(relative));
        img.addEventListener("error", () => {
            item.classList.add("broken");
            meta.textContent = "图片文件已不在（改过武将 id 或手动删过？）——点 🗑 清掉这条记录";
        });
        const ops = document.createElement("div");
        ops.className = "candidate-ops";
        const use = document.createElement("button");
        use.type = "button";
        use.textContent = "用作立绘";
        use.addEventListener("pointerup", () => this.useAsAvatar(characterId, candidate));
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "ghost";
        remove.textContent = "🗑";
        remove.title = "删除这张候选图（磁盘文件一起删）";
        remove.addEventListener("pointerup", () => this.removeCandidateFile(characterId, candidate));
        ops.append(use, remove);
        item.append(img, ops, meta);
        return item;
    }
    /**
     * 用作立绘：走**武将编辑器自己的** saveLocalAsset（目录配置、`<武将id>.<ext>` 命名、
     * 与草稿同生共死都在那里），这里只负责喂一个 File 进去并刷新界面。
     */
    async useAsAvatar(characterId, candidate) {
        if (!characterId || characterId === "__unassigned") {
            this.#setProgress("art", "这张候选图没有关联武将（生成时「画谁」没选武将）：先选一位武将再生成。");
            return;
        }
        const editors = this.editorView?.characterEditors || [];
        const editor = editors.find(item => item.getData?.("id") === characterId) || null;
        if (!editor) {
            this.#setProgress("art", `主区没有打开「${characterId}」的武将草稿：先在左侧「武将」里打开它，或点设计稿上的「一键应用」。`);
            return;
        }
        const relative = candidate.path.startsWith("ext:") ? candidate.path.slice(4) : candidate.path.replace(/^\/?extension\//, "");
        try {
            const data = await this.fileQuery("readBinaryFile", { path: `extension/${relative}` });
            const ext = (relative.split(".").pop() || "png").toLowerCase();
            const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "webp" ? "image/webp" : "image/png";
            const file = new File([data], `ai-avatar.${ext}`, { type: mime });
            const reference = await editor.saveLocalAsset(file, "extension-character-image");
            if (!reference) return;
            const target = reference.startsWith("ext:") ? reference.slice(4) : reference;
            editor.reloadAvatar(`/extension/${target}`);
            editor.saveDraft();
            this.#setProgress("art", `已把这张图设为「${characterId}」的立绘 ✓（草稿已保存，主区立绘已刷新）`);
        } catch (err) {
            this.#setProgress("art", `设置立绘失败：${(err && err.message) || err}`);
        }
    }
    /** 删除候选图：磁盘文件与记录一起删 */
    async removeCandidateFile(characterId, candidate) {
        const relative = candidate.path.startsWith("ext:") ? candidate.path.slice(4) : candidate.path.replace(/^\/?extension\//, "");
        if (relative) await this.fileQuery("removeFile", { path: `extension/${relative}` });
        removeCandidateRecord(this, characterId, candidate.path);
        this.renderCandidates();
        this.#setProgress("art", "已删除这张候选图。");
    }
}
customElements.define("ai-panel", HTMLNonameAiPanelElement);
export { HTMLNonameAiPanelElement };
