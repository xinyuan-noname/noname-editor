# 魂氏编辑器

无名杀（Noname）的可视化编辑器扩展：**武将编辑 + 技能编辑（内联）+ 基本设置**。

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
| nav「设置」 | 基本设置面板 |
| nav「武将」 | 武将编辑 + 已保存武将列表 |

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
| `x19D6_editor.settings.*` | 基本设置（字号缩放、界面动画、默认挂载父元素、记住上次所在页） |
| `x19D6_editor.ui.*` | 外壳状态（侧栏宽度比、导航顺序、上次所在页） |
| `x19D6_editor.skillEditor.*` | 技能编辑器的配置与缓存 |
| `x19D6_editor.extensionFileConfig.*` | 各扩展的资源路径配置 |
| `x19D6_editor.extensionModuleConfig.*` | 扩展目录扫描缓存（可在基本设置里清除） |

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
- **珠联璧合**：经核实**不是武将字段**，而是全局表 `lib.perfectPair`（`noname/library/index.js:11994` 初始化，由 `character/perfectPairs.js` 经 `noname/init/loading.js:459` 载入）。
  因此**不能**像「武将称号」那样作为 character attribute 直接启用（导出的武将代码没有承载它的位置），需要单独设计成「把搭档关系写入 perfectPairs 表」的独立功能。
  HTML 中那段被注释的 `data-perfect-pair` 区块在完成该设计前保持不启用。
- **对话框并轨**：技能编辑器内核仍带着自己的一套对话框/UI 层（约 90KB，与 `<noname-dialog>` 重复）。
  计划先给 `component-dialog.mjs` 补齐 多行输入 / 数值滑条 / 开关列表 / 搜索选择 / 列表管理 五类，再切换内核约 30 处调用并删除重复实现。
- `module/editor/mindmap.mjs` 是无人引用的孤儿文件。

已实现（本轮起）：武将**称号**（`component.mjs` 的 `characterAttributes` 含 `title`，纳入草稿持久化与导出数据）。

## 致谢

原《新将包》作者：新元noname
