# 对话框并轨施工计划

技能编辑器内核目前带着自己的一整套对话框层，与《魂氏编辑器》的 `<noname-dialog>` 功能重复。
本文件记录并轨的现状、映射关系与步骤，供实际动手时照着做。

## 一、现状

私有层规模：

| 文件 | 字节 |
|---|---|
| `skill/interact/dialog.mjs` | 47,922 |
| `skill/interact/ui.mjs` | 16,839 |
| `skill/style/base.css` | 9,588 |
| `skill/style/editor.css` | 5,799 |

约 80KB。私有层对外提供 21 个方法（`ban` / `baned` / `allow` / `alert` / `confirm` / `prompt` /
`blprompt` / `multiprompt` / `chooseAnswer` / `file` / `dir` / `button` / `search` /
`configNumberList` / `configSet` / `condition` / `seeDelete` / `searchChoose` / `range` / `promise`）。

**但其中绝大多数调用来自 dialog.mjs 自身**（例如 `baned` 17 次、`search` 7 次、`prompt` 5 次全在文件内部）。
去掉自调用后，**内核（`editor.js`、`editor/*.js|mjs`）真正用到的方法只有 7 个**，外部调用点约 24 处：

| 私有 API | 外部调用点（不含 dialog.mjs 内部） |
|---|---|
| `promise.alert` / `promise.confirm` / `promise.setConfig` | `editor.js` 7 处 |
| `alert` | `editor.js` 4 处、`editor/nonameCN.js` 2 处 |
| `seeDelete` | `editor/interaction.mjs` 1 处、`editor/nonameCN.js` 3 处 |
| `chooseAnswer` | `editor.js` 2 处 |
| `multiprompt` | `editor.js` 1 处、`editor/nonameCN.js` 2 处 |
| `confirm` | `editor.js` 2 处 |
| `range` | `editor.js` 1 处 |

## 二、映射关系

`<noname-dialog>` 已补齐五类新 type（见 `component-dialog.mjs`）：

| 私有 API | 新 type | 取值方式 | 返回 |
|---|---|---|---|
| `alert(message, callback)` | `alert` | `headline` / `message` | 无 |
| `confirm(message, ok, cancel)` | `confirm` | `headline` / `message` | 布尔 |
| `promise.alert` / `promise.confirm` | 同上 | — | `await dialog.wait()` |
| `range(title, min, max, value, callback, onChange)` | `range` | `min`/`max`/`step`/`value` 属性 | 数值 |
| `seeDelete(map, seeStr, deleteStr, ...)` | `list-manage` | `payload`（JSON）、`see-text`/`delete-text` | 被删除 key 数组 |
| `configSet(...)`（经 `promise.setConfig` 调用） | `switch-list` | `payload`（JSON `{key:{label,checked}}`） | `{key: bool}` |
| `chooseAnswer(title, list, single, callback)` | `select` | 见 component-dialog 既有实现 | 索引/值 → 适配器转成 `this.resultIndex` |

### ⚠️ 一个尚未覆盖的缺口

`multiprompt` **不是**多行文本，而是**多字段输入**：内核以链式方式追加字段，取值用数组下标。

```js
game.x19D6_create.multiprompt(function () {
    const searchValue = this.resultList[0];
    const replaceValue = this.resultList[1];
    // ...
})
    .appendPrompt('替换什么', void 0, '这里写替换的文字,不支持正则!')
    .appendPrompt('替换为', void 0, '这里替换后的文字')
```

因此 `multiline`（单框）覆盖不了它。**已补 `multi-input` 类型解决**（`payload` 传 JSON 数组 `[{label, placeholder, value, type}]`，返回字符串数组），下面两个方案仅作记录：

1. 再补一类 `multi-input`：`payload` 传 JSON 数组 `[{label, placeholder, value}]`，返回字符串数组；
2. 或在适配器里把 `multiprompt` 拆成多次串行 `prompt`（会多几次点击确认，体验变差）。

