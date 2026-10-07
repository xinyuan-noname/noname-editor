"use script";
import { lib, game, ui, get, ai, _status } from "../../../../../../noname.js";

/**
 * 对话框并轨适配器（详见 docs/dialog-merge-plan.md）
 *
 * 目标：把技能编辑器内核调用的 game.x19D6_create.* 从「私有对话框层」切换到《魂氏编辑器》的
 * <noname-dialog>，而内核那约 24 处调用点一行不改。
 *
 * 当前状态：**已实现但尚未接线**。本文件导出 installDialogAdapter()，
 * 但 skill/editor.js 还没有调用它，因此运行时行为与并轨前完全一致。
 * 接线方式：在内核首次载入时调用一次 installDialogAdapter()；
 * 若要回退，注释掉那一行即可。
 *
 * 已实现（语义最简单、调用点最多的 4 个，占外部调用 11/24）：
 *   alert(message, callback)
 *   confirm(message, func1, func2)
 *   promise.alert(message)
 *   promise.confirm(message)
 *
 * 待实现（见计划文档的分步顺序）：
 *   range / chooseAnswer / multiprompt(→multi-input) / seeDelete(→list-manage) / promise.setConfig(→switch-list)
 */

/** 对话框的挂载父元素 */
function getHost() {
    return ui.window || document.body;
}

/**
 * 创建并弹出一个 <noname-dialog>，返回其 wait() 的 Promise
 * @param {"alert"|"confirm"|"prompt"|"range"|"multi-input"|"switch-list"|"search-select"|"list-manage"|"multiline"} type
 * @param {{ headline?: string, message?: string, payload?: any }} options
 */
function popDialog(type, options = {}) {
    const dialog = document.createElement("noname-dialog");
    //注意顺序：type 分支开头会清掉 headline/message 属性，
    //因此这两项必须在设置 type 之前写好；payload 不是受观察属性，可随时设置
    if (options.headline) dialog.setAttribute("headline", options.headline);
    if (options.message !== undefined) dialog.setAttribute("message", options.message);
    if (options.payload !== undefined) dialog.setAttribute("payload", typeof options.payload === "string" ? options.payload : JSON.stringify(options.payload));
    dialog.setAttribute("type", type);
    getHost().appendChild(dialog);
    const promise = dialog.wait();
    promise.finally(() => dialog.remove());
    return { dialog, promise };
}

/**
 * 把结果规整成私有层 createDialogEvent 曾产出过的形状
 * @param {*} result
 * @param {boolean|null} bool
 */
function toEventResult(result, bool = null) {
    return {
        result,
        bool,
        chosen: bool === true ? "确定" : bool === false ? "取消" : null,
        type: "main"
    };
}

/**
 * 安装适配器：替换 game.x19D6_create 上的对应方法实现
 * @param {object} [target] 默认为 game.x19D6_create
 * @returns {() => void} 还原函数（用于回退/热切换）
 */
export function installDialogAdapter(target = game.x19D6_create) {
    if (!target) throw new Error("installDialogAdapter: game.x19D6_create 不存在，请先载入技能编辑器内核");
    const backup = {
        alert: target.alert,
        confirm: target.confirm,
        promise: target.promise ? { ...target.promise } : null
    };

    //与私有层一致：baned 为真时所有对话框都不弹
    const isBaned = () => Boolean(target.baned);

    target.alert = function (message, callback) {
        if (isBaned()) return null;
        const { dialog, promise } = popDialog("alert", { message });
        promise.then(() => {
            if (typeof callback === "function") callback.call(dialog);
        });
        return dialog;
    };

    target.confirm = function (message, func1, func2) {
        if (isBaned()) return null;
        const { dialog, promise } = popDialog("confirm", { message });
        promise.then(result => {
            const isOk = result && result.bool === true;
            const handler = isOk ? func1 : func2;
            if (typeof handler === "function") handler.call(dialog);
        });
        return dialog;
    };

    const promiseApi = target.promise || (target.promise = {});
    promiseApi.alert = function (message) {
        if (isBaned()) return Promise.resolve(toEventResult(undefined, null));
        const { promise } = popDialog("alert", { message });
        return promise.then(result => toEventResult(result, true));
    };
    promiseApi.confirm = function (message) {
        if (isBaned()) return Promise.resolve(toEventResult(undefined, false));
        const { promise } = popDialog("confirm", { message });
        return promise.then(result => toEventResult(result, Boolean(result && result.bool === true)));
    };

    return function restore() {
        target.alert = backup.alert;
        target.confirm = backup.confirm;
        if (backup.promise) target.promise = backup.promise;
    };
}

export { popDialog, toEventResult };
