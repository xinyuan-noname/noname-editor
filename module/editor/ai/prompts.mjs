/**
 * AI 区域的提示词与设计稿校验（纯数据 / 纯函数模块）。
 *
 * 三块内容：
 *  1. **shya 速查表**：把「编译器真正吃哪套写法」写进提示词，让模型一次写对。
 *     这里的每条规则都在本机实测过（扩展内置 wasm 编译验证），不是凭印象写的：
 *       - 属性/方法用**空格**不用点：`player hp`、`player draw(1)`、`get color(card)`
 *         （写成 `event.cards` 会直接 SYN001 语法错误）；
 *       - 插槽值直接写语句、不要包大括号；多条语句换行写；
 *       - 局部变量 `const x = …` 与 `if/else { }` 都可用；
 *       - `get`/`lib`/`ui`/`ai`/`game` 是引擎全局量，未声明只会 TC010 警告（正常）。
 *  2. **设计稿的 JSON 契约**：系统提示词 + 校验/修复（`normalizeDraft`），
 *     保证「模型胡写」也不会把脏数据灌进编辑器。
 *  3. **原画提示词**：美术扩写提示词与本地兜底拼装（不通模型也能出图）。
 */

import { SKILL_KINDS } from "../shya/skillTemplates.mjs";

/** 合法的势力 id（引擎内置；自定义势力请用户自己在编辑器里建） */
export const GROUPS = ["wei", "shu", "wu", "qun", "jin", "shen"];

/** 真实存在的事件名（从 resources/app/character 全量 trigger 字段里抽取后人工筛选） */
export const TRIGGER_GROUPS = [
    {
        name: "回合与阶段",
        events: [
            ["gameStart", "游戏开始时"],
            ["roundStart", "每轮开始时"],
            ["roundEnd", "每轮结束时"],
            ["turnStart", "回合开始时"],
            ["turnEnd", "回合结束时"],
            ["phaseBegin", "阶段开始时"],
            ["phaseEnd", "阶段结束时"],
            ["phaseZhunbeiBegin", "准备阶段开始时"],
            ["phaseJudgeBegin", "判定阶段开始时"],
            ["phaseDrawBegin", "摸牌阶段开始时"],
            ["phaseDrawEnd", "摸牌阶段结束时"],
            ["phaseUseBegin", "出牌阶段开始时"],
            ["phaseUseEnd", "出牌阶段结束时"],
            ["phaseDiscardBegin", "弃牌阶段开始时"],
            ["phaseDiscardEnd", "弃牌阶段结束时"],
            ["phaseJieshuBegin", "结束阶段开始时"],
            ["phaseJieshuEnd", "结束阶段结束时"],
            ["phaseChange", "阶段切换时"]
        ]
    },
    {
        name: "牌与手牌",
        events: [
            ["drawBegin", "摸牌前"],
            ["drawEnd", "摸牌后"],
            ["drawAfter", "摸牌结算后"],
            ["discardAfter", "弃牌后"],
            ["gainBegin", "获得牌时"],
            ["gainEnd", "获得牌后"],
            ["gainAfter", "获得牌结算后"],
            ["loseBegin", "失去牌时"],
            ["loseEnd", "失去牌后"],
            ["useCard", "使用牌时"],
            ["useCardAfter", "使用牌结算后"],
            ["useCardToTargeted", "成为牌的目标后"],
            ["respond", "打出牌时"],
            ["judgeBegin", "判定开始前"],
            ["judgeEnd", "判定结束后"],
            ["equipBegin", "装备时"],
            ["equipEnd", "装备后"],
            ["cardsDiscardEnd", "牌进入弃牌堆后"],
            ["linkBegin", "横置/重置前"],
            ["linkEnd", "横置/重置后"]
        ]
    },
    {
        name: "伤害与体力",
        events: [
            ["damageBegin", "造成/受到伤害前"],
            ["damageEnd", "伤害结算后"],
            ["damageSourceEnd", "你造成伤害后（用 source 键）"],
            ["loseHpEnd", "失去体力后"],
            ["recoverEnd", "回复体力后"],
            ["changeHp", "体力值变化时"],
            ["dyingBegin", "濒死时"],
            ["dieBegin", "死亡时"],
            ["dieAfter", "死亡后"]
        ]
    },
    {
        name: "技能与结算",
        events: [
            ["useSkill", "使用技能时"],
            ["useSkillAfter", "使用技能后"],
            ["chooseToUseBegin", "选择使用牌时"],
            ["chooseToRespondBegin", "选择打出牌时"],
            ["showCardsEnd", "展示牌后"],
            ["logSkill", "技能被记录时"]
        ]
    }
];

