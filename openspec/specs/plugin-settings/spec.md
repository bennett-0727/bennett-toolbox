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
