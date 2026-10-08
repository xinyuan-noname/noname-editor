/**
 * AI 区域的服务商预设（纯数据模块）。
 *
 * 目的：**让不会配置接口的人也能三步上手** —— 选一张卡片，地址与模型自动填好，
 * 只差把申请来的 key 粘进去。每张卡片都带：适合谁 / 大概花多少钱 /
 * 一步一步怎么办 / 去哪申请（keyUrl）。
 *
 * 约定：
 *  - 只描述 **OpenAI 兼容** 服务（`{baseUrl}/chat/completions` 与 `{baseUrl}/images/generations`）；
 *  - `baseUrl` 一律写到 `/v1`（或服务商要求的等价前缀）为止，**不带**具体接口路径；
 *  - `models` 是「推荐候选」，服务商的模型名会变——面板里有「拉取模型列表」按钮兜底，
 *    所以文案里写明「以服务商控制台为准」，不要写成唯一真理；
 *  - 价格只写定性说明（便宜/有免费额度），不写具体数字，避免过期误导。
 */

/** 文本（对话）预设，顺序即界面顺序：从「最适合新手」到「最折腾」 */
export const TEXT_PROFILES = [
    {
        key: "deepseek",
        name: "DeepSeek（深度求索）",
        badge: "新手首选",
        baseUrl: "https://api.deepseek.com/v1",
        models: ["deepseek-chat", "deepseek-reasoner"],
        defaultModel: "deepseek-chat",
        keyUrl: "https://platform.deepseek.com/api_keys",
        siteUrl: "https://platform.deepseek.com",
        price: "国内直连、按量计费，写武将设计稿用最便宜的对话模型就够",
        fit: "国内网络直连不用代理，注册简单，中文写作能力强",
        steps: [
            "打开 platform.deepseek.com，用手机号注册并登录",
            "左侧「API keys」→「创建 API key」→ 复制弹出的那串 sk- 开头的字符（只显示一次）",
            "回到这里粘贴到「API Key」框，地址已自动填好，点「测试连接」",
            "提示余额不足时，在「充值」页充最小额度即可（几块钱能用很久）"
        ],
        tip: "key 只在创建时完整显示一次，没抄下来就删掉重建一个。"
    },
    {
        key: "siliconflow",
        name: "硅基流动 SiliconFlow",
        badge: "文+图 一个 key",
        baseUrl: "https://api.siliconflow.cn/v1",
        models: ["Qwen/Qwen3-8B", "deepseek-ai/DeepSeek-V3", "Qwen/Qwen2.5-72B-Instruct"],
        defaultModel: "Qwen/Qwen3-8B",
        keyUrl: "https://cloud.siliconflow.cn/account/ak",
        siteUrl: "https://cloud.siliconflow.cn",
        price: "新用户送额度，部分小模型免费；生图（Kolors）按张计费",
        fit: "一个 key 同时能生成设计稿和原画，最省事的一家",
        steps: [
            "打开 cloud.siliconflow.cn 注册登录（手机号即可）",
            "右上角头像 →「API 密钥」→「新建 API 密钥」→ 复制",
            "粘贴到这里点「测试连接」；生图接口可以复制同一份 key",
            "生图模型填 Kwai-Kolors/Kolors（便宜的国产文生图），尺寸 1024x1024"
        ],
        tip: "这个平台的模型名是「组织/模型」形式（如 Qwen/Qwen3-8B），别只填后半截。"
    },
    {
        key: "ark",
        name: "火山方舟（豆包 / Seedream）",
        badge: "豆包+Seedream",
        baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
        models: ["doubao-seed-1-6-250615", "doubao-1-5-pro-32k-250115"],
        defaultModel: "",
        keyUrl: "https://console.volcengine.com/ark",
        siteUrl: "https://console.volcengine.com/ark",
        price: "有免费额度，超出后按量计费",
        fit: "想用豆包写设计稿、用 Seedream 出原画（国内速度很快）",
        steps: [
            "打开 console.volcengine.com/ark，用火山引擎账号登录并完成实名",
            "左侧「API Key 管理」→ 创建 API Key → 复制",
            "左侧「开通管理」里把要用的模型开通，并复制模型 ID（带日期的那串）",
            "生图接口的模型填 Seedream 的模型 ID（doubao-seedream-3-0-* 之类）"
        ],
        tip: "方舟的模型名带日期后缀且会更新，最稳的做法是把模型 ID 从「开通管理」里复制过来，"
            + "或点下面的「拉取模型列表」。"
    },
    {
        key: "moonshot",
        name: "Moonshot（Kimi）",
        baseUrl: "https://api.moonshot.cn/v1",
        models: ["moonshot-v1-8k", "kimi-k2-0711-preview"],
        defaultModel: "moonshot-v1-8k",
        keyUrl: "https://platform.moonshot.cn/console/api-keys",
        siteUrl: "https://platform.moonshot.cn",
        price: "国内直连，按量计费",
        fit: "已经在用 Kimi 的人，注册即有额度",
        steps: [
            "打开 platform.moonshot.cn 注册登录",
            "左侧「API Key 管理」→「新建」→ 复制 key",
            "粘贴到这里点「测试连接」"
        ]
    },
    {
        key: "zhipu",
        name: "智谱 GLM",
        baseUrl: "https://open.bigmodel.cn/api/paas/v4",
        models: ["glm-4-flash", "glm-4-plus"],
        defaultModel: "glm-4-flash",
        keyUrl: "https://bigmodel.cn/usercenter/apikeys",
        siteUrl: "https://bigmodel.cn",
        price: "glm-4-flash 免费额度大，适合先试水",
        fit: "想先零成本试一下 AI 生成（flash 系列免费额度足够）",
        steps: [
            "打开 bigmodel.cn 注册并登录",
            "右上角头像 →「API Keys」→ 复制",
            "粘贴到这里点「测试连接」",
            "生图想用智谱的话，模型填 cogview-3-flash，地址与上面相同"
        ]
    },
    {
        key: "qwen",
        name: "通义千问（阿里百炼）",
        baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        models: ["qwen-plus", "qwen-max", "qwen-turbo"],
        defaultModel: "qwen-plus",
        keyUrl: "https://bailian.console.aliyun.com",
        siteUrl: "https://bailian.console.aliyun.com",
        price: "新用户有免费额度，之后按量计费",
        fit: "已有阿里云账号的人，直接开通百炼即可",
        steps: [
            "打开 bailian.console.aliyun.com 登录并开通百炼",
            "右上角「API-KEY」→ 创建 → 复制",
            "粘贴到这里点「测试连接」（注意地址结尾是 compatible-mode/v1）"
        ]
    },
    {
        key: "openai",
        name: "OpenAI 官方",
        baseUrl: "https://api.openai.com/v1",
        models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
        defaultModel: "gpt-4o-mini",
        keyUrl: "https://platform.openai.com/api-keys",
        siteUrl: "https://platform.openai.com",
        price: "需要海外支付方式；单价高于国内服务商",
        fit: "已有 OpenAI 账号、且网络能直连 api.openai.com 的人",
        steps: [
            "打开 platform.openai.com 登录",
            "「API keys」→「Create new secret key」→ 复制 sk- 开头的 key",
            "粘贴到这里点「测试连接」",
            "连不上多半是网络问题：这种情况建议换 DeepSeek / 硅基流动"
        ]
    },
    {
        key: "ollama",
        name: "本地 Ollama / LM Studio",
        badge: "不用 key 不用联网",
        baseUrl: "http://127.0.0.1:11434/v1",
        models: ["qwen2.5:7b", "llama3.1:8b", "deepseek-r1:7b"],
        defaultModel: "qwen2.5:7b",
        keyUrl: "https://ollama.com/download",
        siteUrl: "https://ollama.com",
        needsKey: false,
        price: "完全免费（吃本机显卡/内存）",
        fit: "不想注册账号、不想花钱、不介意慢一点",
        steps: [
            "到 ollama.com/download 下载安装 Ollama",
            "打开命令行执行：ollama pull qwen2.5:7b（模型越大越慢，7b 起步够用）",
            "确认 Ollama 在运行（任务栏有图标；或执行 ollama serve）",
            "API Key 随便填 ollama 即可（本地服务不校验），地址用默认值",
            "LM Studio 同理：打开它的 Local Server，地址填 http://127.0.0.1:1234/v1"
        ],
        tip: "本地模型不擅长写代码，生成 shya 技能可能经常编译失败——失败时会给出诊断，"
            + "可以点「重新生成」或改用在线服务商。"
    },
    {
        key: "custom",
        name: "其它 / 自定义",
        badge: "任意兼容服务",
        baseUrl: "",
        models: [],
        defaultModel: "",
        keyUrl: "",
        siteUrl: "",
        price: "看服务商",
        fit: "任何提供 OpenAI 兼容接口的服务（中转站、自建网关、vLLM 等）",
        steps: [
            "把服务商的接口地址填进「接口地址」，一般写到 /v1 为止",
            "例如 https://xxx.com/v1 —— 不要带上 /chat/completions",
            "填上 key 与模型名，点「测试连接」",
            "不确定模型名时，点「拉取模型列表」，能连上就会把可用模型列出来"
        ]
    }
];