推荐方案 1。

## 三、适配器方案（推荐做法）

**不要直接改内核 2452 行里散落的约 24 处调用**，而是在内核里新增一层适配器：

```
skill/interact/dialog-adapter.mjs    ← 新建
```

做法：

1. 适配器导出 `installDialogAdapter()`，把 `game.x19D6_create` 上那 7 个方法的实现**替换**为基于 `<noname-dialog>` 的版本，签名与返回值**保持与私有层一致**（例如 `alert(message, callback)` 仍接受回调；`promise.*` 仍返回 Promise）。
2. `ui.create.x19D6_back` / `ui.x19D6_*` 等**非对话框**工具保留（它们是内核 UI 的基础设施，不属于本次并轨范围）。
3. 在 `skill/editor.js` 首次载入时调用一次 `installDialogAdapter()`。
4. 内核调用点**一行不改**，因此行为差异只可能来自适配器。

这样出问题时：注释掉 `installDialogAdapter()` 一行即回到私有层，风险完全可控。

## 四、步骤

1. 补 `multi-input` 类型（见上缺口）。
2. 写 `dialog-adapter.mjs`，先只替换 `alert` / `confirm` / `promise.*` 这 3 组（外部 11 处，占比最高、语义最简单），实机验证。
3. 再替换 `range` / `chooseAnswer` / `multiprompt` / `seeDelete`（外部剩 13 处），逐项验证。
4. 全部切完且稳定后，删除 `skill/interact/dialog.mjs` 中已无引用的实现，以及 `style/base.css` 中仅供私有对话框使用的规则（`base.css` 里还有 `.x19D6_hidden` 等内核 UI 在用的工具类，**不能整份删除**，需逐条核对）。
5. `skill/interact/ui.mjs` 保留（内含 `ui.create.x19D6_back` 等内核外壳工具）。

## 五、风险

- 内核大量使用**回调式**接口（`alert(msg, cb)`），而 `<noname-dialog>` 是 **Promise** 式；适配器必须把回调转成 `wait().then(...)`，且要保证回调时序与原来一致（原来部分回调在对话框关闭动画后触发）。
- `seeDelete` 原先会**直接把行从 DOM 移除**并回调；`list-manage` 改为「标记删除 + 确认后返回数组」，语义不同，适配器需要按原语义（删除即移除行、可撤销）包一层。
- 私有层有 `ban` / `baned` 全局开关（17 处自调用，用于「禁止弹出对话框」的场景），适配器需要保留这个开关语义。
## 六、关于 `seeDelete` 与一处既存 bug（已修）

私有 `seeDelete` 的行内按钮上挂了 5 个属性供回调使用（`dialog` / `descEle` / `container` / `yesButton` / `id`），
回调以 **按钮元素作为 `this`**，且「删除」会**当场把整行从 DOM 移除**（除非 `notAllowRemove`）。
这与通用 type 的设计取向不同，因此它**不适合**直接映射到 `list-manage`：
适配器若要做，必须自己构造这些按钮并挂属性，而不是复用 `type`。

**同时发现并已修复一处既存 bug**：写入端用
`element(...).setAttribute('x19D6_id', attr)`（非 `data-*` 属性），
而 4 个调用点全部读 `this.container.dataset.x19D6_id`。
非 `data-*` 属性不会进入 `dataset`，且 `dataset` 的键名不可能包含下划线，
因此这 4 处的 `id` **恒为 `undefined`**：
`lib.translate[undefined + '_info']` 取不到翻译、`yesButton.result.push(undefined)` 也拿不到真实 id。
即「子技能 / 技能组」的查看与删除在修复前是静默失效的。

修法：写入端改 `container.dataset.x19D6Id = attr`，读取端 4 处改为 `dataset.x19D6Id`。
## 七、导出链路的三处缺陷（本轮核实）

