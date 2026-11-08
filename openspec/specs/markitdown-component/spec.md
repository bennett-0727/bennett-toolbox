# markitdown-component Specification

## Purpose
TBD - created by archiving change add-markitdown-component. Update Purpose after archive.

## Requirements

### Requirement: 组件资产

应用 SHALL 不再在安装包内内置 MarkItDown 二进制，MUST 按平台/架构从应用 Release 下载组件资产，并校验同名 SHA-256。

#### Scenario: 下载组件

- **WHEN** 用户在组件管理中下载 MarkItDown
- **THEN** 应用下载当前平台资产、校验 SHA-256、保存到 userData 组件目录并显示已安装

#### Scenario: 校验失败

- **WHEN** 下载内容与 SHA-256 不一致
- **THEN** 安装失败并保留原状态，不执行下载文件

### Requirement: 组件查找

文档转换 SHALL 优先使用 `MARKITDOWN_BIN`，其次使用已安装组件，最后回退旧 resources/vendor 路径；组件缺失时 MUST 返回可读提示。

#### Scenario: 组件未安装

- **WHEN** 用户未安装组件且没有其他 MarkItDown 来源
- **THEN** 转换返回“需要下载文档转换组件”，界面提供下载入口

#### Scenario: 组件已安装

- **WHEN** 组件安装完成
- **THEN** 文档转换使用组件路径，无需重启应用

### Requirement: 组件下载进度与失败恢复

组件下载 MUST 按实际接收字节数报告进度，不得只发送固定阶段值；下载超时时间 SHALL 不少于 10 分钟。下载、校验或解压失败时，系统 MUST 保留已安装的旧组件并返回可读错误。

#### Scenario: 下载进度

- **WHEN** 用户下载约 118MB 的组件
- **THEN** 进度随已接收字节持续增长，不会长时间停留在同一百分比

#### Scenario: 下载超时

- **WHEN** 网络在 10 分钟内未完成组件下载
- **THEN** 界面显示可读的超时提示，已安装组件仍可继续使用

#### Scenario: 重新下载失败

- **WHEN** 用户重新下载组件但校验或解压失败
- **THEN** 旧的已安装组件不被删除，文档转换继续可用