/** 提示词里允许模型使用的 Player 成员（都来自 shya/host/player.shya 的声明，真实存在） */
export const PLAYER_API = [
    "player hp / maxHp / hujia / phaseNumber（属性，直接空格读）",
    "player draw(数量或对象) / recover(数量) / loseHp(数量) / changeHp(数量)",
    "player damage({ source: player, num: 1, nature: \"fire\", card: card })",
    "player discard(牌或数量) / gain(牌) / lose(牌) / equip(牌)",
    "player judge(名称) / turnOver(布尔) / link(布尔) / skip(\"phaseUse\")",
    "player chooseToDiscard(位置, 数量或true) / chooseToUse(对象) / chooseCard(位置) / chooseTarget(对象)",
    "player getCards(\"h\"/\"e\"/\"j\") / countCards(\"h\") / hasCard(名称, 位置) / getEquip(名) / getJudge(名)",
    "player isAlive() / isDead() / isDamaged() / isHealthy() / isDying() / isTurnedOver() / isLinked()",
    "player hasSkill(技能id) / hasSex(性别) / hasJudge(名称) / hasMark(标记) / hasEmptySlot(\"e\")",
    "player isFriendOf(角色) / isEnemyOf(角色) / distanceTo(角色) / distanceFrom(角色) / inRange(角色)",
    "player getHp() / getDamagedHp() / getHandcardLimit() / getAttackRange() / getCardUsable(牌)",
    "player getHistory(键) / countHistory(键) / countUsed(牌) / getSkills()",
    "player addMark(名称, 数量) / removeMark(名称, 数量) / setMark(名称, 数量) / countMark(名称)",
    "player getStorage(名称) / setStorage(名称, 值) / addSkill(技能id) / addTempSkill(技能id, 事件名) / removeSkill(技能id)",
    "player name / sex / group / skills / storage / marks / next / previous"
];

/** 提示词里允许模型使用的 get 模块成员（调用写法与 shya 一致：get color(card)） */
export const GET_API = [
    "get color(card) / get suit(card) / get number(card) / get name(card) / get type(card) / get subtype(card)",
    "get translation(键) —— 取中文名",
    "get distance(角色, 角色) / get attitude(角色, 角色) / get value(牌) / get position(牌)"
];

/** shya 写法速查（写进系统提示词；每条都实测过） */
export const SHYA_RULES = [
    "一个技能 = 一次宏调用，形如 @skill_trigger { … }，宏名见下面的模板。",
    "所有槽写法都是 `#槽名: 值`，一行一个，缩进两个空格。",
    "属性与方法一律用**空格**连接，不要用点：写 player hp、player draw(1)、get color(card)、event cards。写成 player.hp 会直接语法报错。",
    "语句类槽（#filter / #check / #cost / #content / #filterCard / #filterTarget）**直接写语句**，不要包大括号，多条语句换行写。",
    "局部变量可以写 const 名 = 值；分支可以写 if (条件) { … } else { … }。",
    "不要写箭头函数、不要写 import/export、不要写 console.log、不要用 try/catch。",
    "get / lib / ui / ai / game / _status 是引擎全局量，直接用即可（编译器可能给一条 TC010 警告，属正常）。",
    "不要发明引擎里没有的 API。只能用上面 Player / get 清单里列出的成员；拿不准就不用。",
    "技能 id 必须是合法标识符（字母/数字/下划线，不能数字开头），且必须以上面给的统一前缀开头。",
    "技能名写进 #translation，技能描述写进 #description，两者必须与 JSON 里的 name / description 完全一致。"
].join("\n");