在排查对话框并轨顺带审查 `worker-ast.worker.js` 时核实：

1. **已修**：`modifyCharacterClassInfo` 中残留 `console.log(...)` + `debugger;`。
   Worker 内的 `debugger` 会在打开开发者工具时中断执行，属生产代码不该有的调试残留。
2. **未实现（已加注）**：`modifyCharacterPackageCode` 里 `if (characterSort) { }` 是空实现。
   `characterSort` / `characterSortName` 在解构时已被剔出 `basicInfo`，也未写入目标文件的 characterSort 配置，
   因此「一键导出」不会更新分包排序——这两个字段目前只停留在编辑器草稿里。
3. **未写回（已加注）**：`intro` / `pinyin` / `dieAudioText` 同样被从 `basicInfo` 剔出，
   但该函数只写入了 `character` 与 `translate` 两处，因此这三项不会随导出写回目标文件。

第 2、3 项需要实现目标文件的对应写入逻辑（AST 改写），属功能开发而非缺陷修补，故本轮只做事实标注，未擅自猜测写入格式。
## 八、characterSort 导出：目标格式已确认（实现待做）

上一节提到「第 2、3 项需要先确认写入格式」，该格式其实**在本项目里已经存在**——
编辑器生成展示代码时用的 `genCharacterSortCode`（`worker-ast.worker.js:170-196`）就是权威依据：

```js
lib.characterSort[packageId] ??= {};                  // 序号 173-179：分包不存在时先建空对象
lib.characterSort[packageId][characterSort] ??= [];   // 序号 180-187：排序分组不存在时先建空数组
lib.translate[characterSort] = characterSortName;     // 序号 186：分组名写进翻译表
lib.characterSort[packageId][characterSort].push(id); // 序号 188-193：把该武将加入分组
```

即：`lib.characterSort` 是 `分包id → 分组id → [武将id...]` 的两层表，分组名走 `lib.translate[分组id]`。

### 为什么本轮没有实现

`modifyCharacterPackageCode` 里要给目标文件做的是 **AST 改写**，而这处与已实现的
`character` / `translate` 两处**结构位置不同**：

- `character` / `translate` 写在扩展配置对象（或 `package`）内部，现有代码用
  `astObject.$ensureProperty(characterConfigObject, "translate", {})` 即可拿到；
- `lib.characterSort` 却是**模块顶层的语句**（`lib.characterSort[x] = ...`），
  不在配置对象里，需要定位/新建顶层语句再逐层插入数组元素。

而这个函数的产物是**直接写回用户的武将包源文件**（`modifedFileContentMap` 会被上层落盘）。
在没有任何实机验证的条件下实现 AST 插入，一旦结构判断出错，就是**把使用者的源文件改坏**。
因此本轮只固化格式与实现路径，动笔前建议先用一个测试用武将包跑通「导出 → 文件正确 → 游戏内生效」。

### 实现要点（备查）

1. 在 `modifyCharacterPackageCode` 中，`characterSort` 分支需要独立的顶层语句处理，不能挂在 `characterConfigObject` 下；
2. 可复用 `genCharacterSortCode` 已用到的 helper：`$createMemberExpression`、`$createNode`、
   `createLeftRightExpressionStatement`、`$createCallMethodExpressionStatement`、`packStatementAsProgram`；
   但**不能**直接把生成的代码字符串塞进目标文件——应改造成对目标 AST 的原地插入；
3. `packageExistence` 这一入参来自 `characterSortInfo`，实现时需与现有分包扫描结果对齐。

### 另注：intro / pinyin / dieAudioText

这三项目前也被剔出 `basicInfo` 且未写回。它们的写入位置分别需要确认：
`intro`/`pinyin` 通常属于 `lib.character[i]` 数组写法的固定下标或对象写法字段，
`dieAudioText` 的归属（是否进 `translate` 或音频配置）尚未核实，实现前应先查引擎对应读取处。