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
| `x19D6_editor.characters.<编号>` | 武将草稿全量字段（键是**草稿编号** `draft-<n>`，不是武将 id；编辑时 400ms 防抖自动保存，关闭编辑页立即落盘） |
| `x19D6_editor.draftSeq` | 草稿编号计数（下一个编号 = `draft-` + (seq+1)） |
| `x19D6_editor.settings.*` | 基本设置（字号缩放、界面动画、默认挂载父元素、记住上次所在页、当前工作区） |
| `x19D6_editor.ui.*` | 外壳状态（侧栏宽度比、导航顺序、上次所在页、武将包/分包过滤） |
| `x19D6_editor.skillEditor.*` | 技能编辑器的配置与缓存 |
| `x19D6_editor.extensionFileConfig.*` | 各工作区（扩展）的资源目录：立绘 / 卡图 / 技能语音 / 阵亡语音 |
| `x19D6_editor.extensionModuleConfig.*` | 扩展目录扫描缓存（可在基本设置里清除） |
| `x19D6_editor.skills.<技能id>` | 编辑器里建立/编辑过的技能（shya 源码 + 编译产物 + 名称描述 + 归属工作区）；武将落盘时写技能源码文件用 |
| `x19D6_editor.workspaceMeta.<工作区>` | 编辑器里新建的武将包 / 分包登记（id → 中文名）；同时会**落盘**到该扩展 `extension.js` 的标记区块 |
## 技能编辑器（新版 shya）

- **技能 id 从编译产物识别**：工具栏没有 id 输入框——产物恒为 `const <id> = { … }`（与模板语言无关），
  所以 id 直接读产物；编译没过时退回源码里的 `#skill` / `#技能` 槽，再退回外部带进来的 hint。
  源码一改就清掉上一次的产物（否则「生成」会把旧代码注册进 `lib.skill`）。
- **一个技能草稿 = 一个技能文件**：点「技能种类」按钮就是**整块替换**源码（不再插到光标处，
  免得一份草稿里堆出好几个技能）；源码已被手改过时先弹确认（设置页「布局 → 写入模板前确认」，
  默认开）。点**已经选中**的那个种类不做任何事（不清掉标签面板里已选好的标签）。
- **组合技改由工具栏「组合」按钮生成**（「技能种类」里原来的「组合技」模板已下线）：
  弹技能草稿多选 → 填 id / 名称 → 生成 `@组合技 { #技能组: [...] #技能预亮: [...] }`（官方「无双」同形，
  纯逻辑 `shya/comboSkill.mjs`，自检 `combo-skill-check.mjs`）。子技仍是**独立技能 / 独立草稿**，
  只被引用、不被搬走；带「未生成」的子技先生成一次才引用得到；id 非法、或撞本体 / 其它扩展 / 另一份草稿
  都会被拦。当前草稿是空的（还是初始示例）就地写成组合技，已经有别的内容则**另开一份新草稿**并打开它。
- **中英双模板，默认中文**：设置页「布局 → 技能模板语言」切 `中文（插槽为中文名）` / `English`；
  中文宏库 `shya/host/skill-type-cn.shya`、`skill-content-cn.shya` 由
  `_x19D6_backup/tools/gen-cn-host.mjs` 从英文版**机械生成**（改名表 `shya/slotLang.mjs`，
  自检 `cn-host-check.mjs`）。编辑器按**源码语言**注入宏库 import、出模板、写标签槽
  （源码认得出就按源码，空源码才用设置里的默认），所以两种语言可以各写各的、互不干扰。
- **编译时就检测技能 id 冲突**（判据在 `shya/skillIdentity.mjs`）：id 撞游戏本体/其它扩展
  （`x19D6_dup_id`）、或撞**另一份技能草稿**（`x19D6_dup_draft`）都在诊断栏报红；「生成」共用同一判据直接拒绝。
  编译本身有语法错时不跑这项检查（免得再叠一条「没有 id」刷屏）。
- **技能草稿可以拖进武将的技能区**：已「生成」过的草稿卡带 `drag-skill` 属性，拖到武将编辑器技能区是
  **复制一份**（那一行留在侧栏继续用），搜索页的技能卡照旧是「搬进技能栏」；⬅️ 仍是「打开草稿」。
- **侧栏「技」= 技能草稿列表**（与「武将」页同构）：空态显示「点击创建」，列表页头有「＋ 新建技能 / ⟳ 刷新」；
  列表项用 `<skill-info-card>`，⬅️ 打开该草稿、🗑️ 丢弃草稿。「新建」按「技能编辑器版本」偏好分流
  （旧版编辑器没有草稿概念，直开浮层），点已有草稿一律用 shya 打开。
