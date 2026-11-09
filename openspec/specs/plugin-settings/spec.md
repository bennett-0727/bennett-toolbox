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

### Requirement: 自动检查插件更新

应用 SHALL 在每次启动并完成初始插件快照加载后，后台自动请求一次最新插件 registry；请求成功时 MUST 更新可安装与可更新列表，使已安装插件的新版本自动显示“更新”入口，无需用户手动刷新。自动刷新失败 MUST 静默回退到本地缓存，保持界面可用且不显示错误提示；同一时间 MUST 只存在一个 registry 刷新请求，自动刷新与手动刷新 SHALL 合并为同一请求。

#### Scenario: 启动自动发现更新

- **WHEN** 本地存在旧 registry 缓存且远端已有更高版本的已安装插件
- **THEN** 应用启动后自动完成刷新，工作台已安装插件出现“更新 vX”按钮，用户无需点击“刷新插件列表”

#### Scenario: 无可用更新

- **WHEN** 远端 registry 中的插件版本不高于已安装版本
- **THEN** 不显示更新按钮，registry 更新时间更新为最新

#### Scenario: 自动刷新失败

- **WHEN** 自动刷新请求失败、超时或返回无效数据
- **THEN** 保留缓存中的插件列表与安装状态，不显示错误提示，其他功能不受影响

#### Scenario: 并发刷新合并

- **WHEN** 自动刷新进行中用户点击“刷新插件列表”
- **THEN** 仅产生一个 registry 请求，手动刷新复用该请求的结果

#### Scenario: 刷新期间界面可交互

- **WHEN** 后台自动刷新正在进行
- **THEN** 用户仍可打开已安装插件并正常使用，插件区域不被全局加载状态阻塞
