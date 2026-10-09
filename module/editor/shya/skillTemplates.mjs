/**
 * 新版 shya 技能编辑器的「技能类别 → 最简模板」纯数据模块（中英双语）。
 *
 * - 类别名与旧版编辑器「技能种类」一致（module/editor/skill/editor.mjs:922-928 的 skillCategories）；
 * - 宏本体：英文版 `shya/host/skill-type.shya`、中文版 `shya/host/skill-type-cn.shya`
 *   （中文版由 `_x19D6_backup/tools/gen-cn-host.mjs` 从英文版生成，改名表 `shya/slotLang.mjs`）；
 *   模板只写到「能编译、能在局内生效」为止，字段含义看宏库头部的说明；
 * - **默认用中文模板**（插槽是中文名）：设置项 `x19D6_editor.settings.templateLang`；
 * - `SKILL_KINDS` 仍是英文那一份（AI 提示词、标签自检都按英文宏写）；
 * - 纯数据模块：不碰 lib/game/ui，也不在 preprocessing 的 targets 里。
 */
import { macroForKind } from "./slotLang.mjs";

/** 可选的模板语言（设置页下拉用） */
export const TEMPLATE_LANGS = [
    { key: "cn", name: "中文（插槽为中文名）" },
    { key: "en", name: "English（插槽为英文名）" }
];

/** 默认模板语言 */
export const DEFAULT_TEMPLATE_LANG = "cn";

/** 英文版模板（宏名 / 插槽名都是英文） */
export const SKILL_KINDS = [
  {
    key: "trigger",
    name: "触发技",
    hint: "事件发生时先 filter 判定能不能，再 check 决定要不要问玩家，最后 content 生效",
    template: `// 触发技：事件发生时先 filter（能不能发动），再 check（要不要问玩家），最后 content 生效
@skill_trigger {
  #skill: my_trigger
  #translation: "技能名"
  #description: ""
  #trigger: "phaseJieshuBegin"
  #filter:
    return player hp < player maxHp
  #content:
    player recover(1)
}
`,
  },
  {
    key: "phaseUse",
    name: "出牌阶段技",
    hint: "出牌阶段主动使用：选牌 → 选目标 → content",
    template: `
@skill_phaseUse {
  #skill: my_phaseuse
  #translation: "技能名"
  #description: ""
  #usable: 1
  #position: "he"
  #filterCard:
    return get color(card) == "black"
  #selectCard: [1, Infinity]
  #prompt: "选择任意张黑色牌"
  #content:
    player draw(event cards length)
  #ai: { order: 1, result: { player: 1 } }
}
`,
  },
  {
    key: "chooseToUse",
    name: "使用技",
    hint: "出牌阶段之外也能主动使用（enable:\"chooseToUse\"）",
    template: `
@skill_chooseToUse {
  #skill: my_use
  #translation: "技能名"
  #filterCardValue: true
  #selectTarget: 1
  #position: "h"
  #content:
    player draw(1)
  #ai: { order: 1, result: { player: 1 } }
}
`,
  },
  {
    key: "chooseToRespond",
    name: "打出技",
    hint: "被要求「打出」时可用（enable:\"chooseToRespond\"）",
    template: `
@skill_chooseToRespond {
  #skill: my_respond
  #translation: "技能名"
  #filterCard:
    return get name(card) == "sha"
  #content:
    player draw(1)
  #ai: { order: 1, result: { player: 1 } }
}
`,
  },
  {
    key: "useRespond",
    name: "使用/打出技",
    hint: "既能使用也能打出（enable:[\"chooseToUse\",\"chooseToRespond\"]）",
    template: `
@skill_useRespond {
  #skill: my_userespond
  #translation: "技能名"
  #filterCardValue: { name: "shan" }
  #selectTarget: 1
  #filterTarget:
    return target != player
  #content:
    player draw(event cards length)
  #ai: { order: 3, result: { player: 1 } }
}
`,
  },
  {
    key: "viewAs",
    name: "视为技",
    hint: "把牌当作另一张牌使用或打出；省略 #enable 时默认「使用+打出」",
    template: `
@skill_viewAs {
  #skill: my_viewas
  #translation: "技能名"
  #description: "你可以将一张黑色手牌当闪使用或打出。"
  #viewAs: { name: "shan" }
  #filterCard:
    return get color(card) == "black"
  #position: "hs"
  #prompt: "将一张黑色手牌当闪使用或打出"
  #check:
    return 1
  #ai: { order: 3, respondShan: true }
}
`,
  },
  {
    key: "mod",
    name: "mod技",
    hint: "只挂规则钩子（mod: { … }），没有 filter/content；from 是 shya 关键字，形参记得改名",
    template: `
@skill_mod {
  #skill: my_mod
  #translation: "技能名"
  #description: "锁定技，你计算与其他角色的距离 -1。"
  #mod: {
    globalFrom(me, target, distance) {
      return distance - 1
    },
  }
  #locked: true
}
`,
  },
  {
    key: "group",
    name: "组合技",
    hint: "本体只挂标记，真实效果在被引用的子技里",
    template: `
@skill_group {
  #skill: my_group
  #translation: "技能名"
  #group: ["my_group1", "my_group2"]
  #preHidden: ["my_group1", "my_group2"]
  #forced: true
  #locked: true
}
`,
  },
  {
    key: "raw",
    name: "自由技能",
    hint: "宏没覆盖的字段（audio / intro / subSkill / getIndex…）整块自己写",
    template: `
@skill_raw {
  #skill: my_raw
  #object: {
    audio: "ext:我的扩展/audio/skill:2",
    trigger: { player: "phaseEnd" },
    forced: true,
    async content(event, trigger, player) {
      player draw(1)
    },
  }
}
`,
  },
];

