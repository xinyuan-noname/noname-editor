# 魂氏编辑器

无名杀（Noname）的可视化编辑器扩展：**工作区（= 扩展）+ 武将编辑 + 技能编辑（内联）+ 基本设置**。

从《新将包》中分离而来，现为**完全独立**的扩展——不引用《新将包》的任何代码或全局符号，《新将包》也只通过本扩展的对外接口调用。

---

## 安装

1. 把 `魂氏编辑器` 文件夹放进游戏的 `extension/` 目录。
2. 启动游戏 → `设置 → 通用 → 自动导入扩展` 打开（默认关闭）→ 重启。
3. 扩展列表中出现 **《魂氏编辑器》**（默认关闭）→ 开启它 → 再重启。

> 也可以直接用 URL 参数导入：`index.html?importExtensionName=魂氏编辑器`。

## 入口

| 入口 | 位置 |
|---|---|
| 系统按钮「魂氏编辑」 | 游戏内左侧系统栏 |
| 扩展菜单「魂氏编辑器」 | 扩展菜单 |
| 「直接打开技能编辑」/「直接打开武将编辑」 | 扩展菜单 |
| nav「技」 | 编辑器侧边栏导航（在 `mainArea` 内联打开技能编辑） |
| nav「设置」 | 基本设置面板（含工作区切换/新建与工作区资源目录） |
| nav「武将」 | 武将编辑 + 已保存武将列表（顶部「武将包 / 分包」两栏过滤草稿；两栏右侧「＋」可在**当前扩展下**新建武将包 / 在该包下新建分包） |

## 对外接口（其他扩展唯一允许的调用方式）

```js
game.x19D6_editor                                  // 编辑器实例（只读用途）
game.x19D6_isReady()                               // → boolean
game.x19D6_openEditor({ page?, parent? })          // page: "setting"|"character"|"skill"|"card"|"search"
game.x19D6_openSkillEditor({ parent?, readCache? })// → <skill-editor> 组件
game.x19D6_openCharacterEditor({ id?, data?, parent? }) // → <character-editor> 组件
game.x19D6_createSkill(options)                    // → Promise<{ id, code, skill }>，无头生成，不开界面
game.x19D6_closeEditor()
```

### `game.x19D6_createSkill(options)`

给需要「程序化生成技能」的扩展用（例如《新将包》的技能牌/咏唱流程），**不需要也不应该去操纵编辑器的 DOM**。

```js
const { code } = await game.x19D6_createSkill({
    id: "my_skill",
    kind: "trigger",              // 触发类
    mode: "mainCode",             // 编写位置
    tags: ["forced"],             // 技能标签
    filter: "你 已受伤",           // 发动条件（编辑器中文语法，会自动「整理」）
    content: "你 摸牌 一张",        // 技能效果
    trigger: "你 受到伤害后"        // 触发时机
});
new Function("_status", "lib", "game", "ui", "get", "ai", code)(_status, lib, game, ui, get, ai);
```

调用方自行负责 `lib.translate` 的技能名与描述。

## 尺寸与交互

- **默认挂载父元素 `ui.window`**，根容器 `position:absolute; inset:0`，铺满父容器并随窗口变化。
- **响应式**：尺度全部走 CSS 变量（`--xy-ED-header-h` / `--xy-ED-nav-w` / `--xy-ED-nav-icon` / `--xy-ED-ball-size`，均用 `clamp()`），字号走 `--xy-ED-font-scale`；断点 `≤1280px`（侧栏收窄）、`≤900px`（解除最小宽度约束）、`≤640px`（改上下布局）。
- **拖拽**：浮动球拖动、侧栏拖宽、nav 拖排序三处统一为 pointer 事件 + `requestAnimationFrame` + `transform: translate3d`，起手一次性量取边界（拖动过程中不读布局），使用 `setPointerCapture`，并带 3px 位移阈值以区分点击与拖动。

## 数据与持久化

全部经引擎的 `lib.config` + IndexedDB 持久化（`game.saveConfig`），**不是文件**：

| 配置键 | 内容 |
|---|---|
| `x19D6_editor.characters.<武将id>` | 武将草稿全量字段（编辑时 400ms 防抖自动保存，关闭编辑页立即落盘） |
| `x19D6_editor.settings.*` | 基本设置（字号缩放、界面动画、默认挂载父元素、记住上次所在页、当前工作区） |
| `x19D6_editor.ui.*` | 外壳状态（侧栏宽度比、导航顺序、上次所在页、武将包/分包过滤） |
| `x19D6_editor.skillEditor.*` | 技能编辑器的配置与缓存 |
| `x19D6_editor.extensionFileConfig.*` | 各工作区（扩展）的资源目录：立绘 / 卡图 / 技能语音 / 阵亡语音 |
| `x19D6_editor.extensionModuleConfig.*` | 扩展目录扫描缓存（可在基本设置里清除） |
| `x19D6_editor.workspaceMeta.<工作区>` | 编辑器里新建的武将包 / 分包登记（id → 中文名），重启后仍能列出来 |
## 工作区（= 扩展）

**一个工作区就是一个扩展**（磁盘上的 `extension/<名字>/`），当前工作区显示在编辑器标题旁。