- **草稿**：`x19D6_editor.skills.<编号 draft-n>`（+ `x19D6_editor.skillDraftSeq`），键是**草稿编号**、
  技能 id 只是字段（同武将草稿的理由）；源码改动 **400ms 防抖自动保存**，空草稿不落库。
  老数据（以技能 id 为键）读的时候自动迁成编号键，原键落成 `id` 字段。
  「生成」把 id / 名称 / 描述 / 产物一次写回草稿；保存武将时按草稿里的 id 写 `src/shya/<id>.shya`。

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
  - **打开草稿的回填**：`applyData()` 除了写 dataset/CSS 变量，还会同步 contenteditable 的**文字**（姓名/拼音/id）、
    选项的选中态（性别/势力/宗族，**走 `UniqueChoiceManager.choose()`**，不能只写 `chosen` 类）、
    体力/上限/护甲数字框**以及旁边的血格/甲格**（`.hp`/`.hujia` 的 `lost` 类与容器的 healthy/damaged/dangerous）、
    立绘（`getAllData()` 会把 `avatar` 挪进 `trashBin` 并从草稿删掉，所以要从 `trashBin` 里恢复），
    以及顶部「所属分包」那几个 CSS 变量——
    否则数据其实载入了，界面看着却是空的。
  - **自建势力图标落盘**：自建势力对话框画布生成的 data URL 会写进 `extension/<工作区>/image/group/<势力id>.png`，
    选项 URL 要写全 `/extension/<工作区>/image/group/<势力id>.png`（内置图标是 `/image/card/group_wei.png` 这一级，漏掉 `extension/` 就加载不到）；
    `<img>` 用的地址是 `lib.assetURL + "extension/<相对路径>"`（assetURL 可能是空串，也可能是 `file:///…`）。
    路径记在 `x19D6_editor.groupImages.<势力id>`；选项与重启后的回填都用它（宗族图标仍按游戏 `image/clan/<名>.png` 找）。
  - **工作区失效自动清空**：`extension/<工作区>` 目录不存在、或该名字不在 `lib.config.extensions` 里时，
    `settings.workspace` 会被清空（标题回到「未选择工作区」、草稿列表不再按它过滤）。
  - **媒体落盘（与武将同生共死）**：本地选中的**阵亡语音 / 立绘**会立刻写进当前工作区扩展——
    阵亡语音 `audio/die/<武将id>1.<ext>`、立绘 `image/character/<武将id>.<ext>`（目录取工作区资源目录配置），
    草稿里存 `ext:<工作区相对路径>` 引用（引擎可直接播/加载），不再用刷新即失的 `blob:` URL。
    **同生共死**：删条目 / 重置立绘 → 删对应文件；改武将 id → 名下媒体文件改名跟随（写新删旧）；
    侧栏 🗑️ 删草稿 → 连带删除该武将名下的媒体文件。（技能语音在旧版技能编辑器内核里，另行处理）
  - **武将 / 武将包 / 分包落盘成标准武将包文件**：每个武将包写一个 `extension/<工作区>/character/<包id>.js`，
    形态对齐游戏本体 `character/bingshi.js`（`game.import("character", …)` + `character` / `characterSort` /
    `skill` / `translate` / `characterIntro` / `pinyins`）。草稿保存后 1.5s 防抖重写，新建包/分包与删除草稿即时重写。
    - ESM 入口会自动维护一小段引入区块 `//#noname-editor-imports-begin … end`（`import "./character/<包id>.js";`）；
      老式 `game.import("extension", …)` 入口不写 import——那种扩展自己用 `lib.init.js("extension/<工作区>/character", "<包id>")` 引入。
    - 老版本塞在入口里的 `//#noname-editor-workspace-begin … end` 大段 lib 注入会被自动清掉。
    - 文件里会**补 translate**：自定义势力（`x19D6_editor.groups` 里记的中文名，编辑器选/建势力时自动记）与宗族，
      否则游戏里只会显示原 id（如 `bqzj_qi`）。拼音会归一成字符串（草稿里的 `[""]` / 按字数组都不再直接写进去）。
    - **自建的势力 / 宗族会持久化**（`x19D6_editor.groups.<势力id>` = 中文名、`x19D6_editor.clans` = 名字数组），
      打开编辑器时自动补回选项列表；自定义势力选项没有图片时不再写 `url(undefined)`（否则渲染成空白格）。
    - **技能定义跟着武将一起落盘**（`skill: { … }` 段）：武将 `skills` 里引用到的技能，只要**不是游戏本体技能**，
      定义就写进所属武将包文件（同一个技能只写一次，归到包 id 排序最前的那个包）；**本体技能只引用、不写定义**
      （写了会在重启时报 duplicated skill，甚至盖掉核心技能）。本体技能表 = `character/` 目录下的包
      ∩ `lib.characterPack`（本体在 app 根、扩展在 `extension/` 下，边界就靠这个）。
    - 技能定义里的 `translation` / `description`（shya 宏的产出）会**拆到 `translate`**
      （`<技能id>` / `<技能id>_info`），不留在技能体里——引擎不认这两个字段，只认 `lib.translate`。
    - 定义由**本局 `lib.skill` 序列化**得到（函数走 `toString`，方法简写会补成函数表达式），编辑器里新建的技能
      因此不用重新编译；其他扩展的技能会被拷一份进来（若它引用了原扩展的模块级变量，拷来的副本可能跑不通）。
    - shya 源码另存 `extension/<工作区>/src/shya/<技能id>.shya`（目录可在设置页「工作区」段改，默认 `src/shya`）：
      源码来自技能库 `x19D6_editor.skills.<技能id>`（shya 编辑器「生成」与 AI「一键应用」都会写；
      旧的 `x19D6_editor.ai.appliedSkills` 作只读兜底）。
    - 生成逻辑在 `module/editor/persist/`：`packageFile.mjs`（纯函数生成文本）/ `skills.mjs`（序列化 + 本体技能表）/
      `workspace.mjs`（IO 编排）/ `skillLibrary.mjs`（技能库）。整文件覆盖、幂等，自检 `_x19D6_backup/tools/package-file-check.mjs`。



