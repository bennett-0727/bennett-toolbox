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