- **切换 / 新建**：侧栏「设置 → 工作区」下拉切换；「新建工作区」输入扩展名后会
  建 `extension/<名>/` → 写 `extension.js` 骨架与 `info.json` →
  `lib.config.extensions.add(名)` + `game.saveConfig("extensions", lib.config.extensions)` →
  `game.saveExtensionConfig(名, "enable", true)`。**新扩展要重启游戏才会被加载。**
- **骨架是老式 `game.import` 形态**：worker 的扩展扫描（`getExtensionAllPackage`）只解析老式扩展；
  新式 ESM 骨架会让「武将包 / 分包」扫描失效（《魂氏编辑器》自身是新式，但不参与该扫描）。
- **武将归属**：扩展不再按武将单独设置，草稿的 `extension` 一律取当前工作区（保存时写回）；
  侧栏「武将」列表按工作区过滤，未归属的旧草稿照常显示。
- **资源目录**：立绘 / 卡图 / 技能语音 / 阵亡语音四个目录写在 `x19D6_editor.extensionFileConfig.<工作区>`，
  供 `downloadExtensionAsset()` 下载资源时使用。
  - **会自动建立并更新**：新建工作区（以及选中工作区）时，配置为空或仍指向扩展根就按
    `image/character`、`image/card`、`audio/skill`、`audio/die` 建目录并写进配置；扩展里已有 `image` / `audio`
    这类旧布局则沿用；配置里已手填的值不动。「创建/更新目录」按钮可随时手动补一次。
  - 每行右侧「…」按钮**直接弹系统文件夹选择框**（Electron `dialog.showOpenDialog`，界面就是资源管理器）：
    选完自动换算成相对扩展根的路径、建出目录并写入该行。拿不到原生对话框时（网页端）退化为打开资源管理器，
    由你手动建目录后点「刷新列表」。手填目录名并失焦同样会建出目录。
  - **打开资源管理器**：按钮直接调起系统文件管理器定位到 `resources/app/extension/<工作区>`，方便手动整理
    立绘/语音；底层是 `require("electron").shell.openPath`，失败退回 `child_process.exec` 调 `explorer`。
    提示行会显示该目录的绝对路径；**建目录失败会在此处显式报错**（不再静默）。



## 目录结构

```
魂氏编辑器/
  extension.js                 新式 ESM 入口（export const type = "extension"）
  info.json
  module/editor/
    api.mjs                    对外接口层（唯一出口）
    index.mjs / nonameEditor.mjs / nonameEditorView.mjs / nonameEditorData.mjs
    component.mjs              <character-editor> 武将编辑器
    component-skill.mjs        <skill-editor> 技能编辑器外壳
    component-setting.mjs      <setting-panel> 基本设置
    component-dialog.mjs       <noname-dialog> 对话框
    component-infoCard.mjs     技能/武将/皮肤/语音信息卡
    component-base.mjs         组件基类（查询门面 + manager 原语）
    encapsulated.mjs           UniqueChoiceManager / DragManager / loadCss 等
    data-noname.mjs            NonameData：文件、配置、搜索、多媒体、AST
    data-ast.mjs + worker-ast.worker.js   代码生成与改写（Worker + Babel）
    skill/                     技能编辑器内核（原《新将包》技能编辑器）
      editor.js                内核主文件（导出 createSkillEditor）
      editor/                  中文语法/整理/合成（nonameCN 等）
      interact/ ui/            内核自带的 UI 与对话框层（待并轨到 <noname-dialog>）
      style/                   内核样式
    html/ style/ image/ font/ libs/ docs/ preprocessing/
```

## 开发说明

- 交互组件命名为 `component-*.mjs`，`preprocessing/preprocessing.cjs` 会按 `preprocessing/config.json` 的 `targets`（`nonameEditorView.mjs` + `component*.mjs`）把 `html/*.html` 内联进 `.mjs` 中以 `//$: 锚点 , html/x.html//` … `//#: 锚点 , html/x.html//` 包住的整块。改了 HTML 源文件需手动跑一次该脚本。
- 运行游戏不需要任何构建步骤：HTML 已内联，ESM 直接加载。

## 已知待办

- **皮肤**：尚无编辑项（`skin-info-card` 目前只服务 bwiki 搜索结果，不进武将草稿）。
- **珠联璧合**：编辑器内已启用（搜索武将、卡片⬅️/拖拽添加、🗑️移除，草稿持久化并回填）。
  数据本质是全局表 `lib.perfectPair`（`noname/library/index.js:11994` 初始化，由 `character/perfectPairs.js` 经 `noname/init/loading.js:459` 载入），**不是武将字段**——当前导出代码会剔除 `perfectPair`（见 `worker-ast.worker.js:genCharacterCode`），「把搭档关系写入 perfectPairs 表」的导出仍待设计。
- **对话框并轨**：技能编辑器内核仍带着自己的一套对话框/UI 层（约 90KB，与 `<noname-dialog>` 重复）。
  计划先给 `component-dialog.mjs` 补齐 多行输入 / 数值滑条 / 开关列表 / 搜索选择 / 列表管理 五类，再切换内核约 30 处调用并删除重复实现。
- **技能按工作区过滤**：技能目前只有一份全局缓存（`x19D6_editorSkillCache`，无 `extension` 归属），
  要先有「带扩展归属的技能草稿列表」才能像武将那样过滤（下一轮）。
- `module/editor/mindmap.mjs` 是无人引用的孤儿文件。

已实现（本轮起）：武将**称号**（`component.mjs` 的 `characterAttributes` 含 `title`，纳入草稿持久化与导出数据）。