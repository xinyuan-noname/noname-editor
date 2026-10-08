/**
 * 新版 shya 技能编辑器的「技能类别 → 最简模板」纯数据模块。
 *
 * - 类别名与旧版编辑器「技能种类」一致（module/editor/skill/editor.mjs:922-928 的 skillCategories）；
 * - 宏本体在 `shya/host/skill-type.shya`（编辑器编译前会自动注入它的 import），
 *   模板只写到「能编译、能在局内生效」为止，字段含义看宏库头部的说明；
 * - 纯数据模块：不碰 lib/game/ui，也不在 preprocessing 的 targets 里。
 */
export const SKILL_KINDS = [
    {
        key: "trigger",
        name: "触发技",
        hint: "事件发生时先 filter 判定能不能，再 check 决定要不要问玩家，最后 content 生效",
        template: `// 触发技：事件发生时先 filter（能不能发动），再 check（要不要问玩家），最后 content 生效
@skill_trigger {
  #skill: my_trigger
  #translation: "技能名"
  #description: "触发时机：……；效果：……。"
  // 标签（可选，一行一个，不按技能种类限制）：#forced: true / #frequent: true / #locked: true / #limited: true / #usable: 1 / #round: 1
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
        template: `// 出牌阶段技：出牌阶段限一次，选牌（filterCard）后结算 content
@skill_phaseUse {
  #skill: my_phaseuse
  #translation: "技能名"
  #description: "出牌阶段限一次，你可以……。"
  #usable: 1
  #position: "he"
  #filterCard:
    return get color(card) == "black"
  #selectCard: [1, 9999]
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
        template: `// 使用技：出牌阶段之外也能主动使用
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
        template: `// 打出技：被要求「打出」时可用
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
        template: `// 使用/打出技：既能使用也能打出
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
        template: `// 视为技：把一张牌当作另一张牌使用或打出（省略 #enable 默认「使用+打出」）
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
        name: "修改技",
        hint: "只改规则钩子，没有 filter/content（from 是 shya 关键字，形参记得改名）",
        template: `// 修改技：只挂规则钩子（from 是 shya 关键字，形参改名，位置语义不变）
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
        template: `// 组合技：本体只挂标记，效果写在被引用的子技里
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
        template: `// 自由技能：宏没覆盖的字段（audio / intro / subSkill / getIndex…）整块自己写
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
 * 按 key 取一个技能类别
 * @param {string} key
 * @returns {{ key: string, name: string, hint: string, template: string } | null}
 */
export function getSkillKind(key) {
    return SKILL_KINDS.find(kind => kind.key === key) || null;
}