/**
 * 中文版模板：宏名与插槽名都是中文（`#技能` / `#时机` / `#效果`…）。
 * ⚠️ `#ai` 这一槽保持英文——它被内部辅助宏用在 `@ts{ #槽 }` 里，而那处扫描是 ASCII-only
 * （见 `slotLang.mjs` 顶部的说明），所以中文库里它也叫 `#ai`。
 */
export const SKILL_KINDS_CN = [
  {
    key: "trigger",
    name: "触发技",
    hint: "事件发生时先「条件」判定能不能，再「询问」决定要不要问玩家，最后「效果」生效",
    template: `// 触发技：事件发生时先「条件」（能不能发动），再「询问」（要不要问玩家），最后「效果」生效
@触发技 {
  #技能: my_trigger
  #名称: "技能名"
  #描述: ""
  #时机: "phaseJieshuBegin"
  #条件:
    return player hp < player maxHp
  #效果:
    player recover(1)
}
`,
  },
  {
    key: "phaseUse",
    name: "出牌阶段技",
    hint: "出牌阶段主动使用：选牌 → 选目标 → 效果",
    template: `
@出牌阶段技 {
  #技能: my_phaseuse
  #名称: "技能名"
  #描述: ""
  #次数: 1
  #位置: "he"
  #牌条件:
    return get color(card) == "black"
  #选牌: [1, Infinity]
  #提示: "选择任意张黑色牌"
  #效果:
    player draw(event cards length)
  #ai: { order: 1, result: { player: 1 } }
}
`,
  },
  {
    key: "chooseToUse",
    name: "使用技",
    hint: "出牌阶段之外也能主动使用（enable:\"chooseToUse\"）",
    template: `
@使用技 {
  #技能: my_use
  #名称: "技能名"
  #牌值条件: true
  #选目标: 1
  #位置: "h"
  #效果:
    player draw(1)
  #ai: { order: 1, result: { player: 1 } }
}
`,
  },
  {
    key: "chooseToRespond",
    name: "打出技",
    hint: "被要求「打出」时可用（enable:\"chooseToRespond\"）",
    template: `
@打出技 {
  #技能: my_respond
  #名称: "技能名"
  #牌条件:
    return get name(card) == "sha"
  #效果:
    player draw(1)
  #ai: { order: 1, result: { player: 1 } }
}
`,
  },
  {
    key: "useRespond",
    name: "使用/打出技",
    hint: "既能使用也能打出（enable:[\"chooseToUse\",\"chooseToRespond\"]）",
    template: `
@使用打出技 {
  #技能: my_userespond
  #名称: "技能名"
  #牌值条件: { name: "shan" }
  #选目标: 1
  #目标条件:
    return target != player
  #效果:
    player draw(event cards length)
  #ai: { order: 3, result: { player: 1 } }
}
`,
  },
  {
    key: "viewAs",
    name: "视为技",
    hint: "把牌当作另一张牌使用或打出；中文库的「启用」槽是 #启用（英文库叫 #enable）",
    template: `
@视为技 {
  #技能: my_viewas
  #名称: "技能名"
  #描述: "你可以将一张黑色手牌当闪使用或打出。"
  #视为: { name: "shan" }
  #牌条件:
    return get color(card) == "black"
  #位置: "hs"
  #提示: "将一张黑色手牌当闪使用或打出"
  #询问:
    return 1
  #ai: { order: 3, respondShan: true }
}
`,
  },
  {
    key: "mod",
    name: "规则技",
    hint: "只挂规则钩子（规则: { … }），没有条件/效果；from 是 shya 关键字，形参记得改名",
    template: `
@规则技 {
  #技能: my_mod
  #名称: "技能名"
  #描述: "锁定技，你计算与其他角色的距离 -1。"
  #规则: {
    globalFrom(me, target, distance) {
      return distance - 1
    },
  }
  #锁定技: true
}
`,
  },
  {
    key: "group",
    name: "组合技",
    hint: "本体只挂标记，真实效果在被引用的子技里",
    template: `
@组合技 {
  #技能: my_group
  #名称: "技能名"
  #技能组: ["my_group1", "my_group2"]
  #技能预亮: ["my_group1", "my_group2"]
  #强制发动: true
  #锁定技: true
}
`,
  },
  {
    key: "raw",
    name: "自由技能",
    hint: "宏没覆盖的字段（audio / intro / subSkill / getIndex…）整块自己写",
    template: `
@自由技能 {
  #技能: my_raw
  #对象: {
    audio: "ext:我的扩展/audio/skill:2",
    trigger: { player: "phaseEnd" },
    forced: true,
    async content(event, trigger, player) {
      player draw(1)
    },
  }
}
`,
  },
];

