import {
    lib,
    game,
    ui,
    get,
    ai,
    _status
} from "../../noname.js";
import { installApi } from "./module/editor/api.mjs";

//魂氏编辑器（独立扩展）
//对外只暴露 game.x19D6_* 接口；内部模块一律不对外引用。
//默认挂载父元素为 ui.window。
const menuLabel = "<div>魂氏编辑器</div>";
export const type = "extension";
export default function () {
    return {
        name: "魂氏编辑器",
        precontent: function () {
            installApi();
        },
        content: function (config, pack) {
            const extensionMenu = lib.extensionMenu["extension_魂氏编辑器"];
            if (!extensionMenu) return;
            const openItem = {
                clear: true,
                onclick: function () {
                    if (typeof game.x19D6_openEditor === "function") return game.x19D6_openEditor();
                    alert("魂氏编辑器尚未载入完成，请重启游戏后再试。");
                }
            };
            openItem.name = menuLabel;
            extensionMenu.openEditor = openItem;
            const skillItem = {
                clear: true,
                onclick: function () {
                    if (typeof game.x19D6_openSkillEditor === "function") return game.x19D6_openSkillEditor();
                    alert("魂氏编辑器尚未载入完成，请重启游戏后再试。");
                }
            };
            skillItem.name = "<div>直接打开技能编辑</div>";
            extensionMenu.openSkillEditor = skillItem;
            const characterItem = {
                clear: true,
                onclick: function () {
                    if (typeof game.x19D6_openCharacterEditor === "function") return game.x19D6_openCharacterEditor();
                    alert("魂氏编辑器尚未载入完成，请重启游戏后再试。");
                }
            };
            characterItem.name = "<div>直接打开武将编辑</div>";
            extensionMenu.openCharacterEditor = characterItem;
        },
        arenaReady: function () {
            if (!ui.system) return;
            if (ui.system.querySelector("x19D6-system-ED")) return;
            if (ui.x19D6_system_ED) return;
            if (typeof game.x19D6_openEditor !== "function") return;
            const node = ui.create.system("魂氏编辑", function () {
                game.x19D6_openEditor();
            });
            node.classList.add("x19D6-system-ED");
            ui.x19D6_system_ED = node;
        },
        editable: false,
        connect: false,
        help: {},
        config: {},
        package: {
            intro: "无名杀的可视化编辑器：武将编辑 + 技能编辑（内联）。<br>对外接口：game.x19D6_openEditor / openSkillEditor / openCharacterEditor / createSkill / closeEditor。",
            author: "<a href=https://b23.tv/RHn9COW>新元noname</a>",
            diskURL: "",
            forumURL: "",
            version: "1.0.0"
        }
    };
}