/** 给模型的技能宏模板（取自编辑器内置的 SKILL_KINDS，保证语法一定是能编译的） */
function templateSamples() {
    const wanted = ["trigger", "phaseUse", "chooseToUse", "chooseToRespond", "viewAs", "mod"];
    return wanted
        .map(key => SKILL_KINDS.find(kind => kind.key === key))
        .filter(Boolean)
        .map(kind => `【${kind.name}】${kind.hint}\n${kind.template.trim()}`)
        .join("\n\n");
}

/** 设计稿的 JSON 契约说明（系统提示词的核心） */
const SCHEMA_TEXT = [
    "严格输出**一个 JSON 对象**（不要 markdown 围栏、不要解释文字），结构如下：",
    "{",
    '  "characters": [',
    "    {",
    '      "name": "武将中文姓名",',
    '      "pinyin": "姓名的无声调拼音小写，如 zhonghui",',
    '      "id": "前缀开头的小写标识符，如 ai_zhonghui",',
    '      "sex": "male 或 female",',
    '      "group": "wei / shu / wu / qun / jin / shen 之一",',
    '      "hp": 4,',
    '      "maxHp": 4,',
    '      "title": "两到四字称号，如 独眼的枭雄",',
    '      "intro": "一到两句人物小传",',
    '      "designNote": "40 字以内的设计思路（解释强度与配合）",',
    '      "artPrompt": "给文生图用的画面描述（中文即可，写清外貌/服饰/姿态/背景）",',
    '      "skills": [',
    "        {",
    '          "id": "前缀开头的技能 id，如 ai_zhonghui_jianxiong",',
    '          "name": "技能名（两到四字）",',
    '          "description": "技能描述：写清发动时机、条件、目标、效果与次数限制",',
    '          "shya": "该技能的完整 shya 源码字符串（见下面模板，换行用 \\n）"',
    "        }",
    "      ]",
    "    }",
    "  ]",
    "}",
    "硬性要求：",
    "1. characters 数组长度 = 用户要求的候选数量；每个武将 1~3 个技能，技能总数不超过 4。",
    "2. hp 与技能强度匹配：4 血配 1 个技能，3 血配 2 个技能，多个技能时单体效果要更弱。强度基准：一个技能每回合稳定获得 1~2 张牌的收益属于正常；禁止无限摸牌、无限连击、无条件清空全场手牌这类失控设计。",
    "3. description 里必须出现具体时机词（准备阶段/出牌阶段/当你受到伤害后……）与次数限制（每回合限一次/每阶段限一次/每轮限一次）。",
    "4. shya 必须是**能直接编译**的源码：只用一个技能宏，只引用上面列出的 API，写法遵循速查表。",
    "5. JSON 必须是合法 JSON：字符串内部换行要写成 \\n，不要尾逗号，不要注释。",
    "6. 如果无法一次写完，宁可少写一个技能，也要保证 JSON 合法、shya 能编译。"
].join("\n");

