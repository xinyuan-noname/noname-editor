import {
    lib,
    game,
    ui,
    get,
    ai,
    _status
} from "../../../../../../noname.js";
import { moveWordToEnd } from "../tool/string.js";
import { NonameCN } from "./nonameCN.js";
const JOINED_PLAYAERCN = NonameCN.playerCN.join("|");
const JOINED_EVENT = NonameCN.eventRegExpStr.join("|");
export class EditorArrange {
    static transCnCalculation(that) {
        for (let i = 10; i > 0; i--) {
            that.changeWord("加" + get.cnNumber(i), "+" + i);
            that.changeWord("减" + get.cnNumber(i), "-" + i);
            that.changeWord("乘" + get.cnNumber(i), "*" + i);
            that.changeWord("乘以" + get.cnNumber(i), "*" + i);
            that.changeWord("加" + (i), "+" + i);
            that.changeWord("减" + (i), "-" + i);
            that.changeWord("乘" + (i), "*" + i);
            that.changeWord("乘以" + (i), "*" + i);
            that.changeWord("*" + get.cnNumber(i), "*" + i);
            that.changeWord("+" + get.cnNumber(i), "+" + i);
            that.changeWord("-" + get.cnNumber(i), "-" + i);
        }
    }
    static makeWordsToEnd(that, words, judge) {
        for (const word of words) {
            that.value = moveWordToEnd(that.value, word, " ", judge);
        }
    }
    static makeNumToEnd_zhang(that) {
        that.value = that.value.replace(/^(.*?)((?:[bcdefghlmnoprstuvwxyz]|\d+|[一两二三四五六七八九十]+)到(?:[bcdefghlmnoprstuvwxyz]|\d+|[一两二三四五六七八九十]+)|\d+|[一两二三四五六七八九十]+|[bcdefghlmnoprstuvwxyz])张(.*?)$/img, "$1$3 $2张")
    }
    static makeNumToEnd_dian(that) {
        that.value = that.value.replace(/^(.*?)((?:[bcdefghlmnoprstuvwxyz]|\d+|[一两二三四五六七八九十]+)到(?:[bcdefghlmnoprstuvwxyz]|\d+|[一两二三四五六七八九十]+)|\d+|[一两二三四五六七八九十]+|[bcdefghlmnoprstuvwxyz])点(.*?)$/img, "$1$3 $2点")
    }
    static makeNumToEnd_ming(that) {
        that.value = that.value.replace(/^(.*?)((?:[bcdefghlmnoprstuvwxyz]|\d+|[一两二三四五六七八九十]+)到(?:[bcdefghlmnoprstuvwxyz]|\d+|[一两二三四五六七八九十]+)|\d+|[一两二三四五六七八九十]+|[bcdefghlmnoprstuvwxyz])名(.*?)$/img, "$1$3 $2名")
    }
    static makeNumToEnd_mei(that) {
        that.value = that.value.replace(/^(.*?)((?:[bcdefghlmnoprstuvwxyz]|\d+|[一两二三四五六七八九十]+)到(?:[bcdefghlmnoprstuvwxyz]|\d+|[一两二三四五六七八九十]+)|\d+|[一两二三四五六七八九十]+|[bcdefghlmnoprstuvwxyz])枚(.*?)$/img, "$1$3 $2枚")
    }
    static makeNumToEnd(that) {
        EditorArrange.makeNumToEnd_zhang(that)
        EditorArrange.makeNumToEnd_dian(that)
        EditorArrange.makeNumToEnd_ming(that)
        EditorArrange.makeNumToEnd_mei(that)
        that.value = that.value.replace(/^(.*?)(?<=令触发事件的牌(?:增加|增添|添加|减少))((?:[bcdefghlmnoprstuvwxyz]|\d+|[一两二三四五六七八九十]+)到(?:[bcdefghlmnoprstuvwxyz]|\d+|[一两二三四五六七八九十]+)|\d+|[一两二三四五六七八九十]+|[bcdefghlmnoprstuvwxyz])个(?=目标)(.*?)$/img, "$1$3 $2个")
    }
    static makeOtherToEnd(that) {
        that.value = moveWordToEnd(that.value, "其他", " ", (p1, p2, p3) => {
            if (/.势力角色/.test(p3)) return false;
            if (/[男女双]性角色/.test(p3)) return false;
            return true;
        });
    }
    static makeOccupyLine(that, words) {
        that.changeWord(new RegExp(`(?<!\n)(${words.join("|")})`, "g"), '\n$1');
        that.changeWord(new RegExp(`(${words.join("|")})(?!\n)`, "g"), '$1\n');
    }


