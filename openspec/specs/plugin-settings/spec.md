# plugin-settings Specification

## Purpose
TBD - created by archiving change add-plugin-framework. Update Purpose after archive.

## Requirements

### Requirement: 插件管理入口

设置页 SHALL 提供“插件”卡片，展示已安装插件与可安装插件，MUST 显示名称、版本、启用状态、常驻状态与可用更新。

#### Scenario: 打开插件管理

- **WHEN** 用户进入设置页
- **THEN** 插件卡片列出已安装插件，并提供刷新 registry 与打开插件目录的入口

### Requirement: 插件操作

插件卡片 SHALL 支持安装、启用、停用、切换常驻/按需、更新与卸载。操作期间 MUST 显示进行中状态，失败 MUST 显示可读错误且不破坏已安装版本。

#### Scenario: 安装插件

- **WHEN** 用户点击可安装插件的“安装”
- **THEN** 显示下载/安装进度，成功后插件出现在侧栏并可打开

#### Scenario: 切换常驻

- **WHEN** 用户将插件从按需改为常驻
- **THEN** 状态持久化，下次启动预加载并激活该插件

#### Scenario: 卸载插件

- **WHEN** 用户卸载当前打开的插件
- **THEN** 插件从侧栏移除，界面回退到默认模块，插件文件被删除

### Requirement: 插件本地化与主题

插件名称与描述 MUST 按当前语言显示；插件界面 MUST 跟随主题令牌，英文模式下不得出现中文界面文案。

#### Scenario: 英文插件管理

- **WHEN** 语言为 English 且打开插件卡片
- **THEN** 插件名称、描述、按钮与状态均为英文

#### Scenario: 浅色主题插件

- **WHEN** 应用处于浅色玻璃主题并打开插件
- **THEN** 插件界面使用宿主浅色令牌与玻璃表面，文字清晰可读

### Requirement: 工作台管理

插件安装、启用、停用、常驻、更新与卸载 SHALL 在工作台完成；设置页不提供插件管理。

#### Scenario: 默认工作台

- **WHEN** 应用启动且未选择工具
- **THEN** 显示工作台与插件列表，不自动加载任何插件界面

#### Scenario: 卸载插件

- **WHEN** 用户在工作台卸载插件
- **THEN** 插件文件与状态被删除，侧栏移除该插件

### Requirement: Registry 更新时间显示

工作台 MUST 按当前界面语言将 registry 更新时间显示为本地日期时间，不得直接显示 ISO 8601 原始字符串；时间缺失或无法解析时 SHALL 显示“尚未刷新”。

#### Scenario: 中文时间显示

- **WHEN** 语言为中文且 registry 已刷新
- **THEN** 显示形如“更新于 2026/11/07 22:15”的本地时间，不包含 `T`、`Z` 或毫秒

#### Scenario: 英文时间显示

- **WHEN** 语言为 English 且 registry 已刷新
- **THEN** 显示形如“Updated 11/07/2026, 22:15”的本地时间

#### Scenario: 无效时间

- **WHEN** registry 时间缺失或无法解析
- **THEN** 显示“尚未刷新”或对应英文文案，不显示原始字符串