/** 武将设计稿的系统提示词 */
export const CHARACTER_SYSTEM = [
    "你是一位《无名杀》（开源三国杀类游戏）的武将设计师，擅长设计**能直接运行**的技能。",
    "你的输出会被程序解析成 JSON 并注入游戏编辑器，因此格式错误会导致整份设计报废——格式优先于文采。",
    "",
    "═══ 一、输出格式 ═══",
    SCHEMA_TEXT,
    "",
    "═══ 二、shya 写法速查（必须遵守）═══",
    SHYA_RULES,
    "",
    "═══ 三、可用的技能宏模板 ═══",
    templateSamples(),
    "",
    "═══ 四、事件名清单（#trigger 只能用这些）═══",
    TRIGGER_GROUPS.map(group => `【${group.name}】${group.events.map(([id, note]) => `${id}（${note}）`).join("、")}`).join("\n"),
    "触发键：字符串默认是 player（你的回合/你身上发生）；若要在别人身上触发写对象，如 #trigger: { global: \"damageEnd\" } 或 { source: \"damageSourceEnd\" }。",
    "",
    "═══ 五、可用的 Player 成员 ═══",
    PLAYER_API.map(line => `- ${line}`).join("\n"),
    "",
    "═══ 六、可用的 get 成员 ═══",
    GET_API.map(line => `- ${line}`).join("\n"),
    "",
    "═══ 七、常用变量 ═══",
    "- content 的形参固定是 (event, trigger, player)：player 是技能拥有者，trigger 是触发事件，event 是本次技能事件。",
    "- 触发事件里常用：trigger card（牌）、trigger target（目标）、trigger source（伤害来源）、trigger num（数值）。",
    "- 主动技的 content 里：event cards 是本次选择的牌，event card 是第一张。",
    "",
    "═══ 八、示例（照这个写法产出）═══",
    "【JSON 片段】",
    JSON.stringify({
        characters: [{
            name: "钟会",
            pinyin: "zhonghui",
            id: "ai_zhonghui",
            sex: "male",
            group: "wei",
            hp: 4,
            maxHp: 4,
            title: "独眼的枭雄",
            intro: "魏国名将之后，手握重兵而心怀异志。",
            designNote: "卖血换来成长，攒够标记后一次爆发。",
            artPrompt: "年轻男性武将，独眼戴眼罩，深色铠甲与披风，手持长剑，阴鸷神情，站立半身像，暗色营帐背景",
            skills: [{
                id: "ai_zhonghui_quanmou",
                name: "权谋",
                description: "当你受到伤害后，你可以摸一张牌，然后若你的手牌数大于体力值，你回复1点体力。每轮限一次。",
                shya: "import \"./host/skill-type.shya\"\n\n@skill_trigger {\n  #skill: ai_zhonghui_quanmou\n  #translation: \"权谋\"\n  #description: \"当你受到伤害后，你可以摸一张牌，然后若你的手牌数大于体力值，你回复1点体力。每轮限一次。\"\n  #trigger: \"damageEnd\"\n  #usable: 1\n  #filter:\n    return player countCards(\"h\") < 5\n  #content:\n    player draw(1)\n    if (player countCards(\"h\") > player hp) {\n      player recover(1)\n    }\n  #ai: { order: 1, result: { player: 1 } }\n}"
            }]
        }]
    }),
    "（上面这个 JSON 就是完整可用的形状；shya 字段里的 \\n 是 JSON 字符串换行，实际输出时保持单行字符串即可。）"
].join("\n");

/**
 * 组装「生成武将设计稿」的对话消息
 *
 * `input.skillText` 是用户那份《无名杀武将设计规范》（ai/skill.md，可在面板里改/关）。
 * 它是**软性设计知识**，附在机器契约之后；关了就不发，只留契约。
 * @param {{
 *   request:string, count?:number, prefix?:string, group?:string, hpRange?:string,
 *   skillCount?:string, avoid?:string, skillText?:string
 * }} input
 * @returns {Array<{role:string,content:string}>}
 */
export function buildCharacterMessages(input = {}) {
    const count = Math.max(1, Math.min(3, Number(input.count) || 1));
    const prefix = String(input.prefix || "ai_");
    const lines = [
        `需求：${String(input.request || "").trim() || "自由发挥一位有特色的三国武将"}`,
        `候选数量：${count}`,
        `统一前缀：id 与技能 id 都必须以「${prefix}」开头（小写字母、数字、下划线）`
    ];
    if (input.group) lines.push(`势力：必须是 ${input.group}`);
    if (input.hpRange) lines.push(`体力范围：${input.hpRange}`);
    if (input.skillCount) lines.push(`技能数量：${input.skillCount}`);
    if (input.avoid) lines.push(`不要出现这些内容（避免与已有设计重复）：${input.avoid}`);
    lines.push("", "请直接输出 JSON（不要任何解释文字）。");
    const skillText = String(input.skillText || "").trim();
    const system = skillText
        ? [
            CHARACTER_SYSTEM,
            "",
            "═══ 附：设计规范《无名杀武将设计规范》（用户可编辑的技能书，优先级高于上面的一般性建议，",
            "但**不得与前面的 JSON 契约、宏模板、事件表、API 清单冲突**——冲突时以契约为准）═══",
            skillText
        ].join("\n")
        : CHARACTER_SYSTEM;
    return [
        { role: "system", content: system },
        { role: "user", content: lines.join("\n") }
    ];
}

