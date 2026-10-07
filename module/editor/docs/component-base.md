# HTMLNonameFocusUIElement 组件基类介绍

`HTMLNonameFocusUIElement` 是一个扩展自 `HTMLElement` 的自定义元素类，它提供了一系列方法用于执行文件、文本、玩家数据、卡片信息、样式、多媒体以及画布操作。以下是该组件基类的详细使用说明。

## 初始化

构造函数 `constructor()` 自动初始化时会创建一个新的 `NonameData` 实例作为服务器交互层，通过这个实例可以与后端进行数据交换。

```javascript
constructor() {
    super();
    this.#server = new NonameData();
}
```

## 方法概览

### 文件查询

- `fileQuery(mode, query)`: 根据不同的模式（如读取文件、提交文件等）和查询参数执行文件相关的操作。
  
  示例：
  ```javascript
  element.fileQuery("readFile", { format: "url", encoding: "utf-8", file: someFile });
  ```

### 文本查询

- `textQuery(mode, query)`: 执行文本转换或获取特定格式的文本内容（例如拼音转换、字符翻译等）。
  
  示例：
  ```javascript
  element.textQuery("pinyin", { text: "你好", withTone: true });
  ```

### 玩家查询

- `playerQuery(mode, query)`: 获取玩家状态、氏族技能ID等玩家相关信息。
  
  示例：
  ```javascript
  element.playerQuery("hpStatus", { hp: 100, maxHp: 200 });
  ```

### 卡片查询

- `cardQuery(mode, query)`: 目前没有具体实现，预留为未来扩展。

### 检查查询

- `checkQuery(mode, query)`: 验证角色ID或技能标签的有效性。
  
  示例：
  ```javascript
  element.checkQuery("characterId", { id: "char123" });
  ```

### 信息查询

- `infoQuery(mode, query)`: 获取信息。
  
  示例：
  ```javascript
  element.infoQuery("skill", { skillId: "skill456", characterId: "char123" });
  ```

### 样式查询

- `styleQuery(mode, query)`: 获取特定样式的CSS属性值（目前仅支持文本阴影）。
  
  示例：
  ```javascript
  element.styleQuery("textShadow", { nature: "fire" });
  ```

### 多媒体查询

- `multiMediaQuery(mode, query)`: 控制音频播放、静态图片剪辑、GIF剪辑等功能。
  
  示例：
  ```javascript
  element.multiMediaQuery("audioPlay", { src: audioUrl, volume: 0.5 });
  ```

### 画布查询

- `canvasQuery(mode, query)`: 支持将画布导出为静态图像或将文本绘制到画布上。
  
  示例：
  ```javascript
  element.canvasQuery("exportAsStaticImage", { canvas: myCanvas, type: "png", quality: 0.9 });
  ```

以上是`HTMLNonameFocusUIElement`的基本用法概述。