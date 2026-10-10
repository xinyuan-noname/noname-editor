import {
    lib,
    game,
    ui,
    get,
    ai,
    _status
} from "../../noname.js";
import { installApi } from "./module/editor/api.mjs";

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
                name: "<div>魂氏编辑器</div>",
                clear: true,
                onclick: function () {
                    if (typeof game.x19D6_openEditor === "function") return game.x19D6_openEditor();
                    alert("编辑器尚未载入完成，请重启游戏后再试。");
                }
            };
            const openOldEditor = {
                name: "<div>旧版编辑器</div>",
                clear: true,
                onclick: function () {
                    if (typeof game.x19D6_openEditor === "function") return createSkillEditor();
                    alert("编辑器尚未载入完成，请重启游戏后再试。");
                }
            }
            extensionMenu.openEditor = openItem;
            extensionMenu.openOldEditor = openOldEditor
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
            intro: "无名杀的可视化编辑器",
            author: "<a href=https://b23.tv/RHn9COW>新元noname</a>",
            diskURL: "",
            forumURL: "",
            version: "0.1.0"
        }
    };
}