// ─────────────────────────── 设计稿校验 / 修复 ───────────────────────────

function sanitizeIdentifier(text, fallback = "unnamed") {
    const cleaned = String(text || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "");
    const safe = cleaned.replace(/^[0-9]+/, "");
    return safe || fallback;
}

function uniqueIdentifier(id, used) {
    if (!used.has(id)) {
        used.add(id);
        return id;
    }
    let index = 2;
    while (used.has(`${id}_${index}`)) index++;
    const next = `${id}_${index}`;
    used.add(next);
    return next;
}

function withPrefix(id, prefix) {
    const text = String(id || "");
    if (!prefix) return text;
    return text.startsWith(prefix) ? text : `${prefix}${text}`;
}

/**
 * 把模型输出（或历史记录）归一成编辑器能吃的设计稿。
 * 一切「模型可能写错」的地方都在这里兜住：缺字段、脏 id、越界体力、重名、缺源码。
 * @param {any} raw 模型解析出来的对象
 * @param {{prefix?:string, count?:number, fallbackGroup?:string, takenCharacterIds?:string[], takenSkillIds?:string[]}} [opts]
 * @returns {{characters:Array<object>}}
 */
export function normalizeDraft(raw, opts = {}) {
    const prefix = String(opts.prefix || "ai_").toLowerCase().replace(/[^a-z0-9_]/g, "") || "ai_";
    const usedCharacters = new Set((opts.takenCharacterIds || []).map(id => String(id)));
    const usedSkills = new Set((opts.takenSkillIds || []).map(id => String(id)));
    const max = Math.max(1, Math.min(3, Number(opts.count) || 3));
    const list = collectCharacters(raw).slice(0, max);
    const characters = list.map((item, index) => {
        const source = item && typeof item === "object" ? item : {};
        const name = String(source.name || source.character || "").trim() || `无名武将${index + 1}`;
        const sex = source.sex === "female" ? "female" : "male";
        const group = GROUPS.includes(source.group) ? source.group : (GROUPS.includes(opts.fallbackGroup) ? opts.fallbackGroup : "qun");
        let hp = Number(source.hp);
        if (!Number.isFinite(hp)) hp = 4;
        hp = Math.max(1, Math.min(10, Math.round(hp)));
        let maxHp = Number(source.maxHp);
        if (!Number.isFinite(maxHp) || maxHp < hp) maxHp = hp;
        maxHp = Math.max(hp, Math.min(12, Math.round(maxHp)));
        const id = uniqueIdentifier(withPrefix(sanitizeIdentifier(source.id, sanitizeIdentifier(source.pinyin, "character")), prefix), usedCharacters);
        const pinyin = String(source.pinyin || "").replace(/[^a-z]/gi, "").toLowerCase();
        const skills = (Array.isArray(source.skills) ? source.skills : [])
            .slice(0, 4)
            .map((skill, skillIndex) => {
                const info = skill && typeof skill === "object" ? skill : {};
                const skillName = String(info.name || "").trim() || `技能${skillIndex + 1}`;
                const skillId = uniqueIdentifier(
                    withPrefix(sanitizeIdentifier(info.id, `${id}_skill${skillIndex + 1}`), prefix),
                    usedSkills
                );
                const code = typeof info.shya === "string" ? info.shya.trim() : "";
                return {
                    id: skillId,
                    name: skillName,
                    description: String(info.description || "").trim(),
                    shya: code.replace(/^\uFEFF/, ""),
                    hasCode: Boolean(code)
                };
            });
        return {
            name,
            pinyin,
            id,
            sex,
            group,
            hp,
            maxHp,
            title: String(source.title || "").trim(),
            intro: String(source.intro || "").trim(),
            designNote: String(source.designNote || "").trim(),
            artPrompt: String(source.artPrompt || "").trim(),
            skills
        };
    });
    return { characters };
}

