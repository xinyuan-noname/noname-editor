import {
    lib,
    game,
    ui,
    get,
    _status
} from "../../../../../../noname.js"
import {
    adjustTab,
} from "../tool/string.js";
import {
    textareaTool
} from '../tool/ui.js'
import {
    editorInbuiltSkillMap
} from '../editor/skill.js'
export const playerList = {
    '你': 'player',
    '目标': 'target',
    '玩家': 'game.me',
    '主公': 'game.zhu',
    '当前回合角色': '_status.currentPhase',
    '触发事件的角色': 'trigger.player',
    '触发事件的来源': 'trigger.source',
    '触发事件的目标': 'trigger.target',
    '伤害来源': 'trigger.source',
    '受伤角色': 'trigger.player',
    '受到伤害的角色': 'trigger.player',
    '使用此牌的角色': "trigger.player",
    '此牌的目标': "trigger.target",
    '事件的目标': "event.target"
}
const phaseList = {
    "回合": "phase",
    "准备阶段": "phaseZhunbei",
    "出牌阶段": "phaseUse",
    "结束阶段": "phaseJieShu",
    "判定阶段": "phaseJudge",
    "弃牌阶段": "phaseDiscard",
    "摸牌阶段": "phaseDraw",
}
const eventList = {
    ...phaseList,
    //
    '摸牌': 'draw',
    "判定": "judge",
    "响应牌": "respond",
    "打出牌": "respond",
    "使用牌": "useCard",
    '弃置牌': 'discard',
    '获得牌': 'gain',
    '失去牌': 'lose',
    '牌置入装备区': 'equip',
    '牌置入判定区': 'addJudge',
    '置于武将牌上': 'addToExpansion',
    '置于武将牌旁': 'addToExpansion',
    '将牌置于武将牌上': 'addToExpansion',
    '将牌置于武将牌旁': 'addToExpansion',
    //
    /*恢复体力(值)*/
    "回复体力": "recover",
    "回复体力值": "recover",
    '受伤': 'damage',
    "受到伤害": "damage",
    '失去体力': 'loseHp',
    '失去体力值': "loseHp",
    '失去体力上限': 'loseMaxHp',
    '减少体力上限': 'loseMaxHp',
    '增加体力上限': 'gainMaxHp',
    '获得体力上限': 'gainMaxHp',
    //
    '横置或重置': 'link',
    '翻面': 'turnOver',
    '武将牌翻面': 'turnOver',
    '死亡': 'die'
}
const cardNameList = (() => {
    return [].concat(...lib.config.cards.map(name => lib.cardPack[name]))
})();
const cardTypeList = (() => {
    return ['basic', 'equip', 'delay', ...Object.keys(lib.cardType)]
})();
function getMapOfOneOfPlayers() {
    const map = {}
    for (let i = 0; i < 10; i++) {
        map[`第${get.cnNumber(i + 1)}个所选角色`] = `result.targets[${i}]`;
        map[`目标组-${i}`] = `targets[${i}]`;
    }
    return map
}
function getMapOfCard(bool = true) {
    const idList = cardNameList
    const map = {};
    for (let k of idList) {
        map[lib.translate[k]] = `${bool ? '"' : ""}${k}${bool ? '"' : ""}`;
    }
    return map;
}
function getMapOfSuit(bool = true) {
    const idList = lib.suit
    const map = {};
    for (let k of idList) {
        map[lib.translate[k + "2"]] = `${bool ? '"' : ""}${k}${bool ? '"' : ""}`;
    }
    return map;
}
function getMapOfColor(bool = true) {
    const idList = Object.keys(lib.color)
    const map = {};
    for (let k of idList) {
        map[lib.translate[k]] = `${bool ? '"' : ""}${k}${bool ? '"' : ""}`;
    }
    return map;
}
function getMapOfType(bool = true) {
    const idList = cardTypeList;
    const map = {};
    for (let k of idList) {
        map[lib.translate[k] + '牌'] = `${bool ? '"' : ""}${k}${bool ? '"' : ""}`;
    }
    if (bool) map['普通锦囊牌'] = '"trick"'
    else map['普通锦囊牌'] = 'trick'
    return map;
}
function getMapOfGroup(bool = true) {
    const idList = lib.group;
    const map = {};
    for (let k of idList) {
        map[lib.translate[k] + ""] = `${bool ? '"' : ""}${k}${bool ? '"' : ""}`;
        map[lib.translate[k] + "势力"] = `${bool ? '"' : ""}${k}${bool ? '"' : ""}`;
    }
    return map;
}

function getMapOfgetParent() {
    const list = {}
    for (let [i, k] of Object.entries(eventList)) {
        list['获取名为' + i + '的父事件'] = 'getParent:"' + k + '"'
        list['获取名为' + i + '的父事件的名字'] = 'getParent:"' + k + '"://!?name'
    }
    return list
}

function getMapOfTri_Target() {
    const map = {}
    for (let [cn, attr] of Object.entries({
        ...getMapOfCard(false),
    })) {
        map["成为" + cn + '目标时'] = 'target:' + attr + ':useCardToTarget';
        map["成为" + cn + '目标后'] = 'target:' + attr + ':useCardToTargeted';
        map["使用" + cn + '指定目标时'] = 'player:' + attr + ':useCardToPlayer';
        map["使用" + cn + '指定目标后'] = 'player:' + attr + ':useCardToPlayered';
        //
        map["对你使用" + cn + "时"] = 'triTarget=player:' + attr + ':useCardToTarget'
        map["对你使用" + cn + "后"] = 'triTarget=player:' + attr + ':useCardToTargeted'
        map["使用" + cn + '指定你为目标时'] = 'triTarget=player:' + attr + ':useCardToPlayer';
        map["使用" + cn + '指定你为目标后'] = 'triTarget=player:' + attr + ':useCardToPlayered';
        map["成为其他角色" + cn + '目标时'] = 'target:triPlayer=other:' + attr + ':useCardToTarget';
        map["成为其他角色" + cn + '目标后'] = 'target:triPlayer=other:' + attr + ':useCardToTargeted';
        //
        map["对其他角色使用" + cn + "时"] = 'triTarget=other:' + attr + ':useCardToPlayer'
        map["对其他角色使用" + cn + "后"] = 'triTarget=other:' + attr + ':useCardToPlayered'
        map["对男性角色使用" + cn + "时"] = 'triTargetSex=male:' + attr + ':useCardToPlayer'
        map["对男性角色使用" + cn + "后"] = 'triTargetSex=male:' + attr + ':useCardToPlayered'
        map["对女性角色使用" + cn + "时"] = 'triTargetSex=female:' + attr + ':useCardToPlayer'
        map["对女性角色使用" + cn + "后"] = 'triTargetSex=female:' + attr + ':useCardToPlayered'
        //

    }
    return map;
}
function getMapOfTri_Use() {
    const map = {}
    for (let [cn, attr] of Object.entries({
        ...getMapOfCard(false)
    })) {
        map["使用" + cn + '前'] = attr + ':' + 'useCardBefore';
        map["使用" + cn + '开始'] = attr + ':' + 'useCardBegin';
        map["使用" + cn + '时0'] = attr + ':' + 'useCard0';
        map["使用" + cn + '时1'] = attr + ':' + 'useCard1';
        map["使用" + cn + '时2'] = attr + ':' + 'useCard2';
        map["使用" + cn + '时'] = attr + ':' + 'useCard';
        map["使用" + cn + '结束'] = attr + ':' + 'useCardEnd';
        map["使用" + cn + '结算后'] = attr + ':' + 'useCardAfter';
        map["使用" + cn + '后'] = attr + ':' + 'useCardAfter';
    }
    return map;
}
function getMapOfTri_damageSource() {
    const map = {}
    for (let [cn, attr] of Object.entries({
        ...getMapOfCard(false)
    })) {
        //
        map["受到由" + cn + '造成伤害前'] = "yescard:" + attr + ':' + 'damageBefore';
        map["受到由" + cn + '造成伤害时'] = "yescard:" + attr + ':' + 'damageBegin';
        map["受到由" + cn + '造成伤害时1'] = "yescard:" + attr + ':' + 'damageBegin1';
        map["受到由" + cn + '造成伤害时2'] = "yescard:" + attr + ':' + 'damageBegin2';
        map["受到由" + cn + '造成伤害时3'] = "yescard:" + attr + ':' + 'damageBegin3';
        map["受到由" + cn + '造成伤害时4'] = "yescard:" + attr + ':' + 'damageBegin4';
        map["受到由" + cn + '造成伤害后'] = "yescard:" + attr + ':' + 'damageAfter';
        //
        map["使用" + cn + '造成伤害前'] = "source:yescard:" + attr + ':' + 'damageBefore';
        map["使用" + cn + '造成伤害时'] = "source:yescard:" + attr + ':' + 'damageBegin';
        map["使用" + cn + '造成伤害时1'] = "source:yescard:" + attr + ':' + 'damageBegin1';
        map["使用" + cn + '造成伤害时2'] = "source:yescard:" + attr + ':' + 'damageBegin2';
        map["使用" + cn + '造成伤害时3'] = "source:yescard:" + attr + ':' + 'damageBegin3';
        map["使用" + cn + '造成伤害时4'] = "source:yescard:" + attr + ':' + 'damageBegin4';
        map["使用" + cn + '造成伤害后'] = "source:yescard:" + attr + ':' + 'damageAfter';
        //
        map[cn + '造成伤害前'] = "source:yescard:" + attr + ':' + 'damageBefore';
        map[cn + '造成伤害时'] = "source:yescard:" + attr + ':' + 'damageBegin';
        map[cn + '造成伤害时1'] = "source:yescard:" + attr + ':' + 'damageBegin1';
        map[cn + '造成伤害时2'] = "source:yescard:" + attr + ':' + 'damageBegin2';
        map[cn + '造成伤害时3'] = "source:yescard:" + attr + ':' + 'damageBegin3';
        map[cn + '造成伤害时4'] = "source:yescard:" + attr + ':' + 'damageBegin4';
        map[cn + '造成伤害后'] = "source:yescard:" + attr + ':' + 'damageAfter';
    }
    return map;
}
function getMapOfWhen() {
    const map = {}
    for (let [cn, en] of Object.entries(eventList)) {
        map["于下次" + cn + "前"] = `when;{player:"${en}Before"}`
        map["于下次" + cn + "时"] = `when;{player:"${en}Begin"}`
        map["于下次" + cn + "后"] = `when;{player:"${en}End"}`
        map["于下次" + cn + "结算后"] = `when;{player:"${en}After"}`
    }
    return map;
}