    static standardBoolExp(that) {
        that.value = that.value
            .replace(/(?<!游戏 统计)场上势力数/g, '游戏 统计场上势力数')
            .replace(/^(.+?)[ ]*性别(相同|不同)于(.+?)$/mg, "$1 性别$2于 $3")
            .replace(/(?<=有标记)(?![ ])/g, ' ')
            .replace(/(".+?")标记的?数量/g, '统计标记 $1\n')
            .replace(/(手牌|装备|判定)区[内中]有牌/g, '$1区有牌')
            .replace(/拥?有空置?的?(.+?)栏/g, "有空置的$1栏")
            .replace(/(此|本次|本)?事件(不?是)[由因]?你(造成的|而起)/, '触发事件的来源\n并且\n触发事件的来源 $2 你')
            .replace(/此牌(不?[是为])你使用的/g, '使用此牌的角色 $1 你')
            .replace(/此牌(为|是)其他角色使用的/g, '使用此牌的角色 不为 你')
            .replace(/(.+?)是此牌的目标/g, "此牌的目标包含 $1")
            .replace(/(.+?)在(.+?)的?攻击范围内$/mg, "$2 攻击范围内有 $1")
            .replace(/(没有)(.+?)标签/mg, "无$2标签")
            .replace(/(选择使用)一张(手?牌)/g, '$1$2')
            .replace(/[上拥]?有父事件[ ]*["']?(.+?)["']?$/mg, '获取名为$1的父事件的名字  不为 undefined')
            .replace(/^(.+?)本回合未对(.+?)造成过?伤害$/mg, '$1 本回合对角色造成伤害的次数 $2\n等于\n0')
            .replace(/本回合的?出牌阶段(使用|打出)([^卡牌]+?)的?次数$/mg, "本回合出牌阶段$1某牌的次数 $2")
            .replace(/本回合的?出牌阶段(使用|打出)过([^卡牌]+?)$/mg, "本回合出牌阶段$1某牌的次数 $2\n大于\n0")
            .replace(/本回合的?出牌阶段(没有|未)(使用|打出)过([^卡牌]+?)$/mg, "本回合出牌阶段$2某牌的次数 $3\n等于\n0")
        that.value = that.value
            .replace(/(不?)(大于|小于|是|等于)/g, " $1$2 ")
            .replace(/不为/g, ' 不为 ')
            .replace(/的一半/g, ' 除以 2')
            .replace(/的三分之一/g, ' 除以 3')
            .replace(/的四分之一/g, ' 除以 4')
            .replace(/的八分之一/g, ' 除以 8')
    }
    //这部分用于
    static standardEffect0(that) {
        that.value = that.value
            .replace(/可?以?令(至多|至少)?((?:[一两二三四五六七八九十]+|\d+)到(?:[一两二三四五六七八九十]+|\d+)|\d+|[一两二三四五六七八九十]+)名(其他)?角色(.*)$/mg, `选择$1$2名$3角色 "$&"\n新步骤\n如果\n有选择结果\n那么\n分支开始\n所选角色$4\n分支结束`)
            .replace(/可?以?令任意名(其他)?角色(.*)$/mg, `选择任意名$1角色 "$&"\n新步骤\n如果\n有选择结果\n那么\n分支开始\n所选角色$2\n分支结束`);
    }
    static standardEffect1(that) {
        that.value = that.value
            .replace(/可以(失去.+?点体力|受到.+?点伤害|摸.+?张牌)/g, '$1')
            .replace(new RegExp(`^(${JOINED_PLAYAERCN})(${JOINED_EVENT})并(${JOINED_EVENT})$`, 'img'), '$1 $2\n$1 $3')
        that.value = that.value
            .replace(/额外执行一个/g, "执行一个额外的")
            .replace(/获得(此牌|cards|card)$/mg, "获得牌 $1")
            .replace(/受到(.*?)无来源的?(.*?)伤害/g, '受到$1$2伤害 无来源')
            .replace(/(.+?)对(.+?)造成(.*?)点(火属性|雷属性|冰属性)?伤害/g, '$2 受到伤害 $1 $3点 $4')
            .replace(/(.+?)\s*(可以)?获得(你|伤害来源|当前回合角色)(.*?)张(手牌|牌)/g, function (match, ...p) {
                return match.replace("可以", "").replace("获得", "获得角色")
            })
            .replace(/(?<=随机)弃(?!置)/g, '弃置')
            .replace(/(将体力值回复至)([0-9a-z])(?!点)/g, "$1$2点")
            .replace(/(你使用)?此牌(不可|无法)被(闪避|响应)/g, "不可响应牌的角色 添多 此牌的目标组")
            .replace(/(你使用)?此牌(不可|无法)被(.+?)(闪避|响应)/g, "不可响应牌的角色 添单 $3")
            .replace(/(你使用)?此牌无视(.+?)的?防具/g, "$2 本回合被破甲\n无视$2防具的牌 添单 此牌")
            .replace(/^此牌取消(.+?)为目标$/mg, '此牌的目标组 移除 $1\n此牌的已触发的目标组 移除 $1')
            .replace(/你?令?此牌对(你)无效/g, "无效的角色 添单 $1")
            .replace(/^(.+?)视为对(.+?)使用(.+?)张(不可被无懈可击响应)?[的、]?(不计入次数)?[的、]?(不影响ai)?的?(.+?)$/mg, '$1 视为使用$7 $2 $3张 $4 $5 $6')
            .replace(/(?<=弃置区域内)(?=所有牌)/g, '的')
            .replace(/(.+?)防止触发事件$/g, '触发事件 取消')
            .replace(/(.+?)展示牌堆顶的?(.+?张)牌(\(放回\))?$/g, "event.topCards = 获取 牌堆顶牌组$3 $2\n$1 展示牌 event.topCards")
            .replace(/(.+?)展示牌堆底的?(.+?张)牌(\(放回\))?$/g, "event.bottomCards = 获取 牌堆底牌组$3 $2\n $1 展示牌 event.bottomCards")
            .replace(/(使用|打出)(杀|闪|桃|酒|无懈可击)次数/g, "$1的$2次数")
            .replace(/(?<!不能使用|不能打出)(?<=使用|打出)(?=(杀|闪|桃|酒|无懈可击)[ ]*$)/mg, " ")
    }

    static standardTri1(that) {
        that.value = that.value
            .replace(/【([\u4e00-\u9fa5]+)】/g, function (match, ...p) {
                return p[0];
            })
        that.value = that.value
            .replace(/之(前|时|后)/g, "$1")
        that.value = that.value
            .replace(/场上(的|有)?(延时)?类?(锦囊)?牌被?置入判定区/g, "一名角色牌置入判定区")
            .replace(/场上(的|有)?(装备)?牌被?置入判定区/g, "一名角色牌置入装备区")
        that.value = that.value
            .replace(/的判定牌生效/g, '判定牌生效')
        that.value = that.value
            .replace(/(?<=你|一名角色)的?判定区被?置入(延时)?类?(锦囊)?牌/g, "牌置入判定区")
            .replace(/(?<=你|一名角色)的?装备区被?置入(装备)?牌/g, "牌置入装备区")
        that.value = that.value
            .replace(/体力值?减少(时|前|开始时|结束时|后)/g, "失去体力$1 受到伤害$1")
        // that.value = that.value
        //     .replace(/(?<!使用)或(?!打出)/g, ' ')
        that.value = that.value
            .replace(/^有角色|^任意角色/mg, "一名角色 ")
            .replace(/^当?((?:.+?的)*(?:你|每名角色|一名角色|其他角色))的?/mg, "$1 ")
    }
    static standardTri2(that) {
        that.value = that.value
            .replace(/(?<=濒死)(状态|阶段)/g, "状态")
            .replace(/([\u4e00-\u9fa5]*?)使用或打出([\u4e00-\u9fa5]+)/g, function (match, ...p) {
                return `${p[0]}使用${p[1]} ${p[0]}打出${p[1]}`;
            })
    }
}