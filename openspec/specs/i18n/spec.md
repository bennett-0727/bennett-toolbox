# i18n Specification

## Purpose
定义 Bennett Toolbox 的中英双语能力，确保用户可见文案、错误和系统对话框随语言设置切换，并在重启后保持。

## Requirements

### Requirement: 语言切换与持久化

系统 SHALL 提供 中文 / English 切换，并 MUST 将选择持久化到本地，重启后恢复。

#### Scenario: 切换到英文

- **WHEN** 用户点击 English
- **THEN** 所有当前界面文案立即切换为英文，`document.documentElement.lang` 为 `en-US`

#### Scenario: 重启恢复

- **WHEN** 用户选择 English 后重新打开应用
- **THEN** 界面默认显示英文

### Requirement: 全部用户可见文案国际化

系统 MUST 对导航、标题、按钮、占位符、帮助文本、进度、错误、空状态和原生对话框进行翻译；英文模式下 MUST NOT 出现中文界面文案。

#### Scenario: 英文扫描所有模块

- **WHEN** 依次打开 11 个模块并触发上传、转换、搜索、取色等状态
- **THEN** 页面可见文本和文本属性中不出现中文

#### Scenario: 主进程错误

- **WHEN** 语言为英文且 IPC 返回校验错误
- **THEN** 错误信息为英文

### Requirement: 含文字图形使用 SVG

新增的含文字图标或示意图形 MUST 使用 SVG，不得把中文烘焙进位图。

#### Scenario: 语言切换图标

- **WHEN** 查看侧边栏语言切换
- **THEN** 图标为内联 SVG，文字由 DOM 渲染以支持翻译