/** 从各种可能的形状里取出武将数组 */
function collectCharacters(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw !== "object") return [];
    if (Array.isArray(raw.characters)) return raw.characters;
    if (Array.isArray(raw.characters_list)) return raw.characters_list;
    if (Array.isArray(raw.data)) return raw.data;
    if (raw.character && typeof raw.character === "object") return [raw.character];
    if (raw.name || raw.skills) return [raw];
    return [];
}

/** 设计稿里所有技能的 id（供 UI 检查重名 / 显示） */
export function draftSkillIds(draft) {
    return (draft && Array.isArray(draft.skills) ? draft.skills : []).map(skill => skill.id).filter(Boolean);
}

// ───────────────────────────── 原画提示词 ─────────────────────────────

/** 画风预设（拼在提示词末尾，用户可在界面上换） */
export const ART_STYLES = [
    { key: "guofeng", name: "国风厚涂", suffix: "中国风厚涂插画，工笔与写意结合，水墨质感，暖色主调，细腻的服饰纹理" },
    { key: "anime", name: "日系赛璐璐", suffix: "日系动漫插画，赛璐璐上色，干净利落的线条，明亮通透的配色" },
    { key: "realistic", name: "写实油画", suffix: "写实油画风格，电影感布光，皮肤与织物质感细腻，暗部层次丰富" },
    { key: "ink", name: "水墨淡彩", suffix: "水墨淡彩，大量留白，淡雅色调，笔触写意" },
    { key: "dark", name: "暗黑史诗", suffix: "暗黑史诗风格，强烈明暗对比，冷色调，戏剧性侧逆光，氛围凝重" }
];

/** 画面通用要求（无名杀立绘是竖版半身像） */
export const ART_COMMON = [
    "竖版构图，单人半身像（头部到腰部），正面或四分之三侧脸",
    "武将气质与姿态符合描述，衣甲纹样清晰，五官端正、手指数量正确",
    "背景简洁（深色渐变或环境虚化），主体与背景有明确分离",
    "画面中没有文字、没有水印、没有logo、没有边框、没有多个人物"
].join("；");

export function findArtStyle(key) {
    return ART_STYLES.find(style => style.key === key) || ART_STYLES[0];
}

/**
 * 不通模型也能拼出可用的提示词（「AI 扩写」失败或用户不想等时用它）
 * @param {object} subject {name,title,sex,group,intro,designNote,artPrompt,skills}
 * @param {string} [styleKey]
 * @returns {string}
 */
export function fallbackArtPrompt(subject = {}, styleKey = "guofeng") {
    const style = findArtStyle(styleKey);
    const groupNames = { wei: "魏", shu: "蜀", wu: "吴", qun: "群雄", jin: "晋", shen: "神" };
    const parts = [];
    if (subject.artPrompt) parts.push(subject.artPrompt);
    else {
        const sex = subject.sex === "female" ? "女性" : "男性";
        parts.push(`${groupNames[subject.group] || ""}势力${sex}武将「${subject.name || "无名"}」`);
        if (subject.title) parts.push(`称号「${subject.title}」`);
        if (subject.intro) parts.push(subject.intro);
        if (subject.designNote) parts.push(subject.designNote);
        const skills = (Array.isArray(subject.skills) ? subject.skills : []).map(skill => skill.name).filter(Boolean);
        if (skills.length) parts.push(`技能意象：${skills.join("、")}`);
    }
    parts.push(style.suffix);
    parts.push(ART_COMMON);
    return parts.filter(Boolean).join("，");
}

// ───────────────────────── 需求改写（「优化提示」按钮）─────────────────────────

/**
 * 改写需求用的系统提示词。
 * 用户原来能看到一堆「高级设置」（势力/体力/技能数/前缀…），2026-10 按用户要求下线了——
 * 那些维度改由这一个按钮承担：把随口写的一句话补齐成明确的设计需求，再交给生成那一步。
 */