function getMapOfHasCard() {
    const idList = cardNameList
    const map = {};
    for (let k of idList) {
        //这里不加intoFunction标志,表明不能向其中添加参数
        map["有" + lib.translate[k]] = `hasCard:"${k}":"hes"`;
        map["判定区内有" + lib.translate[k]] = `hasCard:"${k}":"j"`;
        map["手牌区内有" + lib.translate[k]] = `hasCard:"${k}"`;
        map["装备区内有" + lib.translate[k]] = `hasCard:"${k}":"e"`;
    }
    return map;
}
function getMapOfHasType() {
    const idList = cardTypeList
    const map = {
        "有普通锦囊牌": `hasCard;{type:"trick"};"hes"`,
        "判定区内有普通锦囊牌": `hasCard;{type:"trick"};"j"`,
        "手牌区内有普通锦囊牌": `hasCard;{type:"trick"}`,
        "装备区内有普通锦囊牌": `hasCard;{type:"trick"};"e"`
    };
    for (let k of idList) {
        //这里不加intoFunction标志,表明不能向其中添加参数
        map["有" + lib.translate[k] + "牌"] = `hasCard;"hes";{type:"${k}"}`;
        map["判定区内有" + lib.translate[k] + "牌"] = `hasCard;{type:"${k}"};"j"`;
        map["手牌区内有" + lib.translate[k] + "牌"] = `hasCard;{type:"${k}"}`;
        map["装备区内有" + lib.translate[k] + "牌"] = `hasCard;{type:"${k}"};"e"`;
    }
    return map;
}
function getMapOfCanAddJudge() {
    const idList = cardNameList.filter(card => get.type(card) === 'delay')
    const map = {};
    for (let k of idList) {
        map["可以被贴上" + lib.translate[k]] = `canAddJudge;"${k}"`;
    }
    return map;
}
function getMapOfChangeGroup() {
    const map = {};
    for (let [cn, attr] of Object.entries(getMapOfGroup())) {
        map["将势力改为" + cn] = `changeGroup;${attr}`;
    }
    return map;
}
function getMapOfStep() {
    const map = {}
    for (let i = 0; i < 100; i++) {
        map["步骤" + i] = '"step ' + i + '"'
        map["步骤" + get.cnNumber(i)] = '"step ' + i + '"'
        map["第" + i + "步"] = '"step ' + i + '"'
        map["第" + get.cnNumber(i) + "步"] = '"step ' + i + '"'
        map["跳至第" + i + "步"] = `event.goto(${i})`
        map["跳至第" + get.cnNumber(i) + "步"] = `event.goto(${i})`
    }
    return map
}
function getMapOfRandomNum() {
    const map = {}
    const list = new Array(11).fill().map((_, k) => k);
    for (let i = 0; i < 11; i++) {
        for (let a = 10; a > i; a--) {
            map[`${i}到${a}`] = `new Array(${list.slice(i, a + 1)}).randomGet()`
        }
    }
    return map;
}
function getMapOfUSeVcard() {
    const map = {}
    for (const [cn, en] of Object.entries(getMapOfCard())) {
        map[`视为使用${cn}`] = `useCard;{name:${en},isCard:true};intoFunction`
        map[`选择对角色使用${cn}`] = `chooseUseTarget;{name:${en},isCard:true};intoFunction`
    }
    return map
}
function getMapOfActionHistory() {
    const list = [
        ["使用牌", "useCard"],
        ["打出牌", "respond"],
        ["跳过阶段", "skipped"],
        ["获得牌", "gain"],
        ["失去牌", "lose"],
        ["造成伤害", "sourceDamage"],
        ["受到伤害", "damage"],
        ["使用技能", "useSkill"]
    ]
    const map = {
        "本回合的出牌阶段使用牌次数": `getHistory;"useCard";evt=>evt.isPhaseUsing()`,
        "本回合的出牌阶段打出牌次数": `getHistory;"respond";evt=>evt.isPhaseUsing()`,
        '本回合造成伤害点数': `getHistory;"sourceDamage";//!?reduce((acc,cur)=>acc+cur.num,0)`,
        '本回合造成的伤害点数': `getHistory;"sourceDamage";//!?reduce((acc,cur)=>acc+cur.num,0)`,
        '本回合造成伤害的点数': `getHistory;"sourceDamage";//!?reduce((acc,cur)=>acc+cur.num,0)`
    }
    for (const [cn, en] of list) {
        map[`本回合${cn}次数`] = `getHistory;"${en}";//!?length`;
        map[`获取本回合${cn}事件`] = `getHistory;"${en}"`;
        map[`本局游戏${cn}次数`] = `getAllHistory;"${en}";//!?length`
        map[`获取本局游戏${cn}事件`] = `getAllHistory;"${en}"`
    }
    return map;
}
function getMapAboutCard() {
    const map = {}
    const CardMission = {
        /**
         * @description According  to the attribute , set translation for getting card from the cardPile
         * @param {String} attributeValue such as 'sha'(name),"red"(color)
         * @param {String} attributeKey such as "name","color"
         * @param {String} cn attributeValue in Chinese
         */
        cardPile: (attributeValue, attributeKey, cn) => {
            map["牌堆中" + cn] = `cardPile2: card => get.${attributeKey}(card, false) === "${attributeValue}":intoFunction`
        },
        /**
         * @description According  to the attribute , set translation for getting card from the discardPile 
         * @param {String} attributeValue such as 'sha'(name),"red"(color)
         * @param {String} attributeKey such as "name","color"
         * @param {String} cn attributeValue in Chinese
         */
        discardPile: (attributeValue, attributeKey, cn) => {
            map["弃牌堆中" + cn] = `discardPile: card => get.${attributeKey}(card, false) === "${attributeValue}":intoFunction`
        },
        /**
         * @description According  to the attribute , set translation for a player's using card times in a phase up to that time
         * @param {String} attribute id
         * @param {String} cn attribute in Chinese
         */
        usedTimes: (attribute, cn) => {
            map[cn + '的出牌阶段使用次数'] = "getStat://!?card://!?" + attribute
        },
        hasCard: (attributeValue, attributeKey, cn) => {
            map['有' + cn] = `hasCard:{${attributeKey}:"${attributeValue}"}:"he"`
        }
    }
    cardNameList.forEach(i => {
        const cardTranslate = lib.translate[i];
        const cardId = i;
        CardMission.cardPile(cardId, 'name', cardTranslate);
        CardMission.discardPile(cardId, 'name', cardTranslate);
        CardMission.usedTimes(cardId, cardTranslate);
    })
    lib.suits.forEach(i => {
        const suit = i, suitTranslate = lib.translate[i + '2'] + "牌"
        CardMission.cardPile(suit, 'suit', suitTranslate)
        CardMission.discardPile(suit, 'suit', suitTranslate)
        CardMission.hasCard(suit, 'suit', suitTranslate)
    })
    Object.keys(lib.color).forEach(i => {
        const color = i, colorTranslate = lib.translate[i] + "牌"
        const args = [color, 'color', colorTranslate]
        CardMission.cardPile(...args)
        CardMission.discardPile(...args)
        CardMission.hasCard(...args)
    })
    for (let i = 1; i < 14; i++) {
        map["牌堆中牌点数为" + get.strNumber(i)] = `cardPile2: card => get.number(card, false) === "${i}":intoFunction`
        map["弃牌堆中牌点数为" + get.strNumber(i)] = `discardPile: card => get.number(card, false) === "${i}":intoFunction`
    }
    return map
};
function getMapOfOneOfTriCards() {
    const map = {}
    for (let i = 0; i < 10; i++) {
        map['触发事件的牌组-' + i] = `trigger.cards[${i}]`
    }
    return map
}
function getMapOfOneOfSelectedCards() {
    const map = {}
    for (let i = 0; i < 10; i++) {
        const part = '第' + get.cnNumber(i + 1) + "张牌";
        map['目前选择的' + part] =
            map['当前选择的' + part] =
            map['当前选择的卡牌-' + i] =
            map['目前选择的牌组-' + i] =
            `ui.selected.cards[${i}]`
    }
    return map
}
// console.log(getMapOfType(false));
export class NonameCN {
    static playerCN = [
        "你", "玩家",
        "当前回合角色",
        // ...new Array(10).fill('所选角色').map((item, index) => '第' + get.cnNumber(index) + '个' + item),
        '第零个所选角色', '第一个所选角色', '第两个所选角色', '第三个所选角色', '第四个所选角色', '第五个所选角色', '第六个所选角色', '第七个所选角色', '第八个所选角色', '第九个所选角色',
        "所选角色",
        "所有角色",
        "伤害来源", "受伤角色",
        "触发事件的角色", "触发事件的来源",
        "触发事件的目标组",
        "触发事件的目标",
        "事件的目标组",
        "事件的目标",
        // ...new Array(10).fill('目标组-').map((item, index) => item + index),
        '目标组-0', '目标组-1', '目标组-2', '目标组-3', '目标组-4', '目标组-5', '目标组-6', '目标组-7', '目标组-8', '目标组-9',
        "目标组",
        "目标"
    ]
    static backSkillMap = {
        mode: 'self',
        id: 'xxx',
        kind: '',
        type: [],
        filter: [],
        /*
        jianxiong-gain:用来确保获得的为实体牌而且处于处理区 
        viewAs:用来确保技能类别为视为类技能  
        moreViewAs:表示视为类技能不止一个
        */
        boolList: [],
        /*
        group-*:用来设置势力技
        mainVice-remove1:用来设置移去阴阳鱼
        */
        uniqueList: [],

        variableArea_filter: [],
        variable_filter: new Map(),
        variable_content: new Map(),
        filterTarget: [],
        selectTarget: '',
        filterCard: [],
        selectCard: '',
        content: [],
        contentAsync: false,
        getIndex: {
            player: [],
            source: [],
            global: [],
            target: []
        },
        trigger: {
            player: [],
            source: [],
            global: [],
            target: []
        },
        triggerFilter: {
            player: {},
            source: {},
            target: {},
            global: {}
        },
        triLoseEvts: [],
        respond: [],
        viewAsCondition: [],
        viewAsFrequency: [],
        viewAs: [],
        subSkill: {},
        group: [],
        uniqueTrigger: [],
        tri_filterCard: [],
        primarySkillCache: {
            skill: {},
            ele: {}
        },
        position: [],
        custom: {},
        content_ignoreIndex: [],
        filter_ignoreIndex: [],
        marktext: "",
        markName: "",
        markContent: "",
    }
    static viewAsFrequencyList = [
        "frequency-phase-cardName",
        "frequency-round-cardName",
        "frequency-game-cardName"
    ]
    static viewAsFrequencyMap = {
        'frequency-phase-cardName': '{global:"phaseAfter"}',
        'frequency-round-cardName': '{global:"roundStart"}'
    }
    static editorInbuiltSkillMap = editorInbuiltSkillMap;
    static basicList = {
        '未定义': "undefined",
        "数学": "Math",
        //虚拟牌
        '虚拟牌': 'vCard',
        '虚拟牌0': 'vCard0',
        '虚拟牌1': 'vCard1',
        '虚拟牌2': 'vCard2',
        '虚拟牌3': 'vCard3',
        '虚拟牌4': 'vCard4',
        '虚拟牌5': 'vCard5',
        '虚拟牌6': 'vCard6',
        '虚拟牌7': 'vCard7',
        '虚拟牌8': 'vCard8',
        '虚拟牌9': 'vCard9',
        //get
        '名字': "name",
        '牌名': 'name',
        '卡牌': 'card',
        '牌组张数': "cards.length",
        '牌组长度': "cards.length",
        '牌组': "cards",
        '卡牌组': "cards",
        '花色': 'suit',
        '颜色': 'color',
        '属性': "nature",
        '类别': 'type',
        '牌字数': "cardNameLength",
        "字数": "cardNameLength",
        '广义类别': 'type2',
        '副类别': 'subtype',
        '拼音': 'pinyin',
        '韵母': 'yunmu',
        '韵脚': 'yunjiao',
        //
        '势力': "group",
        //
        '来源': 'source',
        //
        '新步骤': "'step'",
        //伤害事件
        '受到伤害点数': 'trigger.num',
        '受伤点数': 'trigger.num',
        '伤害点数': 'trigger.num',
        '伤害值': 'trigger.num',
        '造成伤害的牌': 'trigger.cards',
        '造成伤害的属性': 'trigger.nature',
        '伤害属性': 'trigger.nature',
        //
        '触发事件的点数': "trigger.num",
        '触发事件点数': "trigger.num",
        '当前回合序号': `trigger.getParent("phase",void 0,true).num`,
        //
        '获取': 'get',
        //
        '游戏': 'game',
        '轮数': 'roundNumber',
        '游戏轮数': "game.roundNumber",
        //颜色和花色
        '红色': '"red"',
        '黑色': '"black"',
        '无色': '"none"',
        '梅花': '"club"',
        '方片': '"diamond"',
        '无花色': '"none"',
        '黑桃': '"spade"',
        '红桃': '"heart"',
        //装备栏
        '武器栏': '"equip1"',
        '防具栏': '"equip2"',
        '+1马栏': '"equip3"',
        '防御马栏': '"equip3"',
        '-1马栏': '"equip4"',
        '进攻马栏': '"equip3"',
        '坐骑栏': '"equip6"',
        '宝物栏': '"equip5"',
        //数字
        'A点': '1',
        'J点': '11',
        'Q点': '12',
        'K点': '13',
        '一': '1',
        '二': '2',
        '三': '3',
        '四': '4',
        '五': '5',
        '六': '6',
        '七': '7',
        '八': '8',
        '九': '9',
        '十': '10',
        //
        '有概率': 'Math.random()<=',
        //废除事件
        '废除一个武器栏': 'disableEquip:"equip1":intoFunction',
        '废除一个防具栏': 'disableEquip:"equip2":intoFunction',
        '废除一个+1马栏': 'disableEquip:"equip3":intoFunction',
        '废除一个-1马栏': 'disableEquip:"equip4":intoFunction',
        '废除一个防御马栏': 'disableEquip:"equip3":intoFunction',
        '废除一个进攻马栏': 'disableEquip:"equip4":intoFunction',
        '废除一个宝物栏': 'disableEquip:"equip5":intoFunction',
        '废除武器栏': 'disableEquip:"equip1":intoFunction',
        '废除防具栏': 'disableEquip:"equip2":intoFunction',
        '废除+1马栏': 'disableEquip:"equip3":intoFunction',
        '废除-1马栏': 'disableEquip:"equip4":intoFunction',
        '废除防御马栏': 'disableEquip:"equip3":intoFunction',
        '废除进攻马栏': 'disableEquip:"equip4":intoFunction',
        '废除宝物栏': 'disableEquip:"equip5":intoFunction',
        '任意张': '[1,Infinity]',
        '任意名': '[1,Infinity]',
        //固定值
        '其他': 'other',
        '至多': 'atMost',
        '至少': 'atLeast',
        '必须选': 'true',
        //关键字、运算符中文  
        '变量': 'var ',
        '常量': 'const ',
        '块级变量': 'let ',
        '块变': 'let ',
        //
        "等待": "await ",
        //
        '分岔': "switch ",
        '打断': "break;",
        '情况': "case ",
        '默认': "default ",
        //函数
        '异步': "async ",
        '函数': 'function',
        '参数表头': "(",
        '参数表尾': ")",
        '函数开始': "{",
        '函数结束': "}",
        '返回': 'return ',
        //布尔值
        '真': 'true',
        '假': 'false',
        '真值': 'true',
        '假值': 'false',
        //if-else类分支语句
        '如果': 'if(',
        '如果不': 'if(!',
        '若': 'if(',
        '那么': ')',
        '分支开始': '{',
        '分支结束': '}',
        '不': '!',
        '否则': 'else ',
        //数学
        '随机数': 'Math.random()',
        '圆周率': 'Math.PI',
        //      
        //
        '?': " ? ",
        '+': ' + ',
        '-': ' - ',
        '*': ' * ',
        '**': ' ** ',
        '/': ' / ',
        '%': ' % ',
        '=': ' = ',
        '+=': " += ",
        '-=': " -= ",
        '*=': " *= ",
        '/=': " /= ",
        '**=': " **= ",
        '%=': " %= ",
        '<<=': " <<= ",
        '>>=': " >>= ",
        '>=': ' >= ',
        '<=': " <= ",
        '==': " == ",
        '===': " === ",
        '||': ' || ',
        '&&': ' && ',
        //关键字
        'else': 'else ',
        "switch": "switch ",
        'in': ' in ',
        'for(var': 'for(var ',
        'for(let': 'for(let ',
        'for(const': 'for(const ',
        'let': 'let ',
        'var': 'var ',
        'const': 'const ',
        'typeof': 'typeof ',
        'async': 'async ',
        'function': 'function ',
        'class': 'class ',
        'new': 'new ',
        'return': 'return ',
        'delete': 'delete ',
        'case': 'case ',
        'await': 'await ',
        "yield": 'yield ',
        "void": 'void ',
        "instanceof": " instanceof ",
        "of": " of ",
        "in": " in ",
        //
        "，": ',',
        "父元素": "parentNode",
        "子元素": "children",
        "牌堆": "ui.cardPile",
        "弃牌堆": "ui.discardPile",
        "处理区": "ui.ordering",
        //
        "目前选择的卡牌的张数": "ui.selected.cards.length",
        "目前选择的目标的个数": "ui.selected.targets.length",
        "目前选择的按钮的个数": "ui.selected.buttons.length",
        "当前选择的卡牌的张数": "ui.selected.cards.length",
        "当前选择的目标的个数": "ui.selected.targets.length",
        "当前选择的按钮的个数": "ui.selected.buttons.length",
    }
    static freeQuotation = {
        cardName: getMapOfCard(false),
        group: {
            "魏势力": "wei",
            "蜀势力": "shu",
            "吴势力": "wu",
            "晋势力": "jin",
            "群势力": "qun",
            "群雄": "qun",
            "神势力": "shen",
            "西势力": "western",
            "键势力": "key",
        },
        typeCard: {
            "基本牌": "basic",
            "装备牌": "equip",
            "延时锦囊牌": "delay",
            "普通锦囊牌": "trick",
            "冒险牌": "gwmaoxian",
            "地图牌": "land",
            "宝物牌": "hsbaowu",
            "机关牌": "jiguan",
            "机械牌": "hsjixie",
            "梦境牌": "hsmengjing",
            "毒素牌": "hsdusu",
            "法术牌": "spell",
            "祈咒牌": "hsqizhou",
            "神器牌": "hsshenqi",
            "祭器牌": "jiqi",
            "药水牌": "hsyaoshui",
            "诅咒牌": "hszuzhou",
            "金卡法术牌": "spell_gold",
            "铜卡法术牌": "spell_bronze",
            "银卡法术牌": "spell_silver",
            "零件牌": "hslingjian",
            "青玉牌": "hsqingyu",
            "食物牌": "food",
        },
        type: {
            "基本": "basic",
            "装备": "equip",
            "延时锦囊": "delay",
            "普通锦囊": "trick",
            "冒险": "gwmaoxian",
            "地图": "land",
            "宝物": "hsbaowu",
            "机关": "jiguan",
            "机械": "hsjixie",
            "梦境": "hsmengjing",
            "毒素": "hsdusu",
            "法术": "spell",
            "祈咒": "hsqizhou",
            "神器": "hsshenqi",
            "祭器": "jiqi",
            "药水": "hsyaoshui",
            "诅咒": "hszuzhou",
            "金卡法术": "spell_gold",
            "铜卡法术": "spell_bronze",
            "银卡法术": "spell_silver",
            "零件": "hslingjian",
            "青玉": "hsqingyu",
            "食物": "food"
        },
        suit: {
            "方片": "diamond",
            "梅花": "club",
            "红桃": "heart",
            "黑桃": "spade",
            "无花色": "none"
        },
        color: {
            "红色": "red",
            "黑色": "black",
            "无颜色": "none"
        },
        nature: {
            '火属性': 'fire',
            '雷属性': 'thunder',
            '冰属性': 'ice',
            "神属性": "kami"
        },
        gender: {
            "男性": `male`,
            "女性": `female`,
            "双性": 'double',
            "未知性": `unknow`
        },
        subtype: {
            "武器牌": "equip1",
            "防具牌": "equip2",
            "+1马牌": "equip3",
            "防御马牌": `equip3`,
            "-1马牌": `equip4`,
            "进攻马牌": `equip4`,
            "宝物牌": `equip5`,
        },
        eventName: eventList,
    }
    static groupedList = {
        translate: {
            "花费数据": "cost_data",
            '布尔': "bool",
        },
        uniqueArea: {
            '#判定回调区头': "<judgeCallback>",
            '#判定回调区尾': "</judgeCallback>",
            "#选择发动区头": "<cost>",
            "#选择发动区尾": "</cost>",
            '###############': " ",
        },
        custom: {
            //
            '牌堆中颜色不同牌': "info;\\skillID;//!?custom_researchCardsDif;true;'color';intoFunction",
            '牌堆中花色不同牌': "info;\\skillID;//!?custom_researchCardsDif;true;'suit';intoFunction",
            '牌堆中属性不同牌': "info;\\skillID;//!?custom_researchCardsDif;true;'nature';intoFunction",
            '牌堆中点数不同牌': "info;\\skillID;//!?custom_researchCardsDif;true;'number';intoFunction",
            '牌堆中牌名不同牌': "info;\\skillID;//!?custom_researchCardsDif;true;'name';intoFunction",
            '牌堆中类别不同牌': "info;\\skillID;//!?custom_researchCardsDif;true;'type2';intoFunction",
            '牌堆中副类别不同牌': "info;\\skillID;//!?custom_researchCaerdsDif;true;'subtype';intoFunction",
            //
            '弃牌堆中颜色不同牌': "info;\\skillID;//!?custom_researchCardsDif;false;'color';intoFunction",
            '弃牌堆中花色不同牌': "info;\\skillID;//!?custom_researchCardsDif;false;'suit';intoFunction",
            '弃牌堆中属性不同牌': "info;\\skillID;//!?custom_researchCardsDif;false;'nature';intoFunction",
            '弃牌堆中点数不同牌': "info;\\skillID;//!?custom_researchCardsDif;false;'number';intoFunction",
            '弃牌堆中牌名不同牌': "info;\\skillID;//!?custom_researchCardsDif;false;'name';intoFunction",
            '弃牌堆中类别不同牌': "info;\\skillID;//!?custom_researchCardsDif;false;'type2';intoFunction",
            '弃牌堆中副类别不同牌': "info;\\skillID;//!?custom_researchCaerdsDif;false;'subtype';intoFunction",
            //
            '当前选择卡牌颜色是否相同': "info;\\skillID;//!?custom_selectedIsSameCard;card;'color';intoFunction",
            '当前选择卡牌花色是否相同': "info;\\skillID;//!?custom_selectedIsSameCard;card;'suit';intoFunction",
            '当前选择卡牌属性是否相同': "info;\\skillID;//!?custom_selectedIsSameCard;card;'nature';intoFunction",
            '当前选择卡牌点数是否相同': "info;\\skillID;//!?custom_selectedIsSameCard;card;'number';intoFunction",
            '当前选择卡牌类别是否相同': "info;\\skillID;//!?custom_selectedIsSameCard;card;'type2';intoFunction",
            '当前选择卡牌副类别是否相同': "info;\\skillID;//!?custom_selectedIsSameCard;card;'subtype';intoFunction",
            //
            '当前选择卡牌颜色是否不同': "info;\\skillID;//!?custom_selectedIsDifCard;card;'color';intoFunction",
            '当前选择卡牌花色是否不同': "info;\\skillID;//!?custom_selectedIsDifCard;card;'suit';intoFunction",
            '当前选择卡牌属性是否不同': "info;\\skillID;//!?custom_selectedIsDifCard;card;'nature';intoFunction",
            '当前选择卡牌点数是否不同': "info;\\skillID;//!?custom_selectedIsDifCard;card;'number';intoFunction",
            '当前选择卡牌类别是否不同': "info;\\skillID;//!?custom_selectedIsDifCard;card;'type2';intoFunction",
            '当前选择卡牌副类别是否不同': "info;\\skillID;//!?custom_selectedIsDifCard;card;'subtype';intoFunction"
        },
        punctuation: {
            //
            "；": ";",
            "：": ":",
            "【": "[",
            "】": "]",
            "【】": "[]",
            "！": "!",
            "？": ' ? ',
            //
            '访问': ".",
            '访': ".",
            '注释': '//',
            '单行注释': "//",
            //
            '自增': '++',
            '自减': '--',
            //比较算符
            '为': ' == ',
            '是': ' == ',
            '等于': ' == ',
            '相等于': ' == ',
            '真等于': ' === ',
            '严格等于': ' === ',
            '严格相等于': ' === ',
            '不是': ' != ',
            '不为': ' != ',
            '不等于': ' != ',
            '真不等于': ' !== ',
            '严格不等于': ' !== ',
            '大于': ' > ',
            '大于等于': ' >= ',
            '大等': " >= ",
            '不小于': ' >= ',
            '小于': ' < ',
            '小于等于': ' <= ',
            '小等': " <= ",
            '不大于': ' <= ',
            //普通运算
            '加': ' + ',
            '减': ' - ',
            '乘': ' * ',
            '乘以': ' * ',
            '除以': ' / ',
            '取模': ' % ',
            '模': ' % ',
            //位运算
            'AND': " & ",
            'OR': " | ",
            'NOT': " ~ ",
            'XOR': " ^ ",
            '位与': " & ",
            '位或': " | ",
            '位非': " ~ ",
            '异或': " ^ ",
            '位异或': " ^ ",
            '左移': "<<",
            '右移': ">>",
            //逻辑算符
            '或者': ' || ',
            "逻辑或": ' || ',
            '且': ' && ',
            '并且': ' && ',
            '逻辑且': " && ",
            '逻辑非': '!',
            //赋值语句
            '令为': ' = ',
            '加等': " += ",
            '减等': " -= ",
            '模等': " %= ",
            '除等': " /= ",
            '乘等': " *= ",
            '取模等': " %= ",
            '除以等': " /= ",
            '乘以等': " *= ",
            '位与等': " &= ",
            '位或等': " |= ",
            '位非等': " ~= ",
            '异或等': " ^= ",
            '左移等': " <<= ",
            '右移等': " >>= ",
            '逻辑或等': " ||= ",
            '逻辑且等': " &&= ",
        },
        staticValue: {
            '强制发动': "true",
            "不可被无懈可击响应": `"nowuxie"`,
            "不计入次数": 'false',
            '不影响ai': `"noai"`,
            '从牌堆底': '"bottom"',
            '无期': '"forever"',
            '无来源': '"nosource"',
            '非真实': '"noreal"'
        },
        array: {
            "无效的角色": `trigger.getParent("useCard",void 0,true).excluded`,
            "不可响应牌的角色": `trigger.getParent("useCard",void 0,true).directHit`,
            "无视此牌的目标防具的牌": `trigger.target.storage.qinggang2`,
            '此牌的目标组': `trigger.getParent("useCard",void 0,true).targets`,
            '此牌的已触发的目标组': `trigger.getParent("useCard",void 0,true).triggeredTargets2`,
            "阶段列表": `trigger.getParent("phase",void 0,true).phaseList`,
            "选项列表": "choiceList"
        },
        array_structure: {
            "数组开始": "[",
            "数组结束": "]",
        },
        array_method: {
            "包含": 'includes',
            "不包含": 'includes:denyPrefix',
            '添加': "add",
            "添单": "add",
            "添多": "addArray",
            "剪接": "splice",
            "连接": "concat",
            "移除": "remove",
            "除组": "removeArray",
            "去重": "toUniqued",
            "随机抽单": "randomGet",
            "随机抽多": "randomGets",
            "长度": "length",
        },
        get_method: {
            "牌堆顶牌组": "cards",
            "牌堆底牌组": "bottomCards",
            "牌堆顶牌组(放回)": "cards:ture:intoFunctionWait",
            "牌堆底牌组(放回)": "bottomCards:ture:intoFunctionWait",
            "技能使用次数": "skillCount",
            //弃牌堆中
            '弃牌堆中普通锦囊牌': 'discardPile;card=>get.type(card)==="trick"',
            '弃牌堆中延时锦囊牌': 'discardPile;card=>get.type(card)==="delay"',
            '弃牌堆中基本牌': 'discardPile;card=>get.type(card)==="basic"',
            '弃牌堆中装备牌': 'discardPile:card=>get.type(card)==="equip"',
            '弃牌堆中宝物牌': 'discardPile:card=>get.subtype(card)=="equip5"',
            '弃牌堆中防具牌': 'discardPile:card=>get.subtype(card)=="equip2"',
            '弃牌堆中武器牌': 'discardPile:card=>get.subtype(card)=="equip1"',
            '弃牌堆中+1马牌': 'discardPile:card=>get.subtype(card)=="equip3"',
            '弃牌堆中-1马牌': 'discardPile:card=>get.subtype(card)=="equip4"',
            '弃牌堆中防御马牌': 'discardPile:card=>get.subtype(card)=="equip3"',
            '弃牌堆中进攻马牌': 'discardPile:card=>get.subtype(card)=="equip4"',
            '弃牌堆中伤害锦囊牌': 'discardPile:card=>get.type2(card)=="trick"&&get.tag(card,"damage")',
            '弃牌堆中牌颜色为红色': 'discardPile:card=>get.color(card)=="red"',
            '弃牌堆中牌颜色为黑色': 'discardPile:card=>get.color(card)=="black"',
            //牌堆中
            '牌堆中普通锦囊牌': 'cardPile2:card=>get.type(card)==="trick"',
            '牌堆中延时锦囊牌': 'cardPile2:card=>get.type(card)==="delay"',
            '牌堆中基本牌': 'cardPile2:card=>get.type(card)==="basic"',
            '牌堆中装备牌': 'cardPile2:card=>get.type(card)==="equip"',
            '牌堆中宝物牌': 'cardPile2:card=>get.subtype(card)=="equip5"',
            '牌堆中防具牌': 'cardPile2:card=>get.subtype(card)=="equip2"',
            '牌堆中武器牌': 'cardPile2:card=>get.subtype(card)=="equip1"',
            '牌堆中+1马牌': 'cardPile2:card=>get.subtype(card)=="equip3"',
            '牌堆中-1马牌': 'cardPile2:card=>get.subtype(card)=="equip4"',
            '牌堆中防御马牌': 'cardPile2:card=>get.subtype(card)=="equip3"',
            '牌堆中进攻马牌': 'cardPile2:card=>get.subtype(card)=="equip4"',
            '牌堆中伤害锦囊牌': 'cardPile2:card=>get.type2(card)=="trick"&&get.tag(card,"damage")',
            '牌堆中牌颜色为红色': 'cardPile2:card=>get.color(card)=="red"',
            '牌堆中牌颜色为黑色': 'cardPile2:card=>get.color(card)=="black"',
            //标签
            "有伤害标签": `tag:"damage":intoFunctionWait`,
            "无伤害标签": `tag:"damage":intoFunctionWait:denyPrefix`,
            "带伤害标签": `tag:"damage":intoFunctionWait`,
            "不带伤害标签": `tag:"damage":intoFunctionWait:denyPrefix`,
            //
            "有多角色标签": `tag:"multitarget":intoFunctionWait`,
            "无多角色标签": `tag:"multitarget":intoFunctionWait:denyPrefix`,
            "带多角色标签": `tag:"damage":intoFunctionWait`,
            "不带多角色标签": `tag:"damage":intoFunctionWait:denyPrefix`,
            "有多目标标签": `tag:"multitarget":intoFunctionWait`,
            "无多目标标签": `tag:"multitarget":intoFunctionWait:denyPrefix`,
        },
        math: {
            ...getMapOfRandomNum()
        },
        math_method: {
            "最大值": "max",
            "最小值": "min",
            "绝对值": "abs",
            "正弦": "sin",
            "余弦": "cos",
            "保留整数": "trunc",
            "四舍五入": "round",
            "向下取整": "floor",
            "向上取整": "ceil"
        },
        cards: {
            "触发事件的牌组": "trigger.cards",
            "事件的牌组": "event.cards",
            "目前选择的牌组": "ui.selected.cards",
        },
        card: {
            ...getMapAboutCard(),
            ...getMapOfOneOfTriCards(),
            ...getMapOfOneOfSelectedCards(),
            "判定牌": "trigger.result.card",
            '触发事件的卡牌': "trigger.card",
        },
        card_attr: {
            "点数": "number",
            "不是转化牌": "isCard"
        },
        card_method: {
            "移除": "remove",
            "修正": "fix",
            "已销毁": "destroyed",
            "牌名相同于": "sameNameAs",
            "牌名不同于": "differentNameFrom",
            "花色相同于": "sameSuitAs",
            "花色不同于": "differentSuitFrom",
            "点数相同于": "sameNumberAs",
            "点数不同于": "differentNumberFrom",
        },
        result: {
            "事件结果": "event.result",
            "结果": "result",
            "有选择结果": "result.bool===true",
            "无选择结果": "result.bool===false",
            "选择结果布尔": "result.bool",
            "选择结果卡牌": "result.card",
            "选择结果牌组": "result.cards",
            "选择结果按钮": "result.links",
            "选择结果目标组": "result.targets",
            "选择结果牌数": "result.cards.length",
            "选择结果目标数": "result.targets.length",
            "选择结果按钮数": "result.button.length",
            "选择结果牌名": "result.name",
            "选择结果点数": "result.number",
            "选择结果颜色": "result.color",
            "选择结果花色": "result.suit",
            "选择结果选项编号": "result.choice",
            "选择结果选项": "result.control",
            //
            "没有选择卡牌": "result.bool===false",
            "没有选择角色": "result.bool===false",
            //
            '判定结果卡牌': "result.card",
            "判定结果牌名": "result.name",
            "判定结果点数": "result.number",
            "判定结果颜色": "result.color",
            "判定结果花色": "result.suit",
            //
            "议事结果": "result.opinion",
            //
            '拼点平局': "result.tie",
            '拼点平': "result.tie",
            '拼点没平': "result.tie",
            '拼点未平': "result.tie",
            '拼点胜': "result.bool",
            '拼点赢': "result.bool",
            '拼点没赢': "!result.bool",
            '拼点未赢': "!result.bool",
            '拼点输': "!result.bool && !result.tie",
            '拼点未输': "result.bool || result.tie",
            '拼点没输': "result.bool || result.tie",
        },
        staticStr_phase: {
            '准备阶段|\\-skillID': '"phaseZhunbei|\\-skillID"',
            '出牌阶段|\\-skillID': '"phaseUse|\\-skillID"',
            '结束阶段|\\-skillID': '"phaseJieShu|\\-skillID"',
            '判定阶段|\\-skillID': '"phaseJudge|\\-skillID"',
            '弃牌阶段|\\-skillID': '"phaseDiscard|\\-skillID"',
            '摸牌阶段|\\-skillID': '"phaseDraw|\\-skillID"'
        },
        player: {
            ...playerList,
            ...getMapOfOneOfPlayers(),
            '角色': "player",
            "有本技能的角色": `game.filterPlayer().find(cur=>cur.hasSkill(\\skillID,null,false,false))`,
            "有该技能的角色": `game.filterPlayer().find(cur=>cur.hasSkill(\\skillID,null,false,false))`,
            "有此技能的角色": `game.filterPlayer().find(cur=>cur.hasSkill(\\skillID,null,false,false))`,
        },
        player_attribute: {
            //
            '体力': 'hp',
            '体力值': 'hp',
            '体力上限': 'maxHp',
            '护甲': 'hujia',
            '护甲值': 'hujia',
            '剩余出局轮数': "outCount",
            '进行的回合数': "phaseNumber",
            '已进行的回合数': "phaseNumber",
            '座位号': "getSeatNum:",
            //
            'id': 'name',
            '性别': 'sex',
            '身份': "identity",
            "势力": "group",
            //
            '储存': 'storage',
            '储存信息': 'storage',
            '存储': 'storage',
            '存储信息': 'storage',
        },
        player_method_hp: {
            '有全场最少或之一的体力值': 'isMinHp',
            '有全场最多或之一的体力值': 'isMaxHp',
            '没有全场最少或之一的体力值': 'isMinHp:denyPrefix',
            '没有全场最多或之一的体力值': 'isMaxHp:denyPrefix',
            '有全场唯一最少的体力值': 'isMinHp;true',
            '有全场唯一最多的体力值': 'isMaxHp;true',
            '没有全场唯一最少的体力值': 'isMinHp;true:denyPrefix',
            '没有全场唯一最多的体力值': 'isMaxHp;true:denyPrefix',
            //
            '已损失的体力值': "getDamagedHp;",
            '已损失体力值': "getDamagedHp;",
            '已损体力值': "getDamagedHp;",
            '已失体力值': "getDamagedHp;",
        },
        player_method_handcard: {
            '有全场最少或之一的手牌数': 'isMinHandcard',
            '有全场最多或之一的手牌数': 'isMaxHandcard',
            '有全场最少或之一的手牌数': 'isMinHandcard:denyPrefix',
            '有全场最多或之一的手牌数': 'isMaxHandcard:denyPrefix',
            '有全场唯一最少的手牌数': 'isMinHandcard;true',
            '有全场唯一最多的手牌数': 'isMaxHandcard;true',
            '没有全场唯一最少的手牌数': 'isMinHandcard;true:denyPrefix',
            '没有全场唯一最多的手牌数': 'isMaxHandcard;true:denyPrefix',
            "手牌上限": "getHandcardLimit;",
        },
        player_method_mark: {
            //标记类
            "标记数量": "countMark",
            '统计标记': "countMark",
            '获得标记': 'addMark',
            '增加标记': 'addMark',
            '移去标记': 'removeMark',
            '拥有标记': 'hasMark',
            '有标记': "hasMark",
            '清除标记': 'clearMark',
            '标记添加记录': 'markAuto',
            '标记移除记录': 'unmarkAuto',
            "有蓄力值": `hasMark:"charge"`,
            "没有蓄力值": `hasMark:"charge":denyPrefix`,
            "无蓄力值": `hasMark:"charge":denyPrefix`,
        },
        player_method_solt: {
            '有未被废除的装备栏': "hasEnabledSlot",
            '没有未被废除的装备栏': "hasEnabledSlot:denyPrefix",
            "装备栏均已废除": "hasEnabledSlot:denyPrefix",
            "装备栏均已被废除": "hasEnabledSlot:denyPrefix",
            "已废除的装备栏数量": "countDisabled;",
            "有空置的武器栏": "hasEmptySlot;1",
            "没有空置的武器栏": "hasEmptySlot;1;denyPrefix",
            "有空置的防具栏": "hasEmptySlot;2",
            "没有空置的防具栏": "hasEmptySlot;2;denyPrefix",
            "有空置的+1马栏": "hasEmptySlot;3",
            "没有空置的+1马栏": "hasEmptySlot;3;denyPrefix",
            "有空置的-1马栏": "hasEmptySlot;4",
            "没有空置的-1马栏": "hasEmptySlot;4;denyPrefix",
            "有空置的宝物栏": "hasEmptySlot;5",
            "没有空置的宝物栏": "hasEmptySlot;5;denyPrefix",
        },
        player_method_hasCard: {
            '有无懈': "hasWuxie",
            '有无懈可击': "hasWuxie",
            '有杀': "hasSha",
            '有闪': "hasShan",
            '有手牌': 'hasCard',
            '没有手牌': "hasCard:denyPrefix",
            '有牌': 'hasCard;void 0;"he"',
            '场上有牌': `hasCard;void 0;"ej"`,
            '区域内有牌': 'hasCard;void 0;"hej"',
            '装备区有牌': `hasCard;void 0;"e"`,
            '判定区有牌': `hasCard;void 0;"j"`,
            '手牌区有牌': `hasCard;void 0;"h"`,
            '没有牌': 'hasCard;void 0;"he";denyPrefix',
            '场上没有牌': `hasCard;void 0;"ej";denyPrefix`,
            '区域内没有牌': 'hasCard;void 0;"hej";denyPrefix',
            '装备区没有牌': `hasCard;void 0;"e";denyPrefix`,
            '判定区没有牌': `hasCard;void 0;"j";denyPrefix`,
            '手牌区没有牌': `hasCard;void 0;"h";denyPrefix`,
        },
        player_method_countCard: {
            '手牌数': 'countCards;"h"',
            '牌数': 'countCards;"he"',
            '场上牌数': `countCards;"ej"`,
            '区域内牌数': 'countCards;"hej"',
            '手牌区牌数': 'countCards;"h"',
            '装备区牌数': 'countCards;"e"',
            '判定区牌数': 'countCards;"j"',
            '可被获得的手牌数': "countGainableCards;'h';intoFunctionWait",
            '可被获得的牌数': "countGainableCards;'he';intoFunctionWait",
            '可被获得的区域内牌数': "countGainableCards;'hej';intoFunctionWait",
            '可被获得的手牌区的牌数': "countGainableCards;'h';intoFunctionwait",
            '可被获得的装备区的牌数': "countGainableCards;'e';intoFunctionWait",
            '可被获得的判定区的牌数': "countGainableCards;'j';intoFunctionWait",
        },
        player_method_phase: {
            '跳过阶段': "skip",
            '跳过下一个准备阶段': 'skip:"phaseZhunbei"',
            '跳过下一个出牌阶段': 'skip:"phaseUse"',
            '跳过下一个判定阶段': 'skip:"phaseJudge"',
            '跳过下一个弃牌阶段': 'skip:"phaseDiscard"',
            '跳过下一个摸牌阶段': 'skip:"phaseDraw"',
            '跳过下一个结束阶段': 'skip:"phaseJieShu"'
        },
        player_method: {
            "攻击范围内有": "inRange",
            '执行额外的回合': 'insertPhase',
            //判定区和装备栏
            '废除判定区': 'disableJudge',
            "摸牌或回复体力值": "chooseDrawRecover",
            //性别类
            "拥有性别": "hasSex",
            "属于性别": "hasSex",
            "有性别": "hasSex",
            "不属于性别": 'hasSex:denyPrefix',
            "性别相同于": "sameSexAs",
            "性别不同于": "differentSexFrom",
            //体力类
            "将体力值回复至": "recoverTo",
            "体力值回复至": "recoverTo",
            '获得护甲': 'changeHujia',
            "改变护甲值": "changeHujia",
            //
            '已受伤': 'isDamaged',
            '未受伤': 'isHealthy',
            '存活': 'isAlive',
            //牌类
            '给牌': "give",
            '给出牌': "give",
            //
            '展示牌': "showCards",
            '展示一些牌': "showCards",
            '展示手牌': "showHandcards",
            "观看牌": "viewCards",
            "观看一些牌": "viewCards",
            "观看手牌": "viewHandcards",
            //
            '随机获得牌': 'randomGain',
            "随机获得指定区域的牌": "randomGain",
            '随机弃置手牌': 'randomDiscard',
            "随机弃置指定区域的牌": "randomDiscard",
            "获得多名角色手牌": `gainMultiple`,
            "获得多名角色指定区域的牌": `gainMultiple`,
            "获得某名角色指定区域内牌": "gainPlayerCard",
            "弃置某名角色指定区域内牌": "discardPlayerCard",
            '移动场上牌': 'moveCard',
            '将手牌补至': 'drawTo',
            '将手牌摸至': 'drawTo',
            '手牌补至': 'drawTo',
            '手牌摸至': 'drawTo',
            '丢弃至弃牌堆': "loseToDiscardpile",
            "失去牌至弃牌堆": "loseToDiscardpile",
            "失去牌至特殊区域": "loseToSpecial",
            "重铸牌": "recast",
            //
            "给牌打标记": "addGaintag",
            "给牌添加标记": "addGaintag",
            "给牌移除标记": "removeGaintag",
            //
            "交换装备区": "swapEquip",
            "交换手牌区": "swapHandcards",
            //
            '更新状态': "update",
            '更改势力': "changeGroup",
            //
            //宗族类
            "获取宗族": "getClans",
            "属于宗族": "hasClan",
            '获取判定区牌': 'getJudge',
            '获取装备区牌': 'getEquip',
            //回合类
            "处于自己的出牌阶段": "isPhaseUsing",
            //状态类
            '背面朝上': 'isTurnedOver',
            '正面朝上': 'isTurnedOver:denyPrefix',
            '武将牌背面朝上': 'isTurnedOver',
            '武将牌正面朝上': 'isTurnedOver:denyPrefix',
            '已横置': "isLinked",
            '未横置': "isLinked:denyPrefix",
            '已翻面': "isTurnedOver",
            '未翻面': "isTurnedOver:denyPrefix",
            '判定区已废除': 'isDisabledJudge',
            '判定区未废除': 'isDisabledJudge:denyPrefix',
        },
        player_method_skill: {
            //
            '失去所有技能': "clearSkills",
            '清除技能': "clearSkills",
            '添加技能': 'addSkill',
            '获得技能': 'addSkill',
            '失去技能': "removeSkill",
            '移除技能': "removeSkill",
            '添加技能并录入日志': 'addSkillLog',
            '获得技能并录入日志': 'addSkillLog',
            '移除技能并录入日志': "removeSkillLog",
            '失去技能并录入日志': "removeSkillLog",
            '拥有技能': 'hasSkill',
            '有技能': 'hasSkill',
            '记录技能为已发动': "awakenSkill",
            '重置技能': "restoreSkill",
            "更换技能": "changeSkills",
            '能够拼点': "canCompare",
            '获得技能(触发事件)': 'addSkill',
            '失去技能(触发事件)': "removeSkill",
            "获得衍生技能": "addAdditionalSkill",
            "失去衍生技能": "removeAdditionalSkill",
            "移去衍生技能": "removeAdditionalSkill",
            "失去衍生技能(触发事件)": "removeAdditionalSkills",
            "移去衍生技能(触发事件)": "removeAdditionalSkills",
            //
            "临时获得技能": "addTempSkill",
            "临时禁用技能": "tempBanSkill",
            //
            "本回合被破甲": `addTempSkill:"qinggang2"`,
            "本回合非锁定技失效": `addTempSkill:"fengyin"`,
            "获得技能直到下个出牌阶段结束": `addTempSkill;{player:"phaseUseEnd"}:intoFunctionWait`,
            "获得技能直到下个回合结束": `addTempSkill;{player:"phaseEnd"}:intoFunctionWait`,
            "获得技能直到下一轮开始时": `addTempSkill;"roundStart":intoFunctionWait`,
        },
        player_choose: {
            //
            "发起议事": "chooseToDebate",
            "发起拼点": "chooseToCompare",
            //
            '选择选项': "chooseControl",
            '选择带取消的选项': `chooseControl:"cancel2":intoFunction`,
            //
            '选择确认': "chooseBool",
            //
            '选择按钮': "chooseButton",
            '选择卡牌按钮': "chooseCardButton",
            //
            "选择对角色使用牌": "chooseUseTarget",
            "选择使用手牌": `chooseToUse`,
            "选择使用牌": `chooseToUse`,
            '选择牌': 'chooseCard:"he":intoFunction',
            '选择手牌': 'chooseCard',
            //
            '废除装备区内一个装备栏': 'chooseToDisable',
            '选择废除装备区内一个装备栏': 'chooseToDisable',
            '废除一个装备栏': 'chooseToDisable',
            '选择废除一个装备栏': 'chooseToDisable',
            '恢复装备区内一个装备栏': 'chooseToEnable',
            '选择恢复装备区内一个装备栏': 'chooseToEnable',
            '选择恢复一个装备栏': 'chooseToEnable',
            '恢复一个装备栏': 'chooseToEnable',
            '选择弃置牌': 'chooseToDiscard:"he":intoFunction',
            '选择弃置手牌': 'chooseToDiscard:"h":intoFunction',
            '选择弃牌': 'chooseToDiscard:"he":intoFunction',
            '选择弃手牌': 'chooseToDiscard:"h":intoFunction',
            '选择角色牌': 'choosePlayerCard:"he":intoFunction',
            '选择角色手牌': 'choosePlayerCard',
            '卜算': 'chooseToGuanxing',
            '选择角色': 'chooseTarget',
            '选择目标': 'chooseTarget',
            '判定': "judge",
            '进行判定': "judge",
            '进行一次判定': "judge",
            '选择牌和角色': "chooseCardTarget",
            '选择角色和牌': "chooseCardTarget",
            '选择牌拼点': "chooseToCompare",
            '拼点': "chooseToCompare",
        },
        player_withArg: {
            ...getMapOfHasCard(),
            ...getMapOfHasType(),
            ...getMapOfCanAddJudge(),
            ...getMapOfChangeGroup(),
            ...getMapOfUSeVcard(),
            //
            "播放判定生效动画": "tryJudgeAnimagte;true",
            "播放判定失效动画": "tryJudgeAnimagte;false",
            //
            "攻击范围": "getAttackRange;",
            //装备栏类
            //牌类事件      
            '随机弃置牌': 'randomDiscard;"he";intoFunction',
            '随机弃置装备区牌': 'randomDiscard;"e";intoFunction',
            '随机弃置手牌区牌': 'randomDiscard;"h";intoFunction',
            '弃置区域内所有牌': 'randomDiscard;"hej";Infinity',
            '获得角色区域内牌': 'gainPlayerCard;"hej";intoFunction',
            '弃置角色区域内牌': 'discardPlayerCard;"hej";intoFunction',
            '获得区域内牌': 'gainPlayerCard;"hej";intoFunction',
            '弃置区域内牌': 'discardPlayerCard;"hej";intoFunction',
            '获得角色牌': 'gainPlayerCard;"he";intoFunction',
            '弃置角色牌': 'discardPlayerCard;"he";intoFunction',
            '获得角色手牌': 'gainPlayerCard;"h";intoFunction',
            '弃置角色手牌': 'discardPlayerCard;"h";intoFunction',
            '隐式给牌': "give;false;intoFunctionWait",
            "获得多名角色牌": `gainMultiple;"he";intoFunctionWait`,
            '获取手牌区牌': 'getCards;"h"',
            '获取装备区牌': 'getCards;"e"',
            '获取判定区牌': 'getCards;"j"',
            '获取区域内牌': 'getCards;"hej"',
            '获取牌': 'getCards;"he"',
            '获取手牌': 'getCards;"h"',
            //历史类
            '获取本回合指定其他角色为目标的使用牌事件': "getHistory;'useCard';function(evt){return evt.targets.filter(current=>target!=player)}",
            '获取本回合指定其他角色为目标的打出牌事件': "getHistory;'respond';function(evt){return evt.targets.filter(current=>target!=player)}",
            ...getMapOfActionHistory(),
            '获取本回合失去牌的类型个数': `getHistory;"lose";//!?map(evt => evt.cards).flat().map(card => get.type2(card)).toUniqued().length`,
            '获取本回合失去牌的颜色个数': `getHistory;"lose";//!?map(evt => evt.cards).flat().map(card => get.color(card)).toUniqued().length`,
            '获取本回合失去牌的花色个数': `getHistory;"lose";//!?map(evt => evt.cards).flat().map(card => get.suit(card)).toUniqued().length`,
            '获取本回合失去牌的点数个数': `getHistory;"lose";//!?map(evt => evt.cards).flat().map(card => get.number(card)).toUniqued().length`,
            '获取本回合失去牌的副类别个数': `getHistory;"lose";//!?map(evt => evt.cards).flat().map(card => get.subtype(card)).toUniqued().length`,
            '获取本回合失去牌的牌名个数': `getHistory;"lose";//!?map(evt => evt.cards).flat().map(card => get.name(card)).toUniqued().length`,
            '获取本回合失去牌的属性个数': `getHistory;"lose";//!?map(evt => evt.cards).flat().map(card => get.nature(card)).toUniqued().length`,
            '获取本回合获得牌的类型个数': `getHistory;"gain";//!?map(evt => evt.cards).flat().map(card => get.type2(card)).toUniqued().length`,
            '获取本回合获得牌的颜色个数': `getHistory;"gain";//!?map(evt => evt.cards).flat().map(card => get.color(card)).toUniqued().length`,
            '获取本回合获得牌的花色个数': `getHistory;"gain";//!?map(evt => evt.cards).flat().map(card => get.suit(card)).toUniqued().length`,
            '获取本回合获得牌的点数个数': `getHistory;"gain";//!?map(evt => evt.cards).flat().map(card => get.number(card)).toUniqued().length`,
            '获取本回合获得牌的副类别个数': `getHistory;"gain";//!?map(evt => evt.cards).flat().map(card => get.subtype(card)).toUniqued().length`,
            '获取本回合获得牌的牌名个数': `getHistory;"gain";//!?map(evt => evt.cards).flat().map(card => get.name(card)).toUniqued().length`,
            '获取本回合获得牌的属性个数': `getHistory;"gain";//!?map(evt => evt.cards).flat().map(card => get.nature(card)).toUniqued().length`,
        },
        plyaer_when: {
            ...getMapOfWhen()
        },
        players: {
            /*所(被)选(的)角色,所(被)选择(的)角色*/
            '所选角色': 'result.targets',
            '所有角色': 'game.players',
            '触发事件的目标组': "trigger.targets",
            '目标组': "targets",
            '事件的目标组': "event.targets",
        },
        event: {
            '触发': 'trigger',
            '触发事件': 'trigger',
            '触发的事件': 'trigger',
            "触发事件的父事件": "trigger.parent",
            "触发的父事件": "trigger.parent",
            '事件': 'event',
        },
        event_var: {
            "判定事件": "judgeEvent",
            "选择事件": "chooseEvent"
        },
        event_name: eventList,
        event_method: {
            '取消': 'cancel',
            '重复': 'redo',
            '结束': 'finish',
            '跳至': 'goto',
            '父事件': 'getParent',
            '获取父事件': 'getParent',
            '获取父事件的名字': 'getParent;//!?name',
            '数值改为0': "changeToZero",
            '数值调为0': "changeToZero",
            '数改为0': "changeToZero",
            '数调为0': "changeToZero",
            "设置": "set",
            "获取事件结果": "forResult",
            "不涉及横置": "notLink",
        },
        event_set: {
            //
            "设置ai": `set;"ai";intoFunction`,
            "设置Ai": `set;"ai";intoFunction`,
            "设置AI": `set;"ai";intoFunction`,
            "设置ai适度弃牌": `set;"ai";get.unuseful2`,
            "设置ai厌恶弃牌": `set;"ai";get.unuseful`,
            //
            "设置提示标题": `set;"prompt";intoFunction`,
            "设置提示内容": `set;"prompt2";intoFunction`,
            "设置提示事件提示": `set;"evtprompt";intoFunction`,
            "设置提示标题跟随技能": `set;"prompt";get.prompt(\\skillID)`,
            "设置提示内容跟随技能": `set;"prompt2";get.prompt2(\\skillID)`,
            //
            "设置选项列表": `set;"choiceList";intoFunction`,
            "设置选项组": `set;"controls";intoFunction`,
            //
            "设置角色限制条件": `set;"filterTarget";intoFunction`,
            "设置角色选择数量": `set;"selectTarget";intoFunction`,
            //
            "设置卡牌选择数量": `set;"selectCard";intoFunction`,
            "设置卡牌限制条件": `set;"filterCard";intoFunction`,
            //
            "设置为强制发动": `set;"forced";true`,
        },
        set_judge: {
            "设置判定回调": `set;"callback";intoFunction`,
            "设置判定回调跟随技能": `set;"callback";get.info(\\skillID).judgeCallback`,
            //
            "设置判定收益": `set;"judge";intoFunction`,
            "设置红桃作为判定唯一正收益": `set;"judge";card=>get.suit(card)==="heart"?1:-2`,
            "设置黑桃作为判定唯一正收益": `set;"judge";card=>get.suit(card)==="spade"?1:-2`,
            "设置梅花作为判定唯一正收益": `set;"judge";card=>get.suit(card)==="club"?1:-2`,
            "设置方片作为判定唯一正收益": `set;"judge";card=>get.suit(card)==="diamond"?1:-2`,
            "设置红色作为判定唯一正收益": `set;"judge;card=>get.color(card)==="red"?1:-2`,
            "设置黑色作为判定唯一正收益": `set;"judge";card=>get.color(card)==="black"?1:-2`,
            "设置红桃作为判定唯一负收益": `set;"judge";card=>get.suit(card)==="heart"?-2:2`,
            "设置黑桃作为判定唯一负收益": `set;"judge";card=>get.suit(card)==="spade"?-2:2`,
            "设置梅花作为判定唯一负收益": `set;"judge";card=>get.suit(card)==="club"?-2:2`,
            "设置方片作为判定唯一负收益": `set;"judge";card=>get.suit(card)==="diamond"?-2:2`,
            "设置红色作为判定唯一负收益": `set;"judge;card=>get.color(card)==="red"?-2:2`,
            "设置黑色作为判定唯一负收益": `set;"judge";card=>get.color(card)==="black"?-2:2`,
            //
            "设置判定生效结果": `set;"judge2";intoFunction`,
            "设置判定生效结果与收益相反": `set;"judge2";result=>result.bool===false?true:false`,
            "设置判定生效结果与收益相同": `set;"judge2";result=>result.bool`,
        },
        event_withArg: {
            ...getMapOfgetParent(),
        },
        trigger_type: {
            '你': 'player',
            '每名角色': 'global',
            '场上一名角色': 'global',
            '场上一位角色': 'global',
            '一名角色': 'global',
            '一位角色': 'global',
        },
        trigger_only: {
            '攻击范围包含你的角色': "filterPlayer=inRangeOf:global",
            '在你攻击范围内的角色': "filterPlayer=inRange:global",
            '你攻击范围内的角色': "filterPlayer=inRange:global",
            '其他角色': "filterPlayer=other:global",
        },
        triggerList: {
            ...getMapOfTri_Target(),
            ...getMapOfTri_Use(),
            ...getMapOfTri_damageSource(),

            "游戏开始时": "enterGame",
            "每轮开始时": "roundStart",
            "一轮游戏开始时": "roundStart",

            "回合前": "phaseBefore",
            "回合开始后2": "phaseBeforeStart",
            "回合开始后4": "phaseBeforeEnd",
            "回合开始后7": "phaseBeginStart",
            "回合开始": "phaseBegin",
            "回合开始后9": "phaseBegin",
            "阶段改变时": "phaseChange",
            "阶段更改时": "phaseChange",
            "回合结束": "phaseEnd",
            "回合后": "phaseAfter",
            "回合结算后": "phaseAfter",

            "准备阶段前": "phaseZhunbeiBefore",
            "准备阶段": "phaseZhunbeiBegin",
            "准备阶段开始": "phaseZhunbeiBegin",
            "准备阶段结束": "phaseZhunbeiEnd",
            "准备阶段后": "phaseZhunbeiAfter",
            "准备阶段结算后": "phaseZhunbeiAfter",

            "判定阶段前": "phaseJudgeBefore",
            "判定阶段开始": "phaseJudgeBegin",
            "判定阶段结束": "phaseJudgeEnd",
            "判定阶段后": "phaseJudgeAfter",
            "判定阶段结算后": "phaseJudgeAfter",

            "摸牌阶段前": "phaseDrawBefore",
            "摸牌阶段开始": "phaseDrawBegin",
            "摸牌阶段开始时1": "phaseDrawBegin1",
            "摸牌阶段开始时2": "phaseDrawBegin2",
            "摸牌阶段": "phaseDrawBegin",
            "摸牌阶段1": "phaseDrawBegin1",
            "摸牌阶段2": "phaseDrawBegin2",
            "摸牌阶段结束": "phaseDrawEnd",
            "摸牌阶段后": "phaseDrawAfter",
            "摸牌阶段结算后": "phaseDrawAfter",

            "出牌阶段前": "phaseUseBefore",
            "出牌阶段开始": "phaseUseBegin",
            "出牌阶段结束": "phaseUseEnd",
            "出牌阶段后": "phaseUseAfter",
            "出牌阶段结算后": "phaseUseAfter",
            //
            "出牌阶段开始时和结束时": "phaseUseBegin|phaseUseEnd",

            "弃牌阶段前": "phaseDiscardBefore",
            //参见吕蒙修改
            "弃牌阶段开始": "phaseDiscardBefore",
            "弃牌阶段": "phaseDiscardBegin",
            "弃牌阶段结束": "phaseDiscardEnd",
            "弃牌阶段后": "phaseDiscardAfter",
            "弃牌阶段结算后": "phaseDiscardAfter",

            "结束阶段前": "phaseJieShuBefore",
            "结束阶段开始": "phaseJieShuBegin",
            "结束阶段": "phaseJieshuBegin",
            "结束阶段开始": "phaseJieshuBegin",
            "结束阶段结束": "phaseJieShuEnd",
            "结束阶段后": "phaseJieShuAfter",
            "结束阶段结算后": "phaseJieShuAfter",

            //阶段跳过类
            "准备阶段跳过后": "phaseZhunbeiSkipped",
            "判定阶段跳过后": "phaseJudgeSkipped",
            "摸牌阶段跳过后": "phaseDrawSkipped",
            "出牌阶段跳过后": "phaseUseSkipped",
            "弃牌阶段跳过后": "phaseDiscardSkipped",
            "结束阶段跳过后": "phaseJieShuSkipped",

            //阶段取消类
            "准备阶段取消后": "phaseZhunbeiCancelled",
            "判定阶段取消后": "phaseJudgeCancelled",
            "摸牌阶段取消后": "phaseDrawCancelled",
            "出牌阶段取消后": "phaseUseCancelled",
            "弃牌阶段取消后": "phaseDiscardCancelled",
            "结束阶段取消后": "phaseJieShuCancelled",
            //
            "跳过准备阶段后": "phaseZhunbeiSkipped|phaseZhunbeiCancelled",
            "跳过判定阶段后": "phaseJudgeSkipped|phaseJudgeCancelled",
            "跳过摸牌阶段后": "phaseDrawSkipped|phaseDrawCancelled",
            "跳过出牌阶段后": "phaseUseSkipped|phaseUseCancelled",
            "跳过弃牌阶段后": "phaseDiscardSkipped|phaseDiscardCancelled",
            "跳过结束阶段后": "phaseJieShuSkipped|phaseJieShuCancelled",

            "摸牌前": "drawBefore",
            "摸牌开始": "drawBegin",
            "摸牌时": "drawBegin",
            "摸牌结束": "drawEnd",
            "摸牌后": "drawAfter",
            "摸牌结算后": "drawAfter",
            "令一名角色摸牌时": "source:drawBegin",
            "令一名角色摸牌结束": "source:drawEnd",
            "令一名角色摸牌前": "source:drawBefore",
            "令一名角色摸牌后": "source:drawAfter",

            "判定前": "judgeBefore",
            "判定开始": "judgeBegin",
            "判定牌生效前": "judge",
            "判定牌生效后": "judgeEnd",
            "判定结束": "judgeEnd",
            "判定后": "judgeAfter",
            "判定结算后": "judgeAfter",
            "令一名角色判定时": "source:judgeBegin",
            "令一名角色判定结束": "source:judgeEnd",
            "令一名角色判定前": "source:judgeBefore",
            "令一名角色判定后": "source:judgeAfter",

            "打出牌前": "respondBefore",
            "打出牌开始": "respondBegin",
            "打出牌时": "respond",
            "打出牌结束": "respondEnd",
            "打出牌后": "respondAfter",
            "打出牌结算后": "respondAfter",
            "令一名角色响应牌时": "source:respondBegin",
            "令一名角色响应牌结束": "source:respondEnd",
            "令一名角色响应牌前": "source:respondBefore",
            "令一名角色响应牌后": "source:respondAfter",
            "令一名角色打出牌时": "source:respondBegin",
            "令一名角色打出牌结束": "source:respondEnd",
            "令一名角色打出牌前": "source:respondBefore",
            "令一名角色打出牌后": "source:respondAfter",
            //
            "打出杀前": "sha:respondBefore",
            "打出杀开始": "sha:respondBegin",
            "打出杀时": "sha:respond",
            "打出杀结束": "sha:respondEnd",
            "打出杀后": "sha:respondAfter",
            "打出杀结算后": "sha:respondAfter",
            "打出闪前": "shan:respondBefore",
            "打出闪开始": "shan:respondBegin",
            "打出闪时": "shan:respond",
            "打出闪结束": "shan:respondEnd",
            "打出闪后": "shan:respondAfter",
            "打出闪结算后": "shan:respondAfter",


            "使用牌前": "useCardBefore",
            "使用牌开始": "useCardBegin",
            "使用卡牌0": "useCard0",
            "使用卡牌1": "useCard1",
            //参看神张飞巡使
            '使用牌选择目标后': "useCard2",
            "使用卡牌2": "useCard2",
            "使用牌时": "useCard",
            '使用牌指定目标时': "useCardToPlayer",
            '使用牌指定目标后': "useCardToPlayered",
            "使用牌结束": "useCardEnd",
            "使用牌后": "useCardAfter",
            "使用牌结算后": "useCardAfter",

            //
            "令一名角色使用牌开始": "source:useCardBegin",
            "令一名角色使用牌时": "source:useCard",
            "令一名角色使用牌结束": "source:useCardEnd",
            "令一名角色使用牌前": "source:useCardBefore",
            "令一名角色使用牌后": "source:useCardAfter",
            //
            '成为牌的目标时': "target:useCardToTarget",
            '成为牌的目标后': "target:useCardToTargeted",
            "对你使用牌时": "triTarget=player:useCardToTarget",
            "对你使用牌后": "triTarget=player:useCardToTargeted",
            "成为其他角色使用牌目标时": "target:triPlayer=other:useCardToTarget",
            "成为其他角色使用牌目标后": "target:triPlayer=other:useCardToTargeted",
            "使用牌指定你为目标时": "triTarget=player:useCardToPlayer",
            "使用牌指定你为目标后": "triTarget=player:useCardToPlayered",

            //使用打出联合事件
            "使用或打出牌前": "useCardBefore|respondBefore",
            "使用或打出牌开始": "useCardBegin|respondBegin",
            "使用或打出牌时": "useCard|respond",
            "使用或打出牌结束": "useCardEnd|respondEnd",
            "使用或打出牌后": "useCardAfter|respondAfter",
            "使用或打出牌结算后": "useCardAfter|respondAfter",


            "弃置牌前": "discardBefore",
            "弃置牌开始": "discardBegin",
            "弃置牌时": "discardBegin",
            "弃置牌结束": "discardEnd",
            "弃置牌后": "discardAfter",
            "弃置牌结算后": "discardAfter",
            "令一名角色弃置牌时": "source:discardBegin",
            "令一名角色弃置牌结束": "source:discardEnd",
            "令一名角色弃置牌前": "source:discardBefore",
            "令一名角色弃置牌后": "source:discardAfter",

            "获得牌前": "gainBefore",
            "获得牌开始": "gainBegin",
            "获得牌时": "gainBegin",
            "获得牌结束": "gainEnd",
            "获得牌后": "gainAfter",
            "获得牌结算后": "gainAfter",
            "令一名角色获得牌时": "source:gainBegin",
            "令一名角色获得牌结束": "source:gainEnd",
            "令一名角色获得牌前": "source:gainBefore",
            "令一名角色获得牌后": "source:gainAfter",

            "失去牌前": "loseBefore",
            "失去牌开始": "loseBegin",
            "失去牌时": "loseBegin",
            "失去牌结束": "loseEnd",
            "失去牌后": "loseAfter",
            "失去牌结算后": "loseAfter",
            "令一名角色失去牌时": "source:loseBegin",
            "令一名角色失去牌结束": "source:loseEnd",
            "令一名角色失去牌前": "source:loseBefore",
            "令一名角色失去牌后": "source:loseAfter",
            //
            "失去最后牌后": "noCard=he:loseAfter",
            "失去最后一张牌后": "noCard=he:loseAfter",
            "失去最后牌时": "noCard=he:loseAfter",
            "失去最后一张牌时": "noCard=he:loseAfter",
            //
            "失去最后手牌后": "h:noCard=h:loseAfter",
            "失去最后一张手牌后": "h:noCard=h:loseAfter",
            "失去最后手牌时": "h:noCard=h:loseAfter",
            "失去最后一张手牌时": "h:noCard=h:loseAfter",
            "失去手牌后": "h:loseAfter",
            "失去最后装备区牌后": "e:noCard=e:loseAfter",
            "失去最后一张装备区牌后": "e:noCard=e:loseAfter",
            "失去最后装备区牌时": "e:noCard=e:loseAfter",
            "失去最后一张装备区牌时": "e:noCard=e:loseAfter",
            "失去装备区牌后": "e:loseAfter",
            "失去最后判定区牌后": "j:noJudge=j:loseAfter",
            "失去最后一张判定区牌时": "j:noJudge=j:loseAfter",
            "失去最后判定区牌时": "j:noJudge=j:loseAfter",
            "失去最后一张判定区牌后": "j:noJudge=j:loseAfter",
            "失去判定区牌后": "j:loseAfter",

            //
            "于弃牌阶段弃牌后": "loseFor=discardInDiscardPhase:loseAfter",
            "于弃牌阶段弃置牌后": "loseFor=discardInDiscardPhase:loseAfter",
            "牌不因使用而进入弃牌堆后": "loseFor=noUseToDiscardPile:loseAfter",
            "牌不因使用进入弃牌堆后": "loseFor=noUseToDiscardPile:loseAfter",
            "牌因弃置而进入弃牌堆后": "loseFor=discardToDiscardPile:loseAfter",
            "牌因弃置进入弃牌堆后": "loseFor=discardToDiscardPile:loseAfter",


            "不属于任何角色牌进入弃牌堆后": "cardsDiscardAfter",
            "牌因判定进入弃牌堆后": "cardsDiscardFor=judge:cardsDiscardAfter",
            "牌因判定而进入弃牌堆后": "cardsDiscardFor=judge:cardsDiscardAfter",

            "牌置入装备区前": "equipBefore",
            "牌置入装备区开始": "equipBegin",
            "牌置入装备区时": "equipBegin",
            "牌置入装备区结束": "equipEnd",
            "牌置入装备区后": "equipAfter",
            "牌置入装备区结算后": "equipAfter",
            "令一名角色牌置入装备区时": "source:equipBegin",
            "令一名角色牌置入装备区结束": "source:equipEnd",
            "令一名角色牌置入装备区前": "source:equipBefore",
            "令一名角色牌置入装备区后": "source:equipAfter",


            "牌进入判定区前": "addJudgeBefore",
            "牌进入判定区开始": "addJudgeBegin",
            "牌进入判定区时": "addJudgeBegin",
            "牌进入判定区结束": "addJudgeEnd",
            "牌进入判定区后": "addJudgeAfter",
            "牌进入判定区结算后": "addJudgeAfter",
            "令一名角色牌进入判定区时": "source:addJudgeBegin",
            "令一名角色牌进入判定区结束": "source:addJudgeEnd",
            "令一名角色牌进入判定区前": "source:addJudgeBefore",
            "令一名角色牌进入判定区后": "source:addJudgeAfter",
            "牌置入判定区前": "addJudgeBefore",
            "牌置入判定区开始": "addJudgeBegin",
            "牌置入判定区时": "addJudgeBegin",
            "牌置入判定区结束": "addJudgeEnd",
            "牌置入判定区后": "addJudgeAfter",
            "牌置入判定区结算后": "addJudgeAfter",
            "令一名角色牌置入判定区时": "source:addJudgeBegin",
            "令一名角色牌置入判定区结束": "source:addJudgeEnd",
            "令一名角色牌置入判定区前": "source:addJudgeBefore",
            "令一名角色牌置入判定区后": "source:addJudgeAfter",

            "置于武将牌上前": "addToExpansionBefore",
            "置于武将牌上开始": "addToExpansionBegin",
            "置于武将牌上时": "addToExpansionBegin",
            "置于武将牌上结束": "addToExpansionEnd",
            "置于武将牌上后": "addToExpansionAfter",
            "置于武将牌上结算后": "addToExpansionAfter",
            "令一名角色置于武将牌上时": "source:addToExpansionBegin",
            "令一名角色置于武将牌上结束": "source:addToExpansionEnd",
            "令一名角色置于武将牌上前": "source:addToExpansionBefore",
            "令一名角色置于武将牌上后": "source:addToExpansionAfter",
            //
            "将牌置于武将牌上前": "addToExpansionBefore",
            "将牌置于武将牌上开始": "addToExpansionBegin",
            "将牌置于武将牌上时": "addToExpansionBegin",
            "将牌置于武将牌上结束": "addToExpansionEnd",
            "将牌置于武将牌上后": "addToExpansionAfter",
            "将牌置于武将牌上结算后": "addToExpansionAfter",
            "令一名角色将牌置于武将牌上时": "source:addToExpansionBegin",
            "令一名角色将牌置于武将牌上结束": "source:addToExpansionEnd",
            "令一名角色将牌置于武将牌上前": "source:addToExpansionBefore",
            "令一名角色将牌置于武将牌上后": "source:addToExpansionAfter",

            "回复体力前": "recoverBefore",
            "回复体力开始": "recoverBegin",
            //参看shushen
            "回复体力时": "recoverAfter",
            "回复体力结束": "recoverEnd",
            "回复体力后": "recoverAfter",
            "回复体力结算后": "recoverAfter",
            "回复体力值前": "recoverBefore",
            "回复体力值开始": "recoverBegin",
            "回复体力值时": "recoverAfter",
            "回复体力值结束": "recoverEnd",
            "回复体力值后": "recoverAfter",
            "回复体力值结算后": "recoverAfter",
            "令一名角色回复体力时": "source:recoverAfter",
            "令一名角色回复体力结束": "source:recoverEnd",
            "令一名角色回复体力前": "source:recoverBefore",
            "令一名角色回复体力后": "source:recoverAfter",
            "令一名角色回复体力值时": "source:recoverAfter",
            "令一名角色回复体力值结束": "source:recoverEnd",
            "令一名角色回复体力值前": "source:recoverBefore",
            "令一名角色回复体力值后": "source:recoverAfter",

            "受伤前": "damageBefore",
            "即将受到伤害时": "damageBefore",
            "受伤开始": "damageBegin",
            "伤害开始时1": "damageBegin1",
            "伤害开始时2": "damageBegin2",
            "伤害开始时3": "damageBegin3",
            "伤害开始时4": "damageBegin4",
            "受伤时": "damageBegin",
            "受伤结束": "damageEnd",
            "受伤后": "damageAfter",
            "受伤结算后": "damageAfter",
            "受到伤害前": "damageBefore",
            "受到伤害开始": "damageBegin",
            "受到伤害时": "damageBegin",
            "受到伤害结束": "damageEnd",
            "受到伤害后": "damageEnd",
            "受到伤害结算后": "damageAfter",
            //
            "造成伤害前": "source:damageBefore",
            "即将造成伤害时": "source:damageBefore",
            "造成伤害开始": "source:damageBegin",
            '造成伤害时1': "source:damageBegin1",
            '造成伤害时2': "source:damageBegin2",
            '造成伤害时3': "source:damageBegin3",
            '造成伤害时4': "source:damageBegin4",
            '造成伤害时': 'damageBegin',
            '造成伤害后': 'damageSource',
            "令一名角色受伤时": "source:damageBegin",
            "令一名角色受伤结束": "source:damageEnd",
            "令一名角色受伤前": "source:damageBefore",
            "令一名角色受伤后": "source:damageAfter",
            "令一名角色受到伤害时": "source:damageBegin",
            "令一名角色受到伤害结束": "source:damageEnd",
            "令一名角色受到伤害前": "source:damageBefore",
            "令一名角色受到伤害后": "source:damageAfter",
            "受到零点伤害时": "damageZero",
            "受到0点伤害时": "damageZero",
            //
            '牌造成伤害时1': "source:yescard:triPlayer=other:damageBegin1",
            '牌造成伤害时2': "source:yescard:triPlayer=other:damageBegin2",
            '牌造成伤害时3': "source:yescard:triPlayer=other:damageBegin3",
            '牌造成伤害时4': "source:yescard:triPlayer=other:damageBegin4",
            '牌造成伤害后': "source:yescard:triPlayer=other:damageEnd",
            //
            '使用牌造成伤害时': "source:yescard:triPlayer=other:damageBegin",
            '使用牌造成伤害时1': "source:yescard:triPlayer=other:damageBegin1",
            '使用牌造成伤害时2': "source:yescard:triPlayer=other:damageBegin2",
            '使用牌造成伤害时3': "source:yescard:triPlayer=other:damageBegin3",
            '使用牌造成伤害时4': "source:yescard:triPlayer=other:damageBegin4",
            '使用牌造成伤害后': "source:yescard:triPlayer=other:damageEnd",
            //
            '受到或造成伤害后': "damageEnd|damageSource",
            '造成或受到伤害后': "damageEnd|damageSource",
            '受到或造成伤害结算后': "damageAfter|damageSource",
            '造成或受到伤害结算后': "damageAfter|damageSource",

            "失去体力前": "loseHpBefore",
            "失去体力开始": "loseHpBegin",
            "失去体力时": "loseHpBegin",
            "失去体力结束": "loseHpEnd",
            "失去体力后": "loseHpAfter",
            "失去体力结算后": "loseHpAfter",
            "失去体力值前": "loseHpBefore",
            "失去体力值开始": "loseHpBegin",
            "失去体力值时": "loseHpBegin",
            "失去体力值结束": "loseHpEnd",
            "失去体力值后": "loseHpAfter",
            "失去体力值结算后": "loseHpAfter",
            "令一名角色失去体力时": "source:loseHpBegin",
            "令一名角色失去体力结束": "source:loseHpEnd",
            "令一名角色失去体力前": "source:loseHpBefore",
            "令一名角色失去体力后": "source:loseHpAfter",
            "令一名角色失去体力值时": "source:loseHpBegin",
            "令一名角色失去体力值结束": "source:loseHpEnd",
            "令一名角色失去体力值前": "source:loseHpBefore",
            "令一名角色失去体力值后": "source:loseHpAfter",

            "失去体力上限前": "loseMaxHpBefore",
            "失去体力上限开始": "loseMaxHpBegin",
            "失去体力上限时": "loseMaxHpBegin",
            "失去体力上限结束": "loseMaxHpEnd",
            "失去体力上限后": "loseMaxHpAfter",
            "失去体力上限结算后": "loseMaxHpAfter",
            "减少体力上限前": "loseMaxHpBefore",
            "减少体力上限开始": "loseMaxHpBegin",
            "减少体力上限时": "loseMaxHpBegin",
            "减少体力上限结束": "loseMaxHpEnd",
            "减少体力上限后": "loseMaxHpAfter",
            "减少体力上限结算后": "loseMaxHpAfter",
            "令一名角色失去体力上限时": "source:loseMaxHpBegin",
            "令一名角色失去体力上限结束": "source:loseMaxHpEnd",
            "令一名角色失去体力上限前": "source:loseMaxHpBefore",
            "令一名角色失去体力上限后": "source:loseMaxHpAfter",
            "令一名角色减少体力上限时": "source:loseMaxHpBegin",
            "令一名角色减少体力上限结束": "source:loseMaxHpEnd",
            "令一名角色减少体力上限前": "source:loseMaxHpBefore",
            "令一名角色减少体力上限后": "source:loseMaxHpAfter",

            "增加体力上限前": "gainMaxHpBefore",
            "增加体力上限开始": "gainMaxHpBegin",
            "增加体力上限时": "gainMaxHpBegin",
            "增加体力上限结束": "gainMaxHpEnd",
            "增加体力上限后": "gainMaxHpAfter",
            "增加体力上限结算后": "gainMaxHpAfter",
            "获得体力上限前": "gainMaxHpBefore",
            "获得体力上限开始": "gainMaxHpBegin",
            "获得体力上限时": "gainMaxHpBegin",
            "获得体力上限结束": "gainMaxHpEnd",
            "获得体力上限后": "gainMaxHpAfter",
            "获得体力上限结算后": "gainMaxHpAfter",
            "令一名角色增加体力上限时": "source:gainMaxHpBegin",
            "令一名角色增加体力上限结束": "source:gainMaxHpEnd",
            "令一名角色增加体力上限前": "source:gainMaxHpBefore",
            "令一名角色增加体力上限后": "source:gainMaxHpAfter",
            "令一名角色获得体力上限时": "source:gainMaxHpBegin",
            "令一名角色获得体力上限结束": "source:gainMaxHpEnd",
            "令一名角色获得体力上限前": "source:gainMaxHpBefore",
            "令一名角色获得体力上限后": "source:gainMaxHpAfter",

            "横置或重置前": "linkBefore",
            "横置或重置开始": "linkBegin",
            "横置或重置时": "linkBegin",
            "横置或重置结束": "linkEnd",
            "横置或重置后": "linkAfter",
            "横置或重置结算后": "linkAfter",
            "令一名角色横置或重置时": "source:linkBegin",
            "令一名角色横置或重置结束": "source:linkEnd",
            "令一名角色横置或重置前": "source:linkBefore",
            "令一名角色横置或重置后": "source:linkAfter",
            //
            "横置前": "linked=false:linkBefore",
            "横置开始": "linked=false:linkBegin",
            "横置时": "linked=false:linkBegin",
            "横置结束": "linked=false:linkEnd",
            "横置后": "linked=false:linkAfter",
            "横置结算后": "linked=false:linkAfter",
            "令一名角色横置时": "source:linked=false:linkBegin",
            "令一名角色横置结束": "source:linked=false:linkEnd",
            "令一名角色横置前": "source:linked=false:linkBefore",
            "令一名角色横置后": "source:linked=false:linkAfter",
            //
            "重置前": "linked=true:linkBefore",
            "重置开始": "linked=true:linkBegin",
            "重置时": "linked=true:linkBegin",
            "重置结束": "linked=true:linkEnd",
            "重置后": "linked=true:linkAfter",
            "重置结算后": "linked=true:linkAfter",
            "令一名角色重置时": "source:linked=true:linkBegin",
            "令一名角色重置结束": "source:linked=true:linkEnd",
            "令一名角色重置前": "source:linked=true:linkBefore",
            "令一名角色重置后": "source:linked=true:linkAfter",

            "翻面前": "turnOverBefore",
            "翻面开始": "turnOverBegin",
            "翻面时": "turnOverBegin",
            "翻面结束": "turnOverEnd",
            "翻面后": "turnOverAfter",
            "翻面结算后": "turnOverAfter",
            "武将牌翻面前": "turnOverBefore",
            "武将牌翻面开始": "turnOverBegin",
            "武将牌翻面时": "turnOverBegin",
            "武将牌翻面结束": "turnOverEnd",
            "武将牌翻面后": "turnOverAfter",
            "武将牌翻面结算后": "turnOverAfter",
            "令一名角色翻面时": "source:turnOverBegin",
            "令一名角色翻面结束": "source:turnOverEnd",
            "令一名角色翻面前": "source:turnOverBefore",
            "令一名角色翻面后": "source:turnOverAfter",
            "令一名角色武将牌翻面时": "source:turnOverBegin",
            "令一名角色武将牌翻面结束": "source:turnOverEnd",
            "令一名角色武将牌翻面前": "source:turnOverBefore",
            "令一名角色武将牌翻面后": "source:turnOverAfter",

            '进入濒死状态时': 'dying',
            '脱离濒死状态时': 'dyingAfter',
            "死亡前": "dieBefore",
            "死亡开始": "dieBegin",
            "死亡时": "dieBegin",
            "死亡结束": "dieEnd",
            "死亡后": "dieAfter",
            "死亡结算后": "dieAfter",
            '杀死一名角色后': 'source:dieAfter',
            '令一名角色进入濒死状态': "source:dying",
            "令一名角色死亡时": "source:dieBegin",
            "令一名角色死亡结束": "source:dieEnd",
            "令一名角色死亡前": "source:dieBefore",
            "令一名角色死亡后": "source:dieAfter",

            "获得技能前": "addSkills:changeSkillsBefore",
            "获得技能开始": "addSkills:changeSkillsBegin",
            "获得技能时": "addSkills:changeSkillsBegin",
            "获得技能结束": "addSkills:changeSkillsEnd",
            "获得技能后": "addSkills:changeSkillsAfter",
            "获得技能结算后": "addSkills:changeSkillsAfter",
            "令一名角色获得技能时": "source:addSkills:changeSkillsBegin",
            "令一名角色获得技能结束": "source:addSkills:changeSkillsEnd",
            "令一名角色获得技能前": "source:addSkills:changeSkillsBefore",
            "令一名角色获得技能后": "source:addSkills:changeSkillsAfter",

            "失去技能前": "removeSkills:changeSkillsBefore",
            "失去技能开始": "removeSkills:changeSkillsBegin",
            "失去技能时": "removeSkills:changeSkillsBegin",
            "失去技能结束": "removeSkills:changeSkillsEnd",
            "失去技能后": "removeSkills:changeSkillsAfter",
            "失去技能结算后": "removeSkills:changeSkillsAfter",
            "令一名角色失去技能时": "source:removeSkills:changeSkillsBegin",
            "令一名角色失去技能结束": "source:removeSkills:changeSkillsEnd",
            "令一名角色失去技能前": "source:removeSkills:changeSkillsBefore",
            "令一名角色失去技能后": "source:removeSkills:changeSkillsAfter",

            //
            "技能数改变前": "changeSkillsBefore",
            "技能数改变开始": "changeSkillsBegin",
            "技能数改变时": "changeSkillsBegin",
            "技能数改变结束": "changeSkillsEnd",
            "技能数改变后": "changeSkillsAfter",
            "技能数改变结算后": "changeSkillsAfter",
            "令一名角色技能数改变时": "source:changeSkillsBegin",
            "令一名角色技能数改变结束": "source:changeSkillsEnd",
            "令一名角色技能数改变前": "source:changeSkillsBefore",
            "令一名角色技能数改变后": "source:changeSkillsAfter",

            "发动非锁定技时": "useSkillFilter=noLocked:useSkill|logSkillBegin",
            "发动锁定技时": "useSkillFilter=isLocked:useSkill|logSkillBegin",
            "发动技能时": "useSkill|logSkillBegin",
            "发动非锁定技后": "useSkillFilter=noLocked:useSkill|logSkillAfter",
            "发动锁定技后": "useSkillFilter=isLocked:useSkill|logSkillAfter",
            "发动技能后": "useSkill|logSkillAfter",

            "使用技能时": "useSkill",
            //牌事件
            "洗牌时": "washCard",
            "应变时": "yingbian",
            '牌被弃置后': 'discard:loseAfter',
            //
            "杀造成伤害时": "shaDamage",
            "杀命中时": "shaHit",
            "杀未命中时": "shaMiss",
            //
            '发起拼点后': "chooseToCompareAfter|compareMultipleAfter",
            '回应拼点后': "target:chooseToCompareAfter|compareMultipleAfter",
            '拼点后': "target+:chooseToCompareAfter|compareMultipleAfter",
            '亮出拼点牌前': 'compareCardShowBefore',

            //使用打出事件
            '需要打出闪时': 'respondName=shan:chooseToRespondBefore',
            '需要使用闪时': 'respondName=shan:chooseToUseBefore',
            '需要打出杀时': 'respondName=sha:chooseToRespondBefore',
        },
        game_method: {
            '创卡': 'createCard',
            '造卡': 'createCard',
            '印卡': 'createCard',
            '更新轮数': 'updateRoundNumber',
            '暂停': 'pause',
            '继续': 'resume',
            '局终': 'over',
            '重启': 'reload',
            '移至处理区': "cardsGotoOrdering",
            '卡牌移至处理区': "cardsGotoOrdering",
            '同时失去牌': "loseAsync",
            '日志': "log"
        },
        game_withArg: {
            '胜利': 'over;true',
            '失败': 'over;false',
            "统计场上势力数": "countGroup;",
            "统计场上男性数量": `countPlayer;cur=>cur.hasSex("male")`,
            "统计场上女性数量": `countPlayer;cur=>cur.hasSex("female")`,
            "统计场上其他男性数量": `countPlayer;cur=>cur.hasSex("male")&&cur!=player`,
            "统计场上其他女性数量": `countPlayer;cur=>cur.hasSex("female")&&cur!=player`,
            "统计场上魏势力角色数量": `countPlayer;cur=>cur.group!="wei"`,
            "统计场上蜀势力角色数量": `countPlayer;cur=>cur.group!="shu"`,
            "统计场上吴势力角色数量": `countPlayer;cur=>cur.group!="wu"`,
            "统计场上群势力角色数量": `countPlayer;cur=>cur.group!="qun"`,
            "统计场上晋势力角色数量": `countPlayer;cur=>cur.group!="jin"`,
            "统计场上神势力角色数量": `countPlayer;cur=>cur.group!="shen"`,
            "统计场上西势力角色数量": `countPlayer;cur=>cur.group!="western"`,
            "统计场上键势力角色数量": `countPlayer;cur=>cur.group!="key"`,
            "统计场上其他魏势力角色数量": `countPlayer;cur=>cur.group!="wei"&&cur!=player`,
            "统计场上其他蜀势力角色数量": `countPlayer;cur=>cur.group!="shu"&&cur!=player`,
            "统计场上其他吴势力角色数量": `countPlayer;cur=>cur.group!="wu"&&cur!=player`,
            "统计场上其他群势力角色数量": `countPlayer;cur=>cur.group!="qun"&&cur!=player`,
            "统计场上其他晋势力角色数量": `countPlayer;cur=>cur.group!="jin"&&cur!=player`,
            "统计场上其他神势力角色数量": `countPlayer;cur=>cur.group!="shen"&&cur!=player`,
            "统计场上其他西势力角色数量": `countPlayer;cur=>cur.group!="western"&&cur!=player`,
            "统计场上其他键势力角色数量": `countPlayer;cur=>cur.group!="key"&&cur!=player`,
        },
        lib_filter: {
            '非我过滤': "lib.filter.notMe",
            '唯我过滤': "lib.filter.isMe",
        },
        step: {
            ...getMapOfStep()
        },
        quantifier: {
            "1张": "1",
            "一张": "1",
            "1名": "1",
            "一名": "1",
            "1点": "1",
            "一点": "1",
            "1枚": "1",
            "一枚": "1",
            "2张": "2",
            '二张': "2",
            "两张": "2",
            "2名": "2",
            '二名': "2",
            "两名": "2",
            "2点": "2",
            '二点': "2",
            "两点": "2",
            "2枚": "2",
            "两枚": "2",
            "3张": "3",
            "三张": "3",
            "3名": "3",
            "三名": "3",
            "3点": "3",
            "三点": "3",
            "3枚": "3",
            "三枚": "3",
            "4张": "4",
            "四张": "4",
            "4名": "4",
            "四名": "4",
            "4点": "4",
            "四点": "4",
            "4枚": "4",
            "四枚": "4",
            "5张": "5",
            "五张": "5",
            "5名": "5",
            "五名": "5",
            "5点": "5",
            "五点": "5",
            "5枚": "5",
            "五枚": "5",
            "6张": "6",
            "六张": "6",
            "6名": "6",
            "六名": "6",
            "6点": "6",
            "六点": "6",
            "6枚": "6",
            "六枚": "6",
            "7张": "7",
            "七张": "7",
            "7名": "7",
            "七名": "7",
            "7点": "7",
            "七点": "7",
            "7枚": "7",
            "七枚": "7",
            "8张": "8",
            "八张": "8",
            "8名": "8",
            "八名": "8",
            "8点": "8",
            "八点": "8",
            "8枚": "8",
            "八枚": "8",
            "9张": "9",
            "九张": "9",
            "9名": "9",
            "九名": "9",
            "9点": "9",
            "九点": "9",
            "9枚": "9",
            "九枚": "9",
            "b点": "b",
            "B点": "B",
            "b张": "b",
            "B张": "B",
            "b名": "b",
            "B名": "B",
            "b枚": "b",
            "B枚": "B",
            "c点": "c",
            "C点": "C",
            "c张": "c",
            "C张": "C",
            "c名": "c",
            "C名": "C",
            "c枚": "c",
            "C枚": "C",
            "d点": "d",
            "D点": "D",
            "d张": "d",
            "D张": "D",
            "d名": "d",
            "D名": "D",
            "d枚": "d",
            "D枚": "D",
            "f点": "f",
            "F点": "F",
            "f张": "f",
            "F张": "F",
            "f名": "f",
            "F名": "F",
            "f枚": "f",
            "F枚": "F",
            "g点": "g",
            "G点": "G",
            "g张": "g",
            "G张": "G",
            "g名": "g",
            "G名": "G",
            "g枚": "g",
            "G枚": "G",
            "h点": "h",
            "H点": "H",
            "h张": "h",
            "H张": "H",
            "h名": "h",
            "H名": "H",
            "h枚": "h",
            "H枚": "H",
            "l点": "l",
            "L点": "L",
            "l张": "l",
            "L张": "L",
            "l名": "l",
            "L名": "L",
            "l枚": "l",
            "L枚": "L",
            "m点": "m",
            "M点": "M",
            "m张": "m",
            "M张": "M",
            "m名": "m",
            "M名": "M",
            "m枚": "m",
            "M枚": "M",
            "n点": "n",
            "N点": "N",
            "n张": "n",
            "N张": "N",
            "n名": "n",
            "N名": "N",
            "n枚": "n",
            "N枚": "N",
            "o点": "o",
            "O点": "O",
            "o张": "o",
            "O张": "O",
            "o名": "o",
            "O名": "O",
            "o枚": "o",
            "O枚": "O",
            "p点": "p",
            "P点": "P",
            "p张": "p",
            "P张": "P",
            "p名": "p",
            "P名": "P",
            "p枚": "p",
            "P枚": "P",
            "r点": "r",
            "R点": "R",
            "r张": "r",
            "R张": "R",
            "r名": "r",
            "R名": "R",
            "r枚": "r",
            "R枚": "R",
            "s点": "s",
            "S点": "S",
            "s张": "s",
            "S张": "S",
            "s名": "s",
            "S名": "S",
            "s枚": "s",
            "S枚": "S",
            "t点": "t",
            "T点": "T",
            "t张": "t",
            "T张": "T",
            "t名": "t",
            "T名": "T",
            "t枚": "t",
            "T枚": "T",
            "u点": "u",
            "U点": "U",
            "u张": "u",
            "U张": "U",
            "u名": "u",
            "U名": "U",
            "u枚": "u",
            "U枚": "U",
            "v点": "v",
            "V点": "V",
            "v张": "v",
            "V张": "V",
            "v名": "v",
            "V名": "V",
            "v枚": "v",
            "V枚": "V",
            "w点": "w",
            "W点": "W",
            "w张": "w",
            "W张": "W",
            "w名": "w",
            "W名": "W",
            "w枚": "w",
            "W枚": "W",
            "x点": "x",
            "X点": "X",
            "x张": "x",
            "X张": "X",
            "x名": "x",
            "X名": "X",
            "x枚": "x",
            "X枚": "X",
            "y点": "y",
            "Y点": "Y",
            "y张": "y",
            "Y张": "Y",
            "y名": "y",
            "Y名": "Y",
            "y枚": "y",
            "Y枚": "Y",
            "z点": "z",
            "Z点": "Z",
            "z张": "z",
            "Z张": "Z",
            "z名": "z",
            "Z名": "Z",
            "z枚": "z",
            "Z枚": "Z",

            "1个": "1",
            "一个": "1",
            "2个": "2",
            "两个": "2",
            "二个": "2",
            "3个": "3",
            "三个": "3",
            "4个": "4",
            "四个": "4",
            "5个": "5",
            "五个": "5",
            "6个": "6",
            "六个": "6",
            "7个": "7",
            "七个": "7",
            "8个": "8",
            "八个": "8",
            "9个": "9",
            "九个": "9",
            "B个": "B",
            "C个": "C",
            "D个": "D",
            "E个": "E",
            "F个": "F",
            "G个": "G",
            "H个": "H",
            "L个": "L",
            "M个": "M",
            "N个": "N",
            "O个": "O",
            "P个": "P",
            "R个": "R",
            "S个": "S",
            "T个": "T",
            "U个": "U",
            "V个": "V",
            "W个": "W",
            "X个": "X",
            "Y个": "Y",
            "Z个": "Z",
            "b个": "b",
            "c个": "c",
            "d个": "d",
            "e个": "e",
            "f个": "f",
            "g个": "g",
            "h个": "h",
            "l个": "l",
            "m个": "m",
            "n个": "n",
            "o个": "o",
            "p个": "p",
            "r个": "r",
            "s个": "s",
            "t个": "t",
            "u个": "u",
            "v个": "v",
            "w个": "w",
            "x个": "x",
            "y个": "y",
            "z个": "z"
        },
        suit: getMapOfSuit(),
        type: {
            ...getMapOfType(),
            "非延时锦囊牌": `"trick"`,
        },
        type2: {
            "锦囊牌": `"trick"`
        },
        subtype: {
            "武器牌": `"equip1"`,
            "防具牌": `"equip2"`,
            "+1马牌": `"equip3"`,
            "防御马牌": `"equip3"`,
            "-1马牌": `"equip4"`,
            "进攻马牌": `"equip4"`,
            "宝物牌": `"equip5"`,
        },
        color: getMapOfColor(),
        nature: {
            '火属性': '"fire"',
            '雷属性': '"thunder"',
            '冰属性': '"ice"',
        },
        cardName: getMapOfCard(),
        group: getMapOfGroup(),
        gender: {
            "男性": `"male"`,
            "女性": `"female"`,
            "双性": '"double"',
            "未知性": `"unknow"`
        },
        filter_only: {
            "不发动": "return false;",
            "发动": "return true;"
        },
        packed_playerCode: {
            '令触发事件的牌增加目标': "packed_playerCode_addTargets",
            '令触发事件的牌减少目标': "packed_playerCode_removeTargets",
            '令角色代为打出': 'packed_playerCode_sufferForAnother',
            '令角色代为使用': 'packed_playerCode_sufferForAnother',
            '令角色代为使用或打出': 'packed_playerCode_sufferForAnother',
            '本回合对角色造成伤害的次数': 'packed_playerCode_getDamagedThemTimes',
            '本回合出牌阶段使用某牌的次数': 'packed_playerCode_getUsedCardTimes',
            '本回合出牌阶段打出某牌的次数': 'packed_playerCode_getRespondedCardTimes',
        },
        packed_gameCode: {
            '同时获得牌': "packed_gameCode_gainAsync"
        },
    }
    static packedCodeRePlaceMap = {
        'packed_playerCode_sufferForAnother'(str) {
            let match = /(.+)\.packed_playerCode_sufferForAnother(\(.*\))/g;
            const groups = lib.group.map(group => `"${group}"`)
            return str.replace(match, function (match, ...p) {
                const player = p[0]
                const args = p[1].replace(/[\(\)]/g, '').split(",")
                let card;
                if (args.includes('"sha"')) card = 'sha'
                if (args.includes('"shan"')) card = 'shan'
                let result = '';
                result += `event.suffers = game.players\n`
                if (args.includes('other')) result += `.filter(each=>each!=player)\n`
                const sufferGroup = args.filter(arg => groups.includes(arg))
                if (sufferGroup.length) result += `.filter(each=>[${sufferGroup}].includes(each))\n`
                result += `event.sufferIndex = 0\n`
                result += `"step 1"\n`
                result += `var current = event.suffers[event.sufferIndex];\n`
                result += `if((current==game.me&&!_status.auto)\n`
                result += `||get.attitude(current,${player})>2\n`
                result += `||current.isOnline()){\n`
                result += `var next = current.chooseToRespond({name:"${card}"});\n`
                result += `next.set("prompt",'是否替'+get.translation(${player})+"打出一张${lib.translate[card]}");\n`
                result += `next.set('ai',()=>get.attitude(event.player,event.source)-2);\n`
                result += `next.set("skillwarn",'替'+get.translation(${player})+"打出一张${lib.translate[card]}");\n`
                result += `next.set("source",${player})\n`
                result += `next.autochoose=lib.filter.autoRespondShan\n`
                result += `}\n`
                result += `"step 2"\n`
                result += `if(result.bool){\n`
                result += `const current = event.suffers[event.sufferIndex];\n`
                result += `trigger.result = {\nbool:true,\ncard:{name:"${card}",isCard:true}\n}\n`
                result += `trigger.responded = true;\n`
                result += `trigger.animate = false;\n`
                result += `if(typeof current.ai.shown =="number"\n`
                result += `&&current.ai.shown<0.95){\n`
                result += `current.ai.shown=Math.min(current,ai.shown+0.3,0.95)\n`
                result += `}\n`
                result += `}\n`
                result += `else{\n`
                result += `if(++event.sufferIndex<event.suffers.length){\n`
                result += `event.goto(event.step-1);\n`
                result += `}\n`
                result += `}\n`
                return result;
            })
        },
        'packed_playerCode_getDamagedThemTimes'(str) {
            let match = /(.+)\.packed_playerCode_getDamagedThemTimes(\(.*\))/g;
            return str.replace(match, function (match, ...p) {
                const player = p[0]
                const args = p[1].replace(/[\(\)]/g, '').split(",")
                const targets = args.filter(item => Object.values(NonameCN.groupedList.player).includes(item));
                let result = '';
                result += `${player}.getHistory("sourceDamage",evt=>[${targets}].includes(evt.player)).length`
                return result;
            })
        },
        'loseAsync'(str) {
            let match = /(.+)\.loseAsync(\(.*\))/g;
            return str.replace(match, function (match, ...p) {
                if (p[1].startsWith('{')) return match;
                const args = p[1].replace(/[\(\)]/g, '').split(",").filter(arg => arg.length)
                const players = args.filter(arg => game.x19D6_judgeType(arg) === 'player')
                const cardsArray = args.remove(...players)
                const playerCardsPair = []
                for (let i = 0; i < players.length; i++) {
                    playerCardsPair.push(`[${players[i]},${cardsArray[i]}]`)
                }
                let result = '';
                result += `game.loseAsync({\n`
                if (playerCardsPair.length) result += `lose_list: [${playerCardsPair}] \n`
                result += `})\n`
                result += `.setContent("chooseToCompareLose")`
                return result;
            })
        },
        'packed_gameCode_gainAsync'(str) {
            let match = /(.+)\.packed_gameCode_gainAsync(\(.*\))/g;
            return str.replace(match, function (match, ...p) {
                if (p[1].startsWith('{')) return match;
                const args = p[1].replace(/[\(\)]/g, '').split(",").filter(arg => arg.length)
                const animate = args.find(arg => ['"draw"', '"gain2"'].includes(arg))
                const players = args.filter(arg => game.x19D6_judgeType(arg) === 'player')
                const player = players[0]
                const cardsArray = args.remove(animate, ...players)
                const playerCardsPair = []
                for (let i = 0; i < players.length; i++) {
                    playerCardsPair.push(`[${players[i]},${cardsArray[i]}]`)
                }
                let result = '';
                result += `game.loseAsync({\n`
                if (player) result += `player: ${player},\n`
                if (animate) result += `animate: ${animate},\n`
                if (playerCardsPair.length) result += `gain_list: [${playerCardsPair}]\n`
                result += `})\n`
                result += `.setContent("gaincardMultiple")`
                return result;
            })
        },
        'packed_playerCode_getUsedCardTimes'(str) {
            let match = /(.+)\.packed_playerCode_getUsedCardTimes(\(.*\))/g;
            return str.replace(match, function (match, ...p) {
                const player = p[0]
                const args = p[1].replace(/[\(\)]/g, '').split(",")
                const color = args.find(item => Object.values(NonameCN.groupedList.color).includes(item))
                const suit = args.find(item => Object.values(NonameCN.groupedList.suit).includes(item))
                const type = args.find(item => Object.values(NonameCN.groupedList.type).includes(item))
                const subtype = args.find(item => Object.values(NonameCN.groupedList.subtype).includes(item))
                const name = args.find(item => Object.values(NonameCN.groupedList.cardName).includes(item))
                const nature = args.find(item => Object.values(NonameCN.groupedList.nature).includes(item))
                let result = '';
                result += `${player}.getHistory("useCard", evt => evt.isPhaseUsing()`
                if (name) result += `\n && \nget.name(evt.card) === ${name}`
                if (color) result += `\n && \nget.color(evt.card) === ${color}`
                if (suit) result += `\n && \nget.suit(evt.card) === ${suit}`
                if (type) result += `\n && \nget.type2(evt.card) === ${type}`
                if (subtype) result += `\n && \nget.subtype(evt.card) === ${subtype}`
                if (nature) result += `\n && \nget.nature(evt.card) === ${nature}`
                result += `)`
                return result;
            })
        },
        'packed_playerCode_addTargets'(str) {
            let match = /(.+)\.packed_playerCode_addTargets(\(.*\))/g;
            return str.replace(match, function (match, ...p) {
                const player = p[0]
                const args = p[1].replace(/[\(\)]/g, '').split(/(?<!\[[^\]]*),/)
                let select = '', promptStr = '';
                for (const arg of args) {
                    if (!isNaN(Number(arg))) select = arg;
                    else if (/^\[(.+?),(.+?)\]$/.test(arg)) select = arg;
                    else if (/^'.+?'$/.test(arg)) promptStr = arg;
                }
                let result = '';
                result += `${player}.chooseTarget(${[select, promptStr].join("")})\n`;
                result += `.set("filterTarget",(card, player, target)=>{\n`;
                result += `var trigger = _status.event.getTrigger();\n`
                result += `return !trigger.targets.includes(target) && lib.filter.targetEnabled2(trigger.card, trigger.player, target);\n`
                result += `})\n`;
                result += `.set("ai",(card, player, target)=>{\n`;
                result += `var trigger = _status.event.getTrigger();\n`
                result += `return get.effect(target, trigger.card, trigger.player, _status.event.player);\n`
                result += `})\n`;
                result += `"step"\n`;
                result += `if(result.bool) trigger.targets.addArray(result.targets);\n`;
                return result;
            })
        },
        'packed_playerCode_removeTargets'(str) {
            let match = /(.+)\.packed_playerCode_removeTargets(\(.*\))/g;
            return str.replace(match, function (match, ...p) {
                const player = p[0]
                const args = p[1].replace(/[\(\)]/g, '').split(/(?<!\[[^\]]*),/)
                let select = '', promptStr = '';
                for (const arg of args) {
                    if (!isNaN(Number(arg))) select = arg;
                    else if (/^\[(.+?),(.+?)\]$/.test(arg)) select = arg;
                    else if (/^'.+?'$/.test(arg)) promptStr = arg;
                }
                let result = '';
                result += `${player}.chooseTarget(${[select, promptStr].join("")})\n`;
                result += `.set("filterTarget",(card, player, target)=>{\n`;
                result += `var trigger = _status.event.getTrigger();\n`
                result += `return trigger.targets.includes(target);\n`;
                result += `})\n`;
                result += `.set("ai",(card, player, target)=>{\n`;
                result += `var trigger = _status.event.getTrigger();\n`;
                result += `return -get.effect(target, trigger.card, trigger.player, _status.event.player);\n`;
                result += `})\n`;
                result += `"step"\n`;
                result += `if(result.bool) trigger.getParent("useCard",void 0,true).excluded.addArray(result.targets);\n`;
                return result;
            })
        },
        'packed_playerCode_getRespondedCardTimes'(str) {
            let match = /(.+)\.packed_playerCode_getRespondedCardTimes(\(.*\))/g;
            return str.replace(match, function (match, ...p) {
                const player = p[0]
                const args = p[1].replace(/[\(\)]/g, '').split(",")
                const color = args.find(item => Object.values(NonameCN.groupedList.color).includes(item))
                const suit = args.find(item => Object.values(NonameCN.groupedList.suit).includes(item))
                const type = args.find(item => Object.values(NonameCN.groupedList.type).includes(item))
                const subtype = args.find(item => Object.values(NonameCN.groupedList.subtype).includes(item))
                const name = args.find(item => Object.values(NonameCN.groupedList.cardName).includes(item))
                const nature = args.find(item => Object.values(NonameCN.groupedList.nature).includes(item))
                let result = '';
                result += `${player}.getHistory("respond", evt => evt.isPhaseUsing()`
                if (name) result += `\n && \nget.name(evt.card) === ${name}`
                if (color) result += `\n && \nget.color(evt.card) === ${color}`
                if (suit) result += `\n && \nget.suit(evt.card) === ${suit}`
                if (type) result += `\n && \nget.type2(evt.card) === ${type}`
                if (subtype) result += `\n && \nget.subtype(evt.card) === ${subtype}`
                if (nature) result += `\n && \nget.nature(evt.card) === ${nature}`
                result += `)`
                return result;
            })
        }
    }
    static eventRegExpStr = [
        '翻面',
        '横置或重置',
        //
        '(?:从牌堆底)?摸(?:\d+|[一二两三四五六七八九十]+|[a-z]+)张牌',
        '将手牌摸至(?:\d+|[一二两三四五六七八九十]+|[a-z]+)张',
        //
        '回复(?:\d+|[一二两三四五六七八九十]+|[a-z]+)点体力',
        '将体力回复至(?:\d+|[一二两三四五六七八九十]+|[a-z]+)点',
        '失去(?:\d+|[一二两三四五六七八九十]+|[a-z]+)点体力',
        //
        '失去(?:\d+|[一二两三四五六七八九十]+|[a-z]+)点体力上限',
        '(?:增加|获得)(?:\d+|[一二两三四五六七八九十]+|[a-z]+)点体力上限',
        //
        '受到(?:\d+|[一二两三四五六七八九十]+|[a-z]+)点(?:火属性|雷属性|冰属性)伤害',
        '对.+?造成(?:\d+|[一二两三四五六七八九十]+|[a-z]+)点(?:火属性|雷属性|冰属性)伤害',
    ]
    static get AllList() {
        let list = Object.assign({}, NonameCN.basicList, ...Object.values(NonameCN.groupedList));
        return list
    }
    static get TriList() {
        let list = Object.assign({},
            NonameCN.groupedList.event_name,
            NonameCN.groupedList.triggerList,
            NonameCN.groupedList.trigger_type,
            NonameCN.groupedList.trigger_only,
        );
        return list
    }
    static get ContentList() {
        const back = game.x19D6_back
        let list = Object.assign({}, NonameCN.basicList);
        for (let k in NonameCN.groupedList) {
            if (['filter_only', 'trigger_only'].includes(k)) continue;
            list = Object.assign(list, NonameCN.groupedList[k]);
        }
        if (!back) return list;
        const id = back.getID()
        list["获取名为" + back.getSourceID() + "父事件名字"] = `getParent: "${back.getSourceID()}"://!?name`
        list["获取名为" + id + "父事件名字"] = `getParent:"${id}"://!?name`
        list["此牌"] = NonameCN.analyzeThisCard(game.x19D6_back.skill.trigger)
        list["这些牌"] = NonameCN.analyzeTheseCard(game.x19D6_back.skill.trigger)
        return list
    }
    static get FilterList() {
        const back = game.x19D6_back
        let list = Object.assign({}, NonameCN.basicList);
        const id = back.getID()
        for (let k in NonameCN.groupedList) {
            if (['trigger_only'].includes(k)) continue;
            list = Object.assign(list, NonameCN.groupedList[k]);
        }
        list["获取名为" + back.getSourceID() + "的父事件的名字"] = `getParent:"${back.getSourceID()}"://!?name`
        list["获取名为" + id + "的父事件的名字"] = `getParent:"${id}"://!?name`
        list["获取名为\"" + id + "\"的父事件的名字"] = `getParent:"${id}"://!?name`
        list["此牌"] = NonameCN.analyzeThisCard(back.skill.trigger, true);
        list["这些牌"] = NonameCN.analyzeTheseCard(back.skill.trigger, true);
        return list;
    }
    static giveSentence = {
        filter: {
            '此牌是你使用的': '此牌是你使用的',
            '本事件是你造成的': '本事件是你造成的',
            '触发事件的角色不是你': '触发事件的角色不是你',
            '触发事件的目标不是你': '触发事件的目标不是你',
            '触发事件的来源不是你': '触发事件的来源不是你',

            '此牌是红色': '此牌为红色(颜色)',
            '此牌是黑色': '此牌为黑色(颜色)',
            '此牌为梅花': "此牌为梅花(花色)",
            '此牌为黑桃': "此牌为黑桃(花色)",
            '此牌为红桃': "此牌为红桃(花色)",
            '此牌为方片': "此牌为方片(花色)",
            '此牌是延时锦囊牌': '此牌是延时锦囊牌(类别)',
            '此牌是普通锦囊牌': '此牌是普通锦囊牌(类别)',
            '此牌是基本牌': '此牌是基本牌(类别)',
            '此牌是装备牌': '此牌是装备牌(类别)',
            '此牌是火杀': "此牌是火杀(属性+牌名)",
            '此牌是杀': '此牌是杀(牌名)',
            '此牌是闪': '此牌是闪(牌名)',
            '此牌是桃': '此牌是桃(牌名)',
            '此牌是酒': '此牌是酒(牌名)',
            '此牌是无懈可击': '此牌是无懈可击(牌名)',
            '此牌是决斗': '此牌是决斗(牌名)',
            '此牌点数为A': '此牌点数为A(点数)',
            '此牌点数不小于10': '此牌点数不小于10(点数)',
            '此牌字数为4': "此牌字数为4(字数)",
            '此牌为武器牌': "此牌为武器牌(副类别)",
            '此牌为防具牌': "此牌为防具牌(副类别)",
            '此牌为+1马牌': "此牌为+1牌马(副类别)",
            '此牌为-1马牌': "此牌为-1马牌(副类别)",
            '此牌为宝物牌': "此牌为宝物牌(副类别)",
            '此牌有伤害标签': '此牌有伤害标签(标签)',
            '此牌有多角色标签': '此牌不是单体牌(标签)',
            '此牌不带多角色标签': '此牌是单体牌(标签)',
            "此牌是实体牌": "此牌是实体牌",
            '你在你的攻击范围内': '你在你的攻击范围内(攻击范围)',

            '你未受伤': '你未受伤(体力)',
            '你已受伤': '你已受伤(体力)',
            '你体力值大于3': '你体力值大于3(体力)',
            '你体力上限大于3': '你体力上限大于3(体力)',
            '你有全场最少或之一的体力值': "你有全场最少或之一的体力值(体力)",
            '你有全场唯一最少的体力值': '你有全场唯一最少的体力值(体力)',
            '你没有全场唯一最少的体力值': '你没有全场唯一最少的体力值(体力)',

            '你为男性': '你为男性(性别)',
            '你为女性': '你为女性(性别)',
            '你性别相同于触发事件的角色': "你性别相同于触发事件的角色(性别)",

            '你已横置': "你已横置(状态)",
            '你已翻面': "你已翻面(状态)",

            "你于回合外": "你于回合外(状态)",
            "你处于自己的出牌阶段": "你处于自己的出牌阶段(状态)",

            '你手牌上限大于3': '你手牌上限大于3',
            '你的手牌数大于3': "你的手牌数大于3",
            '你的牌数大于3': "你的牌数大于3",
            '你的场上的牌数大于3': "你的场上的牌数大于3",
            '你的区域内的牌数大于3': "你的牌数大于3",
            '场上势力数大于2': "场上势力数大于2",
            '你有全场最少或之一的手牌数': "你有全场最少或之一的手牌数",
            '你有全场唯一最少的手牌数': '你有全场唯一最少的手牌数',
            '你有全场唯一最多的手牌数': '你有全场唯一最多的手牌数',
            '你没有全场唯一最少的手牌数': '你有全场唯一最少的手牌数',
            '你没有全场唯一最多的手牌数': '你没有全场唯一最多的手牌数',
            '你有牌': "你有牌",
            '你有手牌': "你有手牌",
            '你场上有牌': "你场上有牌",
            '你手牌区有牌': '你手牌区有牌',
            '你装备区有牌': '你装备区有牌',
            '你判定区有牌': '你判定区有牌',
            '你有杀': "你有杀",
            '你手牌区有杀': "你手牌区有杀",
            '你装备区有杀': "你装备区有杀",
            '你判定区有杀': "你判定区有杀",
            '你有未被废除的装备栏': '你有未被废除的装备栏',
            '你的装备栏均已被废除': '你的装备栏均已被废除',
            '你有空置的武器栏': '你有空置的武器栏',
            '你有空置的防具栏': '你有空置的防具栏',
            '你有空置的+1马栏': '你有空置的+1马栏',
            '你有空置的-1马栏': '你有空置的-1马栏',
            '你有空置的宝物栏': '你有空置的宝物栏',
            '你本回合未造成伤害': "你本回合未造成伤害",
            '你本回合造成过伤害': "你本回合造成过伤害",
            '你本回合未使用过牌': "你本回合未使用过牌",
            '你本回合使用过牌': "你本回合使用过牌",
            '你本回合未对触发事件的角色造成过伤害': "你本回合未对触发事件的角色造成过伤害",
            '你本回合出牌阶段没有打出过杀': "你本回合出牌阶段没有打出过杀",
            '你本回合出牌阶段没有使用过杀': "你本回合出牌阶段没有使用过杀",
            '你本回合出牌阶段没有打出过火杀': "你本回合出牌阶段没有打出过火杀",
            '你本回合出牌阶段没有使用过火杀': "你本回合出牌阶段没有使用过火杀",
            '你本回合出牌阶段没有打出过红杀': "你本回合出牌阶段没有打出过红杀",
            '你本回合出牌阶段没有使用过红杀': "你本回合出牌阶段没有使用过红杀",

            '场上有男性角色': '场上有男性角色',
            '场上有其他男性角色': '场上有其他男性角色',
            '场上有女性角色': '场上有女性角色',
            '场上有其他女性角色': '场上有其他女性角色',
            '场上有魏势力角色': '场上有魏势力角色',
            '场上有其他魏势力角色': '场上有其他魏势力角色',
            '场上有蜀势力角色': '场上有蜀势力角色',
            '场上有其他蜀势力角色': '场上有其他蜀势力角色',
            '场上有吴势力角色': '场上有吴势力角色',
            '场上有其他吴势力角色': '场上有其他吴势力角色',
            '场上有群势力角色': '场上有群势力角色',
            '场上有其他群势力角色': '场上有其他群势力角色',
            '场上有晋势力角色': '场上有晋势力角色',
            '场上有其他晋势力角色': '场上有其他晋势力角色',

            "触发的伤害事件不因横置传导造成": "触发的伤害事件不因横置传导造成",
        },
        content: {
            "你摸一张牌": "你摸一张牌(牌类)",
            "你从牌堆底摸一张牌": "你从牌堆底摸一张牌(牌类)",
            "你将手牌摸至五张": "你将手牌摸至五张(牌类)",
            "你随机弃置一张牌": "你随机弃置一张牌(牌类)",
            "你移动场上一张牌": "你移动场上一张牌(牌类)",
            '你选择使用一张牌': "你选择使用一张牌(牌类)",
            "你选择对一名角色使用一张杀": "你选择对一名角色使用一张杀(牌类)",

            "你增加一点体力上限": "你增加一点体力上限(体力类)",
            "你回复一点体力值": "你回复一点体力值(体力类)",
            "你将体力值回复至三点": "你将体力值回复至三点(体力类)",
            "你失去一点体力": "你失去一点体力(体力类)",
            "你获得一点护甲": "你获得一点护甲(体力类-护甲)",
            "你可以摸两张牌或回复一点体力值": "你可以摸两张牌或回复一点体力值(牌类-体力类)",

            '本技能发动次数-1': "本技能发动次数-1(技能类)",
            '重置本技能发动次数': "重置本技能发动次数(技能类)",
            "你本回合非锁定技失效": "你本回合非锁定技失效(技能类)",
            "你临时获得技能 'dangxian'": "你临时获得技能当先(技能类)",
            '你获得技能"yiji"直到下个回合结束': '你获得技能遗计("yiji")直到下个回合结束(技能类)',

            "你翻面": "你翻面",
            "你横置或重置": "你横置或重置",

            "你执行一个额外的准备阶段": "你执行一个额外的准备阶段(阶段类)",
            "你执行一个额外的判定阶段": "你执行一个额外的判定阶段(阶段类)",
            "你执行一个额外的摸牌阶段": "你执行一个额外的摸牌阶段(阶段类)",
            "你执行一个额外的出牌阶段": "你执行一个额外的出牌阶段(阶段类)",
            "你执行一个额外的弃牌阶段": "你执行一个额外的弃牌阶段(阶段类)",
            "你执行一个额外的结束阶段": "你执行一个额外的结束阶段(阶段类)",
            "你跳过下一个准备阶段": "你跳过下一个准备阶段(阶段类)",
            "你跳过下一个判定阶段": "你跳过下一个判定阶段(阶段类)",
            "你跳过下一个摸牌阶段": "你跳过下一个判定阶段(阶段类)",
            "你跳过下一个出牌阶段": "你跳过下一个出牌阶段(阶段类)",
            "你跳过下一个弃牌阶段": "你跳过下一个弃牌阶段(阶段类)",
            "你跳过下一个结束阶段": "你跳过下一个结束阶段(阶段类)",

            '你获得一枚"new_wuhun"标记': "你获得一枚梦魇标记(标记类)",
            '你移去一枚"new_wuhun"标记': "你移去一枚梦魇标记(标记类)",

            "此杀的伤害+1": "此杀伤害+1(触发技:使用杀时|使用杀指定目标时)",
            "此杀的伤害改为1": "此杀伤害改为1(触发技:使用杀时|使用杀指定目标时)",
            "此杀需要的闪的数量+1": "此杀需要的闪的数量+1(触发技:使用杀时|使用杀指定目标时)",
            "此杀需要的闪的数量改为2": "此杀需要的闪的数量改为1(触发技:使用杀时|使用杀指定目标时)",
            "此决斗需要的杀的数量+1": "此决斗需要的杀的数量+1(触发技:使用决斗时|使用决斗指定目标时|成为决斗的目标时)",
            "此决斗需要的杀的数量改为2": "此决斗需要的杀的数量改为1(触发技:使用决斗时|使用决斗指定目标时|成为决斗的目标时)",
            "造成的伤害+1": "造成的伤害+1(触发技:伤害类)",
            "造成的伤害改为1": "造成的伤害改为1",
            "令此牌对你无效": "令此牌对你无效",
            "此牌额外结算1次": "此牌额外结算1次",
            "此牌不可被响应": "此牌不可被响应",
            "此牌取消你为目标": "此牌取消你为目标",
            "此牌不可被此牌的目标响应": "此牌不可被此牌的目标响应",
            "此牌无视此牌的目标的防具": "此牌无视此牌的目标的防具",

            "你取消本触发事件": "你取消本触发事件",

            '你选择对一名角色杀': "你选择对一名角色杀(使用牌类)",
            "你视为对你使用一张无中生有": "你视为对你使用一张无中生有(使用牌类)",
            "你视为对你使用一张不可被无懈可击响应的无中生有": "你视为对你使用一张不可被无懈可击响应的无中生有(使用牌类)",
            "目标组-1视为对目标组-0使用一张不可被无懈可击响应、不影响ai的决斗": "目标组-1视为对目标组-0使用一张不可被无懈可击响应、不影响ai的决斗(使用牌类)",
            "目标组-1视为对目标组-0使用一张不计入次数、不影响ai的杀": "目标组-1视为对目标组-0使用不计入次数、不影响ai的杀(使用牌类)",

            '第一个所选角色摸一张牌': "第一个所选角色摸一张牌(选择目标后写该语句)",
            '触发事件的角色摸一张牌': "触发事件的角色摸一张牌(触发技)",
            '触发事件的目标摸一张牌': "触发事件的目标摸一张牌(触发技)",

            "你使用杀无距离限制": "你使用杀无距离限制(mod类)",
            "你使用杀无次数限制": "你使用杀无次数限制(mod类)",
            "你不能成为顺手牵羊和乐不思蜀的目标": "你不能成为顺手牵羊和乐不思蜀的目标(mod类)",

            "变量牌组令为你获取手牌": "变量 牌组 令为 你 获取手牌",
            '变量 牌组 令为 获取 牌堆中颜色不同的两张牌': "变量 牌组 令为 获取 牌堆中颜色不同的两张牌",
        },
        trigger: {
            "每轮开始时": "每轮开始时",

            "准备阶段": "准备阶段(阶段类)",
            "判定阶段": "判定阶段(阶段类)",
            "摸牌阶段": "摸牌阶段(阶段类)",
            "摸牌阶段2": "摸牌阶段(时机同【英姿】，阶段类)",
            "出牌阶段开始时": "出牌阶段开始时(阶段类)",
            "弃牌阶段": "弃牌阶段(阶段类)",
            "弃牌阶段开始时": "弃牌阶段开始时(阶段类)",
            "结束阶段": "结束阶段(阶段类)",

            '你失去一张牌后': "你失去一张牌后(失去牌类)",
            '你失去一张手牌后': "你失去一张手牌后(失去牌类)",
            '你失去一张装备区内的牌后': "你失去一张装备区内的牌后(失去牌类)",
            '你使用牌指定目标时': "你使用牌指定目标时(使用牌类)",
            '你使用牌指定目标后': "你使用牌指定目标后(使用牌类)",
            '你成为牌的目标时': "你成为牌的目标时(使用牌类)",
            '你成为牌的目标后': "你成为牌的目标后(使用牌类)",
            "你判定牌生效前": "你判定牌生效前(判定牌类)",
            "你判定牌生效后": "你判定牌生效后(判定牌类)",

            "你受到伤害后": "你受到伤害后(伤害类)",
            "你造成伤害后": "你造成伤害后(伤害类)",
            "你受到一点伤害后": "你受到一点伤害后(伤害类)",
            "你造成一点伤害后": "你造成一点伤害后(伤害类)",
            "你失去体力后": "你失去体力后(体力类)",
            "你失去一点体力后": "你失去一点体力后(体力类)",
            "你体力减少后": "你体力减少后(体力类)",

            "你令一名角色进入濒死状态": "你令一名角色进入濒死状态(濒死类)",
            '你进入濒死状态时': '你进入濒死状态时(濒死类)',
            '你脱离濒死状态时': "你脱离濒死状态时(濒死类)",
            "你杀死一名角色后": "你杀死一名角色后(死亡类)",
        },
        filterTarget: {
            "其他角色": "其他角色"
        },
        filterCard: {
            "卡牌颜色相同": "",
            "卡牌花色相同": "",
            "卡牌点数相同": "",
            "卡牌类别相同": "",
            "卡牌属性相同": "",
            "卡牌牌名相同": "",
        },
        unshown_filter: {},
        unshown_content: {
            '触发事件上有父事件摸牌': "触发事件上有名为摸牌的父事件",
            "变量选择事件令为": 0,
            "选择事件设置角色限制条件 非我过滤": 0,
            "选择事件设置角色限制条件 唯我过滤": 0,
            "选择事件设置选项列表": 0,
            '变量卡牌令为触发事件的牌组-0': 0,
            '销毁卡牌': 0,
            '游戏 移至处理区': 0,
            '本技能发动次数-1': 0,
            '"step 1"': 0,
            "'step 1'": 0,
            '%#&': 0,
        },
        unshown_trigger: {},
        unshown_filterTarget: {},
        unshown_filterCard: {},
    }
    static skillModMap = new Map();
    static moreSetDialog = [];
    static getEn(cn) {
        let list = Object.assign({}, ...Object.values(NonameCN.freeQuotation));
        return list[cn];
    }
    static getStrFormVcard({ costName, costNature, costColor, costSuit }, changeLine = true) {
        let result = '{\n'
        if (costName) result += `name:"${costName}",\n`;
        if (costNature) result += `nature:"${costNature}",\n`;
        if (costColor) result += `color:"${costColor}",\n`;
        if (costSuit) result += `suit:"${costSuit}"\n`;
        result += `}`;
        //pass
        if (!changeLine) result = result.replace(/\n/g, '')
        return result;
    }

