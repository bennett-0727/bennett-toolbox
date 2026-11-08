# Spec Delta

## Purpose

让本地 AI 客户端通过 MCP stdio 直接调用 Bennett Toolbox 的 JSON 格式化、SQLite 只读查询与 MarkItDown 文档转换能力。

## ADDED Requirements

### Requirement: MCP stdio 服务

系统 SHALL 提供可通过 `node mcp/server.mjs` 启动的 MCP stdio 服务，启动后 MUST 能列出 `json_format`、`sqlite_query`、`markitdown_convert` 三个 tools，并将协议日志与业务日志分离到 stderr。

#### Scenario: 客户端连接

- **WHEN** AI 客户端以 stdio 启动服务并请求 tools 列表
- **THEN** 返回三个工具及其 JSON Schema，进程保持运行

#### Scenario: 工具错误

- **WHEN** 工具参数非法或底层执行失败
- **THEN** 返回可读错误内容且服务不退出

### Requirement: JSON 格式化

`json_format` SHALL 接受 JSON 字符串、可选缩进与压缩模式，返回格式化或压缩后的文本；无效 JSON MUST 返回错误说明。

#### Scenario: 格式化

- **WHEN** 客户端提交合法 JSON 且 `minify=false`
- **THEN** 返回带缩进的可读 JSON

#### Scenario: 压缩

- **WHEN** 客户端设置 `minify=true`
- **THEN** 返回无多余空白的单行 JSON

#### Scenario: 非法 JSON

- **WHEN** 输入无法解析
- **THEN** 返回 `isError` 与解析错误信息

### Requirement: SQLite 只读查询

`sqlite_query` SHALL 以只读方式打开本地 SQLite 文件，执行单条 `SELECT` / `WITH` / `PRAGMA` / `EXPLAIN` 查询，返回列名、行数据、行数与是否截断；写语句 MUST 被拒绝，结果行数 SHALL 受 `limit` 限制（默认 200，最大 1000）。

#### Scenario: 查询数据

- **WHEN** 客户端传入存在的数据库路径与 SELECT 语句
- **THEN** 返回列与行数据，BigInt/BLOB 可序列化

#### Scenario: 拒绝写入

- **WHEN** 客户端提交 INSERT/UPDATE/DELETE 或带写入的 PRAGMA
- **THEN** 返回错误且数据库不被修改

#### Scenario: 截断

- **WHEN** 查询结果超过 limit
- **THEN** 返回前 limit 行并标记 truncated=true

### Requirement: MarkItDown 文档转换

`markitdown_convert` SHALL 调用本机 MarkItDown 可执行文件，把指定本地文件转换为 Markdown；二进制优先取 `MARKITDOWN_BIN`，否则使用已安装组件目录。路径不存在或转换失败 MUST 返回可读错误。

#### Scenario: 转换成功

- **WHEN** 客户端传入存在的文档路径且 MarkItDown 可用
- **THEN** 返回转换后的 Markdown 文本

#### Scenario: 组件缺失

- **WHEN** 未设置 `MARKITDOWN_BIN` 且未安装组件
- **THEN** 返回错误并提示安装组件或设置环境变量