export const OPTIMIZE_SYSTEM = [
    "你是《无名杀》（开源三国杀类游戏）的需求改写助手。",
    "用户会给你一句随口写的武将需求，你要把它改写成**一段更明确的设计需求**，供另一个模型据此产出武将设计稿。",
    "",
    "硬性要求：",
    "1. 只输出改写后的需求本身（一段话，60~150 字），不要解释、不要引号、不要分点编号、不要 markdown 标题。",
    "2. 把该说清的都补上：势力、性别、体力区间、技能数量、核心玩法机制（用什么换什么）、强度定位（正常/偏强/偏弱）、气质风格。",
    "3. 用户已经明确写了的**不要改动**；用户没写的，按「与已有设计不重复」的原则补一个合理且保守的选择（强度默认正常）。",
    "4. **不要**指定技能名、不要写代码、不要给具体数值公式（那是下一步设计稿的事）。",
    "5. 不要出现「无限摸牌 / 无条件清空手牌 / 无代价持续回血」这类失衡要求。",
    "6. 用中文输出，不要输出 JSON。"
].join("\n");

/**
 * 组装「优化提示」的消息
 * @param {{ request:string, skillText?:string }} input
 * @returns {Array<{role:string,content:string}>}
 */
export function buildOptimizeMessages(input = {}) {
    const request = String(input.request || "").trim();
    const skillText = String(input.skillText || "").trim();
    const system = skillText
        ? `${OPTIMIZE_SYSTEM}\n\n（下面是这个项目当前使用的设计规范，改写时参考它，让需求更容易产出符合规范的设计）\n${skillText}`
        : OPTIMIZE_SYSTEM;
    return [
        { role: "system", content: system },
        { role: "user", content: `把下面这段武将需求改写成一段更明确的设计需求：\n${request}` }
    ];
}

/** 原画扩写的系统提示词 */export const IMAGE_SYSTEM = [
    "你是文生图提示词工程师，为《无名杀》（三国杀类游戏）的武将设计竖版卡牌立绘。",
    "把用户给的武将资料扩写成**一段**提示词（中文，120~200 字），只输出提示词本身，不要解释、不要引号、不要分行编号。",
    "必须包含：人物身份与外貌、服饰铠甲的材质与纹样、姿态与神情、光线与色调、背景。",
    "必须包含这些约束：竖版构图、单人半身像、背景简洁、画面中没有文字与水印、手指数量正确。",
    "不要出现真实历史人物姓名、不要出现现代物品、不要描述血腥或裸露内容。"
].join("\n");

/**
 * 组装「原画扩写」的消息
 * @param {{name?:string,title?:string,sex?:string,group?:string,intro?:string,designNote?:string,artPrompt?:string,skills?:Array<{name:string}>}} subject
 * @param {string} [styleKey]
 * @returns {Array<{role:string,content:string}>}
 */
export function buildImageMessages(subject = {}, styleKey = "guofeng") {
    const style = findArtStyle(styleKey);
    const lines = [
        `武将姓名：${subject.name || "未命名"}`,
        subject.title ? `称号：${subject.title}` : "",
        `性别：${subject.sex === "female" ? "女" : "男"}`,
        `势力：${subject.group || "群雄"}`,
        subject.intro ? `人物小传：${subject.intro}` : "",
        subject.designNote ? `设计思路：${subject.designNote}` : "",
        subject.artPrompt ? `原始设想：${subject.artPrompt}` : "",
        (Array.isArray(subject.skills) && subject.skills.length)
            ? `技能：${subject.skills.map(skill => `${skill.name}（${skill.description || ""}）`).join("；")}`
            : "",
        `画风要求：${style.name}——${style.suffix}`,
        `画面要求：${ART_COMMON}`
    ].filter(Boolean);
    return [
        { role: "system", content: IMAGE_SYSTEM },
        { role: "user", content: `请为下面这位武将扩写一段文生图提示词：\n${lines.join("\n")}` }
    ];
}
