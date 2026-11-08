# mcp-integration Specification

## Purpose
让本地 AI 客户端通过 MCP stdio 直接调用 Bennett Toolbox 的 JSON 格式化、SQLite 只读查询与 MarkItDown 文档转换能力。

## Requirements

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

### Requirement: 文件搜索

`file_search` SHALL 在指定目录内按文件名递归搜索，支持大小写、深度与结果数量限制；MUST NOT 跟随符号链接目录，结果超限时返回 `truncated=true`。

#### Scenario: 搜索文件

- **WHEN** 客户端传入存在目录与关键词
- **THEN** 返回匹配文件的绝对路径、名称、大小与修改时间

#### Scenario: 限制结果

- **WHEN** 匹配数量超过 limit
- **THEN** 只返回前 limit 条并标记截断

### Requirement: 时间转换

`time_convert` SHALL 接受 epoch 秒/毫秒或 ISO 时间，并按来源与目标 IANA 时区转换，返回 ISO、格式化文本与 epoch。非法时间或时区 MUST 返回可读错误。

#### Scenario: 时间戳转时区

- **WHEN** 客户端提交 epoch 与目标时区
- **THEN** 返回目标时区的 ISO 与格式化时间

### Requirement: Cron 下次运行

`cron_next` SHALL 解析 5/6 字段 Cron 表达式，返回指定时区下接下来 N 次运行时间（1–20 条）。非法表达式或时区 MUST 返回错误。

#### Scenario: 计算运行时间

- **WHEN** 客户端提交合法表达式与时区
- **THEN** 返回按时间排序的 ISO 时间列表

### Requirement: 二维码生成

`qr_generate` SHALL 根据文本生成 PNG 或 SVG；PNG MUST 以 MCP image content 返回 base64，SVG SHALL 以文本返回。文本为空 MUST 返回错误。

#### Scenario: 生成 PNG

- **WHEN** 客户端提交文本且 format=png
- **THEN** 返回 image/png 内容与尺寸说明

#### Scenario: 生成 SVG

- **WHEN** 客户端设置 format=svg
- **THEN** 返回包含 `<svg` 的文本

### Requirement: 编码与哈希

`encoding_convert` SHALL 支持 Base64、URL 与 Hex 编解码；`hash_text` SHALL 支持 MD5/SHA1/SHA256/SHA512 与 HMAC-SHA256，并返回 hex 或 base64。非法输入 MUST 返回可读错误。

#### Scenario: Base64 往返

- **WHEN** 客户端先编码再解码同一文本
- **THEN** 得到原文

#### Scenario: HMAC

- **WHEN** 客户端提交文本与密钥计算 HMAC-SHA256
- **THEN** 返回确定的摘要

### Requirement: JWT 解码

`jwt_decode` SHALL 解析 JWT header/payload；提供 HMAC 密钥时 MUST 校验 HS256/384/512 签名并在结果中标记是否有效。

#### Scenario: 解码与校验

- **WHEN** 客户端提交合法 JWT 与密钥
- **THEN** 返回 header、payload 与 signatureValid

### Requirement: 正则与文本 Diff

`regex_test` SHALL 执行正则匹配、分组与可选替换，限制匹配数量；`text_diff` SHALL 返回 unified diff 及新增/删除行数。输入超限 MUST 返回错误。

#### Scenario: 正则匹配

- **WHEN** 客户端提交 pattern 与文本
- **THEN** 返回匹配内容、索引与捕获组

#### Scenario: 文本 Diff

- **WHEN** 客户端提交两段文本
- **THEN** 返回 unified diff 与 added/removed 统计

### Requirement: 图片信息与转换

`image_info` SHALL 返回图片格式、宽高、通道与文件大小；`image_convert` SHALL 支持 PNG/JPEG/WebP 转换、质量控制与尺寸缩放，并以 MCP image content 返回结果，不写本地文件。

#### Scenario: 查询图片

- **WHEN** 客户端传入有效图片路径
- **THEN** 返回格式、尺寸与文件大小

#### Scenario: 转换图片

- **WHEN** 客户端指定目标格式
- **THEN** 返回对应 MIME 的 image content 与输出尺寸

### Requirement: MCP 操作日志

MCP 服务 MUST 为每次工具调用写入结构化日志，包含时间、工具名、参数摘要、耗时、成功状态与错误信息；敏感字段 MUST 脱敏，长文本 MUST 截断。日志 SHALL 写入平台固定目录，支持环境变量覆盖，并在超过 5MB 时轮转。

#### Scenario: 成功调用

- **WHEN** 工具成功返回
- **THEN** 日志包含工具名、耗时、success=true 与结果摘要

#### Scenario: 失败调用

- **WHEN** 工具返回错误或抛出异常
- **THEN** 日志包含 success=false 与可读错误

#### Scenario: 敏感参数

- **WHEN** 调用包含 secret/key/token/password
- **THEN** 日志中对应值被替换为 [REDACTED]

#### Scenario: 日志位置

- **WHEN** 服务启动
- **THEN** stderr 与日志记录日志文件路径；`BENNETT_MCP_LOG_DIR` 可覆盖目录

### Requirement: MCP 发布产物

系统 SHALL 提供 MCP 独立发布流程，生成 standalone `.mjs`、可安装 ZIP 与 SHA-256 校验文件；发布 tag MUST 使用 `mcp-v*`，且 MUST NOT 修改桌面应用版本或成为应用更新源。

#### Scenario: 独立发布

- **WHEN** 推送 `mcp-v0.2.0` tag
- **THEN** Release 包含 MCP standalone、ZIP、校验文件，且不标记为应用最新版本

#### Scenario: 安装 ZIP

- **WHEN** 用户解压 ZIP 并执行 `npm install && npm start`
- **THEN** MCP 服务可启动并列出全部工具

#### Scenario: Standalone

- **WHEN** 用户使用 standalone `.mjs` 启动
- **THEN** 除依赖 sharp 的图片工具外，其余工具可用