    /**
     * @param that 一个对象，其changeWord方法被调用来执行文本替换。
     */
    static deleteBlank(that) {
        const JOINED_PLAYAERCN = NonameCN.playerCN.join("|")
        //method类m
        textareaTool().setTarget(that)
            .replace(/第[ ]+([一二三四五六七八九十])张[ ]+/g, '第$1张')
            .replace(/^相[ ]+等于$/mg, '相等于')
            .replace(/(?<=(选择对角色使用|视为使用))[ ]/g, '')
            .replace("此牌的目标 组", "此牌的目标组")
            .replace("此牌的已触发的 目标组", "此牌的已触发的目标组")
            .replace("受到 伤害 ", "受到伤害 ")
            .replace(/^选择结果 目标 ([数组])$/mg, '选择结果目标$1')
            .replace(/(?<=代为) (?=使用 |打出 |使用或打出 )/g, "")
            .replace(/体力值 (回复|恢复)至 /g, "体力值回复至 ")
            .replace(/(体力值|手牌数) 为全场最/g, "$1为全场最")
            .replace(/([有无])多目标 标签/g, "$1多目标标签")
            .replace(new RegExp(`无视[ ]+(${JOINED_PLAYAERCN})[ ]+防具的牌`, 'g'), "无视$1防具的牌")
        //处理空白字符
        NonameCN.deleteBlank2(that);
    }
    static deleteBlank2(that) {
        textareaTool().setTarget(that)
            .replace(/^\n+/g, "\n")
            .replace(/^[ ]+/mg, "")
            .replace(/[ ]+/g, " ")
            .replace(/[ ]+$/mg, "")
            .replace(/\s+$/g, '')
            .replace(/\n[ ]*\n/g, '\n')
            .replace(/(?<=\t)[ ]*/g, '')
            .replace(/\n\t*(?=\n)/g, '')
            .replace(/^[ ]*\n/g, "")
    }
    static underlieVariable(that) {
        textareaTool().setTarget(that)
            .replace(/(变量|常量|块变)/g, "$1 ")
            .replace(/令为/g, " 令为 ")
            .replace(/(?<=\w+)为/g, " 为 ")
            .replace(/(势力)为/g, "$1 为")
            .replace(/(?<!名|令|成|视)为(?!全场最[少多])(?!判定唯一[正负]收益)/g, '为 ')
            .replace(/令为\s*(.+?)且(向下取整|向上取整|四舍五入)$/mg, "令为 数学 $2 $1")
            .replace(/令为\s*(.+?)且至多为(.+?)$/mg, "令为 数学 最小值 $1 $2")
            .replace(/令为\s*(.+?)且至少为(.+?)$/mg, "令为 数学 最大值 $1 $2")
    }