/** 生图预设（OpenAI 兼容 images/generations） */
export const IMAGE_PROFILES = [
    {
        key: "siliconflow",
        name: "硅基流动 SiliconFlow",
        badge: "推荐",
        baseUrl: "https://api.siliconflow.cn/v1",
        models: ["Kwai-Kolors/Kolors", "stabilityai/stable-diffusion-3-5-large"],
        defaultModel: "Kwai-Kolors/Kolors",
        keyUrl: "https://cloud.siliconflow.cn/account/ak",
        siteUrl: "https://cloud.siliconflow.cn",
        sizes: ["1024x1024", "768x1024", "1024x768"],
        price: "按张计费，国产模型很便宜",
        fit: "国内直连、支持中文提示词、出图快",
        steps: [
            "与文本接口用同一个 key（cloud.siliconflow.cn → API 密钥）",
            "模型填 Kwai-Kolors/Kolors",
            "尺寸用 768x1024 最接近无名杀立绘的竖构图"
        ]
    },
    {
        key: "ark",
        name: "火山方舟 Seedream",
        baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
        models: ["doubao-seedream-3-0-t2i-250415"],
        defaultModel: "",
        keyUrl: "https://console.volcengine.com/ark",
        siteUrl: "https://console.volcengine.com/ark",
        sizes: ["1024x1024", "768x1024", "1024x768", "2048x2048"],
        price: "有免费额度，超出按张计费",
        fit: "画面质量好、中文理解好，适合直接当武将立绘",
        steps: [
            "与文本接口用同一个 key（方舟「API Key 管理」）",
            "先在「开通管理」里开通 Seedream 并复制模型 ID",
            "模型名填 Seedream 的模型 ID（带日期后缀）"
        ],
        tip: "方舟的尺寸只支持它列出的几种，填错会报参数错误。"
    },
    {
        key: "dashscope",
        name: "阿里百炼（通义万相 Qwen-Image）",
        badge: "中文友好",
        baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        models: ["qwen-image-3.0", "qwen-image-3.0-pro", "qwen-image-2.1-pro"],
        defaultModel: "qwen-image-3.0",
        keyUrl: "https://bailian.console.aliyun.com",
        siteUrl: "https://bailian.console.aliyun.com",
        sizes: ["1024x1024", "768x1024", "1024x768", "1024x1536"],
        timeout: 600000,
        price: "按张计费，新用户有免费额度",
        fit: "通义万相 Qwen-Image：中文提示词理解好，横竖构图都支持（与通义千问共用一份 key）",
        steps: [
            "打开 bailian.console.aliyun.com，登录并开通百炼（和文字模型用同一份 API-KEY 即可）",
            "右上角「API-KEY」→ 创建 → 复制，粘贴到上面的 API Key 框",
            "模型选 qwen-image-3.0（标准版）/ qwen-image-3.0-pro（质量更好）/ qwen-image-2.1-pro",
            "出图比别家慢：单张几十秒到两分钟，多张更久，生成时别关编辑器",
            "想要更稳的专属域名：控制台「工作空间」里能查到 https://<工作空间ID>.cn-beijing.maas.aliyuncs.com/compatible-mode/v1，填进「接口地址」即可"
        ],
        tip: "它返回的是 24 小时有效的图片直链（传 response_format=b64_json 会被忽略），编辑器会自动把图下载存进扩展；"
            + "另外「负面提示词」只有 qwen-image-3.0 系列支持，2.1-pro 填了可能报参数错误。"
    },
    {
        key: "zhipu",
        name: "智谱 CogView",
        baseUrl: "https://open.bigmodel.cn/api/paas/v4",
        models: ["cogview-3-flash", "cogview-4"],
        defaultModel: "cogview-3-flash",
        keyUrl: "https://bigmodel.cn/usercenter/apikeys",
        siteUrl: "https://bigmodel.cn",
        sizes: ["1024x1024", "768x1024", "1024x768"],
        price: "cogview-3-flash 便宜",
        fit: "已经配了智谱文本接口的人，直接复用 key",
        steps: [
            "与文本接口同一个 key",
            "模型填 cogview-3-flash（便宜）或 cogview-4（质量更好）"
        ]
    },
    {
        key: "openai",
        name: "OpenAI 官方",
        baseUrl: "https://api.openai.com/v1",
        models: ["gpt-image-1", "dall-e-3"],
        defaultModel: "gpt-image-1",
        keyUrl: "https://platform.openai.com/api-keys",
        siteUrl: "https://platform.openai.com",
        sizes: ["1024x1024", "1024x1536"],
        price: "按张计费，单价较高",
        fit: "已有 OpenAI 账号与可直连的网络",
        steps: [
            "与文本接口同一个 key",
            "模型填 gpt-image-1（质量好）或 dall-e-3（便宜些）",
            "注意 dall-e-3 一次只能出 1 张"
        ]
    },
    {
        key: "custom",
        name: "其它 / 自定义",
        baseUrl: "",
        models: [],
        defaultModel: "",
        keyUrl: "",
        siteUrl: "",
        sizes: ["1024x1024", "768x1024", "1024x768"],
        price: "看服务商",
        fit: "任何提供 OpenAI 兼容 images/generations 的服务（如豆包 Seedream 中转、ComfyUI 网关等）",
        steps: [
            "填服务商给的接口地址（写到 /v1 为止）与 key",
            "模型名按服务商文档填",
            "如果服务商要求额外参数（如 watermark、width/height），填到「附加参数」里"
        ]
    }
];

/** 按 key 找预设（找不到返回 null，界面会退回「自定义」） */
export function findTextProfile(key) {
    return TEXT_PROFILES.find(item => item.key === key) || null;
}
export function findImageProfile(key) {
    return IMAGE_PROFILES.find(item => item.key === key) || null;
}
