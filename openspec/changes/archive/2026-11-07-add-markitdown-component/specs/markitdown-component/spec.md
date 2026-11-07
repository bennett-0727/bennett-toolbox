# Spec Delta

## ADDED Requirements

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