    static standardModBefore(that) {
        textareaTool().setTarget(that)
            .replace(/你使用的?([\u4e00-\u9fa5]+?)无(距离和次数|次数和距离|距离和数量|数量和距离)限制/g, function (match, ...p) {
                return `你使用的${p[0]}无距离限制，你使用的${p[0]}无次数限制`
            })
    }
    static standardShort(that) {
        textareaTool().setTarget(that)
            .replace(/若(你|游戏)/g, "如果 $1")
            .replace(/(其他|其它)+/g, "其他")
            .replace(/体力(?!上限|值)/g, '体力值')
            .replace(/区域(里|内)的?/g, "区域内")
            .replace(/然后/g, '\n')
    }
    static standardEeffectMid(that) {
        textareaTool().setTarget(that)
            .replace(/(该|此)回合的?/g, "本回合")
            .replace(/(再|各)摸/g, "摸")
            .replace(/可以获得(?=.*牌)/g, " 获得牌 ")
            .replace('的事件', "事件")
            .replace(/^(.+?)(?<!\[)(?<!:)(".+?")(?!\])(.+?)$/mg, '$1$3 $2')
            .replace(/(选择|判定)事件(?![ ])/g, '$1事件 ')
            .replace(/(?<=事件)(?=取消)$/mg, ' ')
    }
    static standardEeffect(that) {
        textareaTool().setTarget(that)
            .replace(/(?<=获得|拥有|统计|移去)标记/g, "标记 ")
    }
    static standardFilter(that) {
        textareaTool().setTarget(that)
            //"(获取) 类别(...) ?"
            .replace(/^(?<=获取)(.+?)的?(类别|副类别|颜色|花色|点数|id)$/mg, ` $2 $1`)
            //"你(...) 获取手牌区(...)牌"
            .replace(/(获取)(.+?)\s*的?(手牌区|装备区|判定区)[内中]?的?牌$/mg, '$2 $1$3牌')
            //"你(...) 获取区域内牌 基本牌(..)"
            .replace(/(获取)(.+?)\s*的?(区域)[内中]的牌$/mg, '$2 $1$3内牌')
    }
    static standardFilterCardBef(that) {
        textareaTool().setTarget(that)
    }
    static standardFilterTargetBef(that) {
        textareaTool().setTarget(that)
            .replace(/^其他角色$/mg, '目标 不是 你')
    }
    static standardEvent(that) {
        //处理事件描述
        textareaTool().setTarget(that)
            .replace(/血量/g, "体力")
            .replace(/流失体力/g, "失去体力")
            .replace(/横置\/重置/g, "横置或重置")
            .replace(/(?<=置)于(?=判定区|装备区|弃牌堆)/g, "入")
            .replace("扣置", "置")
            .replace("恢复体力", "回复体力")
    }
    //处理模拟代码块
    static replace(undisposed) {
        let list = Object.keys(NonameCN.packedCodeRePlaceMap).filter(str => undisposed.includes(str));
        for (let k of list) {
            undisposed = NonameCN.packedCodeRePlaceMap[k](undisposed);
        }
        return undisposed.split('\n')
    }
    static analyzeThisCard(triggerList, event) {
        const List = [].concat(...Object.values(triggerList));
        if (List.length === 1) {
            const trigger = List[0]
            if (trigger.startsWith("judge")) return event ? `event.result.card` : `trigger.result.card`
        }
        return event ? `event.card` : `trigger.card`
    }
    static analyzeTheseCard(triggerList, event) {
        const List = [...Object.values(triggerList)];
        if (List.length === 1) {
            const trigger = List[0]
            if (trigger.startsWith("judge")) return event ? `[event.result.card]` : `[trigger.result.card]`
            return event ? `event.cards` : `trigger.cards`
        }
    }
    static analyzeViewAsData(back, i = 0) {
        const { viewAs, viewAsCondition, id, viewAsFrequency } = back.skill;
        const condition = viewAsCondition[i]
        let asCard = viewAs[i]
        if (!condition || !asCard) return {};
        let asCardType;
        let asNature;
        let costName = condition.startsWith("cardName-") && condition.slice(9)
        let costNature, costColor, costSuit;
        let position = get.type(costName) == "type" ? "'hes'" : "'hs'"
        let needCard = true;
        let preEve;
        let selectCard;
        let conditionBool;
        if (asCard.startsWith('cardType-')) {
            asCardType = asCard.slice(9);
        }
        if (asCard.startsWith("nature-")) {
            let list = asCard.slice(7).split(":")
            asNature = list[0];
            asCard = list[1];
        }
        if (costName && costName.startsWith("nature-")) {
            let list = costName.slice(7).split(":")
            costNature = list[0];
            costName = list[1];
        }
        if (condition.startsWith("color-pos-")) {
            let list = condition.slice(10).split(":");
            position = list[0]
            costColor = list[1];
        }
        if (condition.startsWith("suit-pos-")) {
            let list = condition.slice(9).split(":");
            position = list[0]
            costSuit = list[1];
        }
        if (condition.startsWith("preEve-link-")) {
            conditionBool = condition.slice(12);
            preEve = "link"
            selectCard = '-1'
            needCard = false
        }
        return {
            asCard, asCardType, asNature,
            costName, costNature, costColor, costSuit, position, needCard,
            preEve, selectCard, conditionBool, condition,
            viewAsFrequency, id
        }
    }
    static getVirtualPlayer() {
        const player = new lib.element.Player();
        player.name1 = "name1";
        player.tempname = [];
        player.skin = {
            name: "name1",
            name2: "name2",
        };
        player.sex = "unsure";
        player.group = "unsure";
        player.hp = 4;
        player.maxHp = 4;
        player.hujia = 4;
        player.name2 = "name2";
        Object.values(NonameCN.groupedList.packed_playerCode).forEach(method => player[method] = () => { })
        return player;
    }
    static getVirtualGame() {
        const vGame = new game.constructor()
        Object.values(NonameCN.groupedList.packed_gameCode).forEach(method => vGame[method] = () => { })
        return vGame;
    }
    static getVirtualEvent() {
        return {
            ..._status.event,
            num: 1,
            targetprompt: '1',
            getParent: () => true,
            filterTarget: () => true,
            "set": () => true,
            cancel: () => true,
            forResult: () => true,
            goto: () => true,
            redo: () => true,
            finish: () => true,
            notLink: () => true,
        }
    }
    static getVirtualCard() {
        const vCardObj = game.createCard();
        vCardObj.destroyed = true;
        return vCardObj;
    }
    static getVirtualStorage() {
        const vStorageObj = new Array(1).fill();
        return vStorageObj;
    }
    static getVirtualPlayers() {
        const players = new Array();
        const player = ui.create.player()
        for (const attr in player) {
            players[attr] = typeof player[attr] === 'function' ? () => true : true;
        }
        return players;
    }
    static disposeWithQuo(body, toDispose = '', matchNotObjColon = /(?<!\{[ \w"']+):(?![ \w"']+\})/) {
        let arrA = toDispose.includes(';') ? toDispose.split(';') : toDispose.split(matchNotObjColon);
        let arrB = [];
        let result = ''
        arrA = arrA.filter(each => {
            if (each.startsWith("//!?")) {
                arrB.push(each.replace("//!?", ""))
                return false;
            }
            return true;
        })
        let verbA = arrA.shift()
        if (body[verbA] || body === "ignore") {
            result += '.' + verbA;
            result += '(';
            result += arrA.join(',');
            result += ')';
            if (arrB.length) {
                result += '.'
                result += arrB.join('.')
            }
        } else {
            result += toDispose;
        }
        return result;
    }
    static disposeWhen(sentence) {
        let result = sentence;
        result = result.replace(/(.+?)(when\(.+?\)\.)(.+)$/, '$1$2then(()=>{\n$1$3;\n})')
        return result;
    }
    static disposePlayers(sentence, players) {
        let result = sentence, api;
        api = sentence
            .replaceAll(players, '')
            .replace(/\./g, '')
            .replace(/\(.*/, '');
        if (![][api]) {
            result = result.replace(players, 'i');
            result = players + '.forEach(i=>' + result + ')';
        }
        return result;
    }
    static disposeNeedTrans(sentence) {
        let [result, temp] = sentence.split('//!?')
        temp = `.${temp}`.replace(',', '(')
        //pass
        result = `${result})${temp}`.split(',)').join(')')
        return result;
    }
    //
    static orderSteps(str) {
        let step = 0
        return str.replace(/('step[ ]*\d*'|"step[ ]*\d*")/g, () => {
            return `"step ${step++}"`;
        });
    }
    //技能各部分的组装 
    static TestFilterOk(str, lineNum) {
        let func
        const test = str.replace("filter:function(event,player,triggername){", '')
        try {
            func = new Function("event", "player", "triggername", test);
        } catch (err) {
            console.error(err, lineNum);
            return false;
        }
        return true;
    }
    /**
     * 当所有布尔参数均为真时，抛出错误信息；否则，不执行任何操作
     * @param {string} errorMessage 错误消息文本
     * @param {...boolean} bools 
     * @throws {TypeError} 
     * @throws {Error} 
     */
    static GenerateEditorError(errorMessage, ...bools) {
        if (typeof errorMessage !== 'string') {
            throw new TypeError('Param errorMessage should be a string');
        }
        for (const bool of bools) {
            if (typeof bool !== 'boolean') {
                throw new TypeError('All element in bools should be boolean');
            }
            if (!bool) {
                return;
            }
        }
        throw new Error(errorMessage);
    }
    /**
    * 将代码从一种模式转换为另一种模式。
    * @param {Object} params 
    * @param {string} params.code - 需要转换的代码字符串。
    * @param {string} params.from - 当前代码的编写位置。
    * @param {string} params.to - 目标位置。
    * @param {string} params.id - 技能的ID。
    * @returns {string} 转换后的代码字符串。
    */
    static TransToOtherModeCode({ code, from, to, id }) {
        if (from === to) return code;
        if (to === "mainCode") {
            if (from === "mt") {
                return adjustTab(code.replace(/.*\n/, `lib.skill["${id}"]={\n`).slice(0, -1))
            } else {
                return adjustTab(`lib.skill["${id}"]={\n${code}\n}`);
            }
        }
        if (to === "mt") {
            if (from === "mainCode") {
                return adjustTab(code.replace(/.*\n/, `"${id}":{\n`))
            } else {
                return adjustTab(`"${id}":{\n${code}\n}`);
            }
        }
        if (to === "self") {
            return adjustTab(code.replace(/.*\n/, "").slice(0, -1))
        }
    }
}
//该代码块用于编辑giveSentence
{
    for (const [item, explanation] of Object.entries(NonameCN.giveSentence.trigger)) {
        if (!item.startsWith("你")) continue;
        NonameCN.giveSentence.trigger["一名角色" + item.substring(1)] = "一名角色" + explanation.substring(1)
    }
    for (const [item, _] of Object.entries(NonameCN.giveSentence.filter)) {
        if (!item.startsWith("此牌")) continue;
        NonameCN.giveSentence.filterCard["卡牌" + item.substring(2)] = 0;
    }
    const varSentence = {
        "变量x令为你体力值的一半且向上取整": "变量x令为你体力值的一半且向上取整",
        "变量x令为你体力值的一半且向下取整": "变量x令为你体力值的一半且向下取整",
        "变量x令为你体力值的一半且四舍五入": "变量x令为你体力值的一半且四舍五入",
        "变量y令为你体力上限且至多为5": "变量y令为你体力上限且至多为5",
        "变量z令为你手牌数且至少为1": "变量z令为你手牌数且至少为1",
        "变量X令为场上势力数": "变量X令为场上势力数",
        "变量Y令为你获取本回合失去牌的类型个数": "变量Y令为你获取本回合失去牌的类型个数",
    }
    for (const [item, explanation] of Object.entries(varSentence)) {
        NonameCN.giveSentence.filter[item] = explanation;
        NonameCN.giveSentence.content[item] = explanation;
    }
}
{
    const modsMap = NonameCN.skillModMap;
    const matchCardName = Object.keys(NonameCN.groupedList.cardName).join('|')
    modsMap.set(
        /^\s*(你|player)\s*计算(与|和)其他角色的?距离时?(减|\-|减少|加|\+|增加)([0-9]+)\s*$/m,
        [
            void 0,
            void 0,
            (match, ...p) => {
                let symbol = getSymbol(p[2]);
                return [`${symbol}:${p[3]}`, `globalFrom`];
            }
        ]
    );
    modsMap.set(
        /^\s*其他角色计算(与|和)(你|player)的?\s*距离时?(减|\-|减少|加|\+|增加)([0-9]+)\s*$/m,
        [
            void 0,
            void 0,
            (match, ...p) => {
                let symbol = getSymbol(p[2]);
                return [`${symbol}:${p[3]}`, `globalTo`];
            }
        ]
    );

    modsMap.set(
        new RegExp(`^\s*(你|player)\s*不能成为\s*(${matchCardName})的?\s*(目标|target)\s*$`, 'm'),
        [
            void 0,
            void 0,
            (match, ...p) => {
                return [`name:${NonameCN.getEn(p[1])}`, `targetEnabled_false`];
            }
        ]
    );
    modsMap.set(
        new RegExp(`^\s*(你|player)\s*不能成为\s*(${matchCardName})(和|与|或|、)(${matchCardName})的?\s*(目标|target)\s*$`, 'm'),
        [
            void 0,
            void 0,
            (match, ...p) => {
                return [`name:${NonameCN.getEn(p[1])}-${NonameCN.getEn(p[3])}`, `targetEnabled_false`];
            }
        ]
    );
    modsMap.set(
        /^\s*(你|player)\s*不能成为\s*(基本牌|装备牌|普通锦囊牌|延时锦囊牌)\s*(目标|target)\s*$/m,
        [
            void 0,
            void 0,
            (match, ...p) => {
                return [`type:${NonameCN.getEn(p[1])}`, `targetEnabled_false`];
            }
        ]
    );
    modsMap.set(
        /^\s*(你|player)\s*不能成为\s*锦囊牌\s*(目标|target)\s*$/m,
        [
            "type:trick-delay",
            "targetEnabled_false",
            void 0
        ]
    );


    modsMap.set(
        /^\s*(你|player)\s*使用的?\s*卡?牌(无|没有)(次数|数量|距离)限制\s*$/m,
        [
            void 0,
            void 0,
            (match, ...p) => {
                return [`all`, `${p[2] == '距离' ? 'targetInRange' : 'cardUsable'}_Infinity`];
            }
        ]
    );
    modsMap.set(
        /^\s*(你|player)\s*使用的?\s*锦囊牌(无|没有)(次数|数量|距离)限制\s*$/m,
        [
            void 0,
            void 0,
            (match, ...p) => {
                return ["type:trick-delay", `${p[3] == '距离' ? 'targetInRange' : 'cardUsable'}_Infinity`];
            }
        ]
    );
    modsMap.set(
        new RegExp(`^\s*(你|player)\s*使用的?\s*(${matchCardName})(无|没有)(次数|数量|距离)限制\s*$`, 'm'),
        [
            void 0,
            void 0,
            (match, ...p) => {
                return [`name:${NonameCN.getEn(p[1])}`, `${p[3] == '距离' ? 'targetInRange' : 'cardUsable'}_Infinity`];
            }
        ]
    );
    modsMap.set(
        /^\s*(你|player)\s*使用的?\s*(基本牌|普通锦囊牌|延时锦囊牌|装备牌)(无|没有)(次数|数量|距离)限制\s*$/m,
        [
            void 0,
            void 0,
            (match, ...p) => {
                return [`type:${NonameCN.getEn(p[1])}`, `${p[3] == '距离' ? 'targetInRange' : 'cardUsable'}_Infinity`];
            }
        ]
    );
    modsMap.set(
        /^\s*(你|player)\s*使用的?\s*([红黑]色)手?牌(无|没有)(次数|数量|距离)限制\s*$/m,
        [
            void 0,
            void 0,
            (match, ...p) => {
                return [`color:${NonameCN.getEn(p[1])}`, `${p[3] == '距离' ? 'targetInRange' : 'cardUsable'}_Infinity`];
            }
        ]
    );
    modsMap.set(
        /^\s*(你|player)\s*使用的?\s*(梅花|黑桃|红桃|方片)手?牌(无|没有)(次数|数量|距离)限制\s*$/m,
        [
            void 0,
            void 0,
            (match, ...p) => {
                return [`suit:${NonameCN.getEn(p[1])}`, `${p[3] == '距离' ? 'targetInRange' : 'cardUsable'}_Infinity`];
            }
        ]
    );
    modsMap.set(
        new RegExp(`^\s*(你|player)\s*不能使用(${matchCardName})\s*$`, 'm'),
        [
            void 0,
            void 0,
            (match, ...p) => {
                return [`name:${NonameCN.getEn(p[1])}`, `cardEnabled_false`];
            }
        ]
    );
    modsMap.set(
        new RegExp(`^\s*(你|player)\s*不能使用(${matchCardName})(和|与|或|、)(${matchCardName})\s*$`),
        [
            void 0,
            void 0,
            (match, ...p) => {
                return [`name:${NonameCN.getEn(p[1])}-${NonameCN.getEn(p[3])}`, `cardEnabled_false`];
            }
        ]
    );
    modsMap.set(
        new RegExp(/^\s*(你|player)\s*不能使用牌\s*$/m),
        [
            void 0,
            void 0,
            (match, ...p) => {
                return [`all`, `cardEnabled_false`];
            }
        ]
    );
    modsMap.set(
        new RegExp(/^\s*(你|player)\s*不能使用(黑|红)色手?牌\s*$/m),
        [
            void 0,
            void 0,
            (match, ...p) => {
                return [`color:${NonameCN.getEn(p[1] + "色")}`, `cardEnabled_false`];
            }
        ]
    );
    modsMap.set(
        new RegExp(/^\s*(你|player)\s*不能使用(梅花|黑桃|方片|红桃)手?牌\s*$/m),
        [
            void 0,
            void 0,
            (match, ...p) => {
                return [`suit:${NonameCN.getEn(p[1])}`, `cardEnabled_false`];
            }
        ]
    );
}
//moreSetDialog
{
    NonameCN.moreSetDialog.push(
        back => {
            if (back.skill.subSkillEditing) return game.x19D6_create.alert("此技能已经是一个子技能!")
            back.cachePrimarySkill();
            back.ele.groupsContainer.groupsPageNum = 0;
            back.clearTextarea();
            back.skillEditorStart();
            delete back.skill.subSkill
            back.skill.subSkillEditing = true;
        },
        back => {
            if (back.skill.subSkillEditing) return game.x19D6_create.alert("此技能已经是一个子技能!")
            const map = {};
            for (let skillName of Object.keys(back.skill.subSkill)) {
                skillName = skillName;
                if (back.skill.group.includes(skillName)) continue;
                map[skillName] = `子技能-${skillName}`
            }
            game.x19D6_create.seeDelete(
                map,
                '查看',
                '删除',
                function () {
                    const id = this.container.dataset.x19D6Id;
                    back.cachePrimarySkill();
                    back.readSubskillCache(id);
                    this.yesButton.click();
                    this.yesButton.dispatchEvent(new TouchEvent(
                        "touchend", {
                        bubbles: true,
                        cancelable: true,
                        composed: true
                    }));
                    back.ele.groupsContainer.groupsPageNum = 0;
                    back.skill.subSkillEditing = true;
                    back.organize()
                },
                function () {
                    const id = this.container.dataset.x19D6Id
                    delete back.skill.subSkill[id]
                    back.organize()
                },
                function () {
                }
            )
        },
        back => {
            if (back.skill.subSkillEditing) {
                back.cacheSubskill()
            }
            back.readPrimarySkillCache()
            back.skill.subSkillEditing = false;
        },
        back => {
            const map = {};
            for (let skillName of Object.keys(back.skill.subSkill)) {
                skillName = back.skill.id + "_" + skillName;
                if (back.skill.group.includes(skillName)) continue;
                map[skillName] = `${skillName}(${skillName})`
            }
            for (let skillName of lib.x19D6_skillsStore) {
                if (!lib.translate[skillName]) continue;
                if (!lib.translate[skillName + "_info"]) continue;
                if (back.skill.group.includes(skillName)) continue;
                map[skillName] = `${lib.translate[skillName]}(${skillName})`
            }
            game.x19D6_create.seeDelete(
                map,
                '查看',
                '添加',
                function () {
                    if (this.innerText === "查看") {
                        const id = this.container.dataset.x19D6Id
                        this.descEle.innerHTML += `<span>${lib.translate[id + '_info']}</span>`
                        this.innerText = "收起"
                        this.seeExpanding = true;
                    } else if (this.innerText === "收起") {
                        /**
                         * @type {HTMLElement}
                         */
                        const descEle = this.descEle
                        const span = descEle.querySelector('span')
                        span && span.remove();
                        this.innerText = '查看'
                        this.seeExpanding = false;
                    }
                },
                function () {
                    const id = this.container.dataset.x19D6Id
                    this.yesButton.result.push(id)
                },
                function () {
                    back.skill.group.push(...this.result)
                    back.organize()
                }
            )
        },
        back => {
            const map = {};
            for (let skillName of back.skill.group) {
                map[skillName] = `${lib.translate[skillName]}(${skillName})`
            }
            let dialog = game.x19D6_create.seeDelete(
                map,
                '查看',
                '删除',
                function () {
                    if (this.innerText === "查看") {
                        const id = this.container.dataset.x19D6Id
                        this.descEle.innerHTML += `<span>${lib.translate[id + '_info']}</span>`
                        this.innerText = "收起"
                        this.seeExpanding = true;
                    } else if (this.innerText === "收起") {
                        /**
                         * @type {HTMLElement}
                         */
                        const descEle = this.descEle
                        const span = descEle.querySelector('span')
                        span && span.remove();
                        this.innerText = '查看'
                    }
                },
                function () {
                    const id = this.container.dataset.x19D6Id
                    this.yesButton.result.remove(id)
                },
                function () {
                    back.skill.group = [...this.result]
                    back.organize()
                }
            )
            dialog.buttons[0].result = [...back.skill.group]
        },
        back => {
            game.x19D6_create.multiprompt(function () {
                back.skill.marktext = this.resultList[0];
                back.skill.markName = this.resultList[1];
                back.skill.markContent = this.resultList[2];
                back.organize();
            })
                .appendPrompt('标记外观', back.skill.marktext ? back.skill.marktext : void 0, '这里写标记外观文字,只能写一个字!',)
                .appendPrompt('标记名字', back.skill.markName ? back.skill.markName : void 0, '这里写标记的名字',)
                .appendPrompt('标记内容', back.skill.markContent ? back.skill.markContent : void 0, '这里写点开标记后显示的内容,你可以用#表示标记数量', 4);
        },
        back => {
            game.x19D6_create.multiprompt(function () {
                back.skill.prompt = this.resultList[0];
                back.skill.prompt2 = this.resultList[1];
                back.organize();
            })
                .appendPrompt('技能提示标题', back.skill.prompt ? back.skill.prompt : void 0, '这里写技能提示的标题', 1)
                .appendPrompt('技能提示内容', back.skill.prompt2 ? back.skill.prompt2 : void 0, '这里写技能提示的内容', 3)
        }
    )
}