## AI 区域（侧栏「AI」页）

顶部标签栏四页：**生成设计稿** / **生成技能** / **生成原画** / **生成历史**（当前页记在 `x19D6_editor.ai.ui.lastTab`；
窄侧栏放不下时标签自动换行，不压省略号）。「⚙ 配置」「❓ 引导」是整页替换的浮层，不做绝对定位覆盖层。

- **生成设计稿**：一句话 → 2 个候选武将（属性 + 每个技能一份 shya 源码）。技能卡上「编译校验」看诊断，
  「一键应用」= 编译 → 局内生效 → 新建武将草稿 → 逐个补技能卡（技能定义随武将一起落盘）。
  「优化提示」把随口一写改写成明确的设计需求。
- **生成技能**：只产**单个技能**。输入一句话 + 「技能种类」下拉（留空 = 让模型自己挑骨架）+ 生成数量 1~2 +
  「给谁写」（当前设计稿 / 主区打开的武将草稿，选中后把该武将的名字·势力·体力·已有技能写进需求）。
  AI 出 N 份 shya 源码后**当场自动编译一次**，卡片上显示诊断；「生成」= 编译 → 局内生效 →
  写进技能草稿库（侧栏「技」立刻可见、可拖进武将的技能区），另有「编译校验 / 打开技能编辑器 / 复制源码」。
  id 与源码 `#skill` 槽由 `ai/prompts.mjs:alignSkillSlot` 对齐，避免「编译过但注入找不到 `const <id>`」。
- **生成原画**：据武将资料出竖版立绘，先落成候选图；点「用作立绘」才走武将编辑器自己的 `saveLocalAsset`
  （目录配置、`<武将id>.<ext>` 命名、与草稿同生共死都在那里）。
- **AI 技能书**（`ai/skill.md`，面板里可改可关）与 token 用量条：技能书作用于「生成设计稿」与「生成技能」；
  用量条只统计对话调用（生图按张计费、不计 token）。

配置按「服务商列表 → 配置页」两级，预设见 `ai/profiles.mjs`；网络层 `ai/client.mjs`、提示词 `ai/prompts.mjs`、
技能源码编译前后处理 `ai/skills.mjs`、持久化 `ai/store.mjs`。
⚠️ 编译前**两个宿主宏库都要注入**（`ai/skills.mjs:ensureHostImports`）：`skill-type.shya` 是技能骨架宏
（`@skill_trigger` 等），`skill-content.shya` 是内容宏（`@draw` / `@damage` / `@judge_color` …）——
少注入后者时，模型按提示词写的内容宏会以「宏未定义」编译失败。
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
    component-ai.mjs           <ai-panel> 侧栏 AI 页（生成设计稿 / 生成技能 / 生成原画 / 生成历史）
    ai/                        AI 区：profiles 预设 / client 网络 / prompts 提示词 / skills 编译前后 / store 持久化
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
- **技能草稿列表 / 按工作区过滤**：数据源已就位（`x19D6_editor.skills.<技能id>` 带 `workspace` 归属，
  shya 编辑器与 AI 应用都会写），还差侧栏的技能列表 UI（下一轮）。旧版中文语句编辑器的全局缓存
  `x19D6_editorSkillCache` 仍无归属，它生成的技能要先「生成」进 `lib.skill` 才会被武将落盘带走。
- `module/editor/mindmap.mjs` 是无人引用的孤儿文件。

已实现（本轮起）：武将**称号**（`component.mjs` 的 `characterAttributes` 含 `title`，纳入草稿持久化与导出数据）。