# plugin-framework Specification

## Purpose
TBD - created by archiving change add-plugin-framework. Update Purpose after archive.

## Requirements

### Requirement: 插件包与清单

系统 SHALL 支持 ZIP 插件包，包内 MUST 包含 `plugin.json` 与入口 `main.js`。清单 MUST 声明 id、双语名称/描述、版本、apiVersion、minAppVersion、入口、图标与 activation；id MUST 为反向域名格式。

#### Scenario: 合法插件包

- **WHEN** 用户安装 registry 中校验通过的插件包
- **THEN** 插件解压到用户数据目录的版本化目录，清单与 registry 的 id/version 一致

#### Scenario: 非法清单

- **WHEN** 插件清单缺失字段、id 非法或版本不兼容
- **THEN** 安装被拒绝并返回可读错误，不写入状态

### Requirement: 安装安全

安装器 SHALL 只从固定 GitHub 插件仓库的 HTTPS 地址下载，MUST 校验文件大小与 SHA-256，并拒绝绝对路径、盘符、反斜杠、`..`、空字节与符号链接条目。安装 MUST 使用 staging 目录并通过原子 rename 提交。

#### Scenario: 篡改包

- **WHEN** 下载文件与 registry 中的 SHA-256 不一致
- **THEN** 安装失败，staging 被清理，现有版本不受影响

#### Scenario: 路径穿越包

- **WHEN** ZIP 条目包含 `../` 或绝对路径
- **THEN** 解压被拒绝，不创建插件目录

### Requirement: 插件加载与生命周期

宿主 SHALL 仅加载已启用插件，MUST 支持 on-demand 与 resident 两种激活方式；插件 MUST 能注册 mount/unmount，宿主 MUST 在切换模块、停用、更新与语言切换时执行清理。

#### Scenario: 按需加载

- **WHEN** 用户首次打开已启用的按需插件
- **THEN** 宿主读取并执行插件 bundle，挂载插件界面，再次进入不重复执行

#### Scenario: 常驻插件

- **WHEN** 应用启动且插件处于启用+常驻状态
- **THEN** 宿主预加载插件并调用 activate，但界面仅在用户打开时挂载

#### Scenario: 停用插件

- **WHEN** 用户停用插件
- **THEN** 插件从侧栏移除，已挂载实例执行 unmount/cleanup

### Requirement: 插件错误隔离

插件加载或挂载失败 MUST 只在插件区域显示错误，不得导致主界面白屏。

#### Scenario: 插件抛错

- **WHEN** 插件 mount 抛出异常
- **THEN** 主界面保留，插件区域显示错误提示，其他模块可继续使用

### Requirement: 插件资产

插件 bundle SHALL 提供 baseUrl 与 `assets.url()`，MUST 拒绝绝对路径、反斜杠与 `..`；PDF worker 等资产可从插件版本目录加载。

#### Scenario: PDF worker

- **WHEN** 打开 PDF 插件
- **THEN** workerSrc 指向插件目录内 `pdf.worker.min.mjs`，转换可用

### Requirement: 主题与语言生命周期

主题切换 MUST NOT remount 插件；语言切换 MAY remount 以更新翻译。

#### Scenario: 切换主题

- **WHEN** 用户在插件界面切换玻璃主题
- **THEN** 插件保持挂载状态，CSS 令牌即时更新

#### Scenario: 切换语言

- **WHEN** 用户切换中文/English
- **THEN** 插件重新挂载并使用对应语言字典

### Requirement: 插件状态写入一致性

系统 SHALL 串行化插件状态的读取、修改与写入。多个安装、更新、启停或卸载操作并发完成时，系统 MUST 保留全部已成功操作的条目，不得以过期快照覆盖其他操作的结果。

#### Scenario: 并发安装

- **WHEN** 多个插件安装请求同时完成
- **THEN** 插件状态文件包含全部安装成功的插件，插件列表快照与状态文件一致

#### Scenario: 并发状态变更

- **WHEN** 一个插件正在写入状态时另一个操作修改其他插件
- **THEN** 两个操作的结果都保留，不出现条目丢失

### Requirement: 应用单实例运行

应用 MUST 获取单实例锁；已有实例运行时，新的启动请求 MUST NOT 创建独立主窗口或额外状态写者，并 SHALL 聚焦已有主窗口。

#### Scenario: 重复启动

- **WHEN** 应用已运行且用户再次启动应用
- **THEN** 不出现第二个主窗口，已有窗口被显示并聚焦

#### Scenario: 不同用户数据目录

- **WHEN** 两次启动使用不同的用户数据目录
- **THEN** 两个实例可同时运行且互不干扰
