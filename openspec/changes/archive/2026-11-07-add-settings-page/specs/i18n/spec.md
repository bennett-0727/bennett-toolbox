# Spec Delta

## ADDED Requirements

### Requirement: 含文字图形使用 SVG 或 DOM

新增的含文字图标或示意图形 MUST 使用 SVG 或 DOM/CSS 绘制，不得把中文烘焙进位图。

#### Scenario: 设置页图形

- **WHEN** 查看设置页语言与主题选项
- **THEN** 选项文字由 DOM 渲染以支持翻译，图形使用 CSS 或内联 SVG

## MODIFIED Requirements

### Requirement: 语言切换与持久化

系统 SHALL 提供 中文 / English 切换，并 MUST 将选择持久化到本地，重启后恢复；语言选项 MUST 位于设置页。

#### Scenario: 切换到英文

- **WHEN** 用户在设置页点击 English
- **THEN** 所有当前界面文案立即切换为英文，`document.documentElement.lang` 为 `en-US`

#### Scenario: 重启恢复

- **WHEN** 用户选择 English 后重新打开应用
- **THEN** 界面默认显示英文，设置页 English 选项为激活状态

### Requirement: 全部用户可见文案国际化

系统 MUST 对导航、设置页、标题、按钮、占位符、帮助文本、进度、错误、空状态和原生对话框进行翻译；英文模式下 MUST NOT 出现中文界面文案（语言选项的本地名称除外）。

#### Scenario: 英文扫描所有模块

- **WHEN** 依次打开 11 个模块并触发上传、转换、搜索、取色等状态
- **THEN** 页面可见文本和文本属性中不出现中文

#### Scenario: 英文扫描设置页

- **WHEN** 语言为英文并打开设置页
- **THEN** 外观、语言说明、版本与更新等文案均为英文，属性中不出现中文

#### Scenario: 主进程错误

- **WHEN** 语言为英文且 IPC 返回校验错误
- **THEN** 错误信息为英文

## REMOVED Requirements

### Requirement: 含文字图形使用 SVG

**Reason**: 语言切换控件已从侧边栏移入设置页，原侧边栏语言图标场景不再存在。

**Migration**: 使用“含文字图形使用 SVG 或 DOM”要求，设置页选项文字由 DOM 渲染，图形使用 CSS 或内联 SVG。