/** 每种语言的宏库 import（编辑器编译前自动注入；键与 TEMPLATE_LANGS 一致） */
export const HOST_IMPORTS_BY_LANG = {
    cn: ['import "./host/skill-type-cn.shya"', 'import "./host/skill-content-cn.shya"'],
    en: ['import "./host/skill-type.shya"', 'import "./host/skill-content.shya"']
};

/**
 * 某语言的宏库 import 及其「源码里已经写过」的判定正则。
 * 用户自己写了哪个 import 就不重复注入（诊断行号按实际注入行数回退）。
 * @param {string} [lang]
 * @returns {Array<[string, RegExp]>}
 */
export function hostImportEntries(lang = DEFAULT_TEMPLATE_LANG) {
    const list = HOST_IMPORTS_BY_LANG[lang] || HOST_IMPORTS_BY_LANG[DEFAULT_TEMPLATE_LANG];
    return list.map(text => {
        const raw = text.replace(/^import\s+["']/, "").replace(/["']$/, "");
        return [text, new RegExp(`^\\s*import\\s+["'][^"']*${raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`, "m")];
    });
}

/**
 * 某语言的模板表
 * @param {string} [lang]
 * @returns {typeof SKILL_KINDS}
 */
export function templateKinds(lang = DEFAULT_TEMPLATE_LANG) {
    return lang === "en" ? SKILL_KINDS : SKILL_KINDS_CN;
}

/**
 * 按 key 取一个技能类别（默认语言 = cn）
 * @param {string} key
 * @param {string} [lang]
 * @returns {{ key: string, name: string, hint: string, template: string } | null}
 */
export function getSkillKind(key, lang = DEFAULT_TEMPLATE_LANG) {
    return templateKinds(lang).find(kind => kind.key === key) || null;
}

/**
 * 模板里写的宏名（用于自检与种类推断）
 * @param {string} kind
 * @param {string} lang
 * @returns {string}
 */
export function templateMacro(kind, lang = DEFAULT_TEMPLATE_LANG) {
    return macroForKind(kind, lang);
}
