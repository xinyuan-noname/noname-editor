# `<noname-dialog>` 自定义对话框组件文档

## 概述
`<noname-dialog>` 是一个基于 Web Components 的自定义对话框组件，提供了多种类型的对话框功能，包括提示框、确认框、输入框、选择框等。

## 基本用法


###  创建对话框
```javascript
const dialog = document.createElement('noname-dialog');
document.body.appendChild(dialog);
```

## 对话框类型

### 提示框 (alert)
```javascript
dialog.type = 'alert';
dialog.headline = '提示';
dialog.message = '这是一个提示信息';
```

###  确认框 (confirm)
```javascript
dialog.type = 'confirm';
dialog.headline = '确认';
dialog.message = '您确定要执行此操作吗？';
```

###  输入框 (prompt)
```javascript
dialog.type = 'prompt';
dialog.headline = '输入';
dialog.message = '请输入内容:';
dialog.placeholder = '请输入...';
```

### 选择框 (select)
```javascript
dialog.type = 'select';
dialog.headline = '选择';
dialog.message = '请选择一个选项:';
dialog.options = {
  'option1': '选项1',
  'option2': '选项2',
  'option3': '选项3'
};
```

###  可添加选项的选择框 (select-append)
```javascript
dialog.type = 'select-append';
dialog.headline = '选择或添加';
dialog.message = '请选择或添加新选项:';
dialog.options = {
  'option1': '选项1',
  'option2': '选项2'
};
```

### 武将ID输入框 (id-character)
```javascript
dialog.type = 'id-character';
dialog.headline = '输入武将ID';
```

### 自定义势力对话框 (diygroup)
```javascript
dialog.type = 'diygroup';
dialog.headline = '自定义势力';
```

### 富文本编辑器 (text)
```javascript
dialog.type = 'text';
dialog.headline = '文本编辑';
dialog.message = '<p>初始文本内容</p>';
```

### 扩展设置 (extension-setting)
```javascript
dialog.type = 'extension-setting';
dialog.headline = '扩展设置';
```

## 属性

| 属性名| 类型| 描述 |
| --- | --- | --- |
| type | string | 对话框类型 |
| headline | string | 对话框标题 |
| message | string | 对话框内容/初始值 |
| placeholder | string | 输入框的占位文本 |
| height | number | 对话框高度(px) |
| width | number | 对话框宽度(px) |
| forced | boolean | 是否强制(只显示确认按钮) |
| required | boolean | 输入/选择是否必填 |
| invalid | boolean | 是否显示为无效状态 |

## 方法

### `wait()`
返回一个Promise，用于获取对话框的结果。

```javascript
const result = await dialog.wait();
```

### `close()`
关闭对话框。

### `show()`
显示对话框。

### `updateWithValidity()`
更新对话框的有效性状态。

### `appendInput(subTitle, config)`
添加输入框到对话框。

### `appendSelect(subTitle, options, config)`
添加选择框到对话框。

### `appendButton(text, config)`
添加按钮到对话框。

## 事件

### `dialogend`
当用户点击确认按钮时触发。

### `dialogcancel`
当用户点击取消按钮时触发。

## 高级用法

### 1. 自定义验证
```javascript
dialog.appendCheck = function(id, name) {
  // 自定义验证逻辑
  return id && name; // 返回true表示验证通过
};
```

### 2. 设置配置
```javascript
dialog.config = {
  'extension1': {
    'extension-character-image': 'path/to/image',
    'extension-card-image': 'path/to/card',
    // ...
  }
};
```

### 3. 自定义标签内容
```javascript
dialog.labelContent = {
  'group': '自定义势力名称',
  'group-id': '自定义势力ID'
  // ...
};
```

## 样式定制
组件内置了基础样式，可以通过Shadow DOM中的CSS变量进行定制：

```css
:host {
  --dialog-height: 315px; /* 默认高度 */
  --dialog-width: 560px;  /* 默认宽度 */
}
```

## 示例代码

### 基本选择框示例
```javascript
const dialog = document.createElement('noname-dialog');
dialog.type = 'select';
dialog.headline = '选择水果';
dialog.options = {
  'apple': '苹果',
  'banana': '香蕉',
  'orange': '橙子'
};
document.body.appendChild(dialog);

const selectedValue = await dialog.wait();
console.log('用户选择了:', selectedValue);
```

### 富文本编辑器示例
```javascript
const dialog = document.createElement('noname-dialog');
dialog.type = 'text';
dialog.headline = '编辑内容';
dialog.message = '<p>初始内容</p>';
document.body.appendChild(dialog);

const result = await dialog.wait();
console.log('HTML内容:', result.sourceHTML);
console.log('无P标签的HTML:', result.noPElementHTML);
```

## 注意事项
1. 组件依赖于 `HTMLNonameFocusUIElement` 基类
2. 富文本编辑器类型需要加载wangEditor库
3. 对话框是模态的，同一时间只会显示一个对话框
4. 组件会自动管理对话框堆栈

## 浏览器兼容性
组件使用现代Web标准，兼容所有支持Web Components的主流浏览器。