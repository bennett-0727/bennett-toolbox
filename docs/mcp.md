# Bennett Toolbox MCP 使用与操作指南

MCP（Model Context Protocol）试点把 Bennett Toolbox 的 14 个本地工具暴露给 AI 客户端。服务通过 stdio 运行，默认只读本地数据，不修改用户文件；除日志外不写磁盘。

## 1. 环境要求

- Node.js 24 及以上（已验证 Node 26.13.0）；SQLite 工具依赖内置 `node:sqlite`。
- 在仓库根目录执行 `npm install`，安装 MCP SDK、zod、cron-parser、luxon、qrcode、diff、sharp。
- 当前为源码仓库试点，MCP 服务未打包进桌面应用安装包。

## 2. 启动与客户端配置

MCP 服务由 AI 客户端以 stdio 启动，通常不需要在终端手动运行。手动启动命令：

```bash
npm run mcp
```

在客户端的 MCP 配置中加入（路径替换为绝对路径）：

```json
{
  "mcpServers": {
    "bennett-toolbox": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/bennett-toolbox/mcp/server.mjs"],
      "env": {
        "MARKITDOWN_BIN": "/optional/path/to/markitdown",
        "BENNETT_MCP_LOG_DIR": "/optional/log/directory"
      }
    }
  }
}
```

注意：

- `command` 必须是 Node 24+ 的绝对路径，避免客户端使用系统旧版 Node 导致 `node:sqlite` 不可用。
- 修改配置后需要重启客户端或重新加载 MCP 服务。
- 客户端未显示工具时，先检查服务 stderr 与日志文件。

### 下载发布版

MCP 服务通过独立 `mcp-v*` Release 发布，不影响桌面应用版本。在 GitHub Releases 筛选 `mcp-v`：

- ZIP：解压后执行 `npm install && npm start`（包含 sharp，图片工具可用）。把客户端 `args` 指向解压目录内的 `server.mjs`。
- Standalone：直接下载 `bennett-mcp-*.mjs`，客户端 `args` 指向该文件；图片工具需要另行安装 sharp。
- 使用 `.sha256` 文件校验下载内容。

```json
{
  "mcpServers": {
    "bennett-toolbox": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/extracted/server.mjs"]
    }
  }
}
```

## 3. 工具参考

所有工具成功时返回 MCP content；参数错误或执行失败时返回 `isError: true` 与可读文本。本地路径建议使用绝对路径。

### 3.1 `json_format`

格式化或压缩 JSON。

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `json` | string | 是 | JSON 字符串 |
| `indent` | number | 否 | 缩进空格 0–8，默认 2 |
| `minify` | boolean | 否 | true 时输出单行 |

```json
{ "json": "{\"b\":2,\"a\":1}", "indent": 2 }
```

无效 JSON 返回 `Invalid JSON: ...`。

### 3.2 `sqlite_query`

只读执行单条 SQLite 语句。

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `database` | string | 是 | 本地 `.db/.sqlite` 文件路径 |
| `sql` | string | 是 | 单条 SELECT/WITH/PRAGMA/EXPLAIN |
| `limit` | number | 否 | 返回行数 1–1000，默认 200 |

返回：

```json
{
  "database": "/path/app.db",
  "columns": ["id", "name"],
  "rows": [[1, "Alice"]],
  "rowCount": 1,
  "truncated": false
}
```

约束：

- 数据库以 `readOnly` 打开；INSERT/UPDATE/DELETE、DDL、带 `=` 的 PRAGMA 会被拒绝。
- 只允许一条语句；超过 `limit` 时 `truncated=true`。
- 普通整数返回 number；超过安全范围的整数返回字符串；BLOB 返回 `<BLOB n B>`。
- 查看表结构可用：
  ```sql
  SELECT name, type FROM sqlite_master WHERE type IN ('table','view') ORDER BY name
  ```
  或 `PRAGMA table_info("表名")`。

### 3.3 `markitdown_convert`

调用本机 MarkItDown 把文档转为 Markdown。

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `path` | string | 是 | 本地文档路径 |
| `timeout_ms` | number | 否 | 1000–120000，默认 120000 |

二进制查找顺序：

1. 环境变量 `MARKITDOWN_BIN`
2. `BENNETT_MARKITDOWN_COMPONENT_DIR`
3. 已安装组件目录（macOS 为 `~/Library/Application Support/bennett-toolbox/components/markitdown/<version>/markitdown`）

未安装组件时返回错误，提示安装组件或设置 `MARKITDOWN_BIN`。

### 3.4 `file_search`

按文件名递归搜索目录。

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `directory` | string | 是 | 目录绝对路径 |
| `query` | string | 是 | 文件名子串 |
| `depth` | number | 否 | 递归深度 1–20，默认 5 |
| `limit` | number | 否 | 结果数 1–500，默认 100 |
| `case_sensitive` | boolean | 否 | 默认 false |

返回 `{ directory, query, scanned, count, truncated, results }`；结果只包含文件，不跟随符号链接，包含路径、名称、大小、修改时间。

### 3.5 `time_convert`

时间戳/ISO 时间在 IANA 时区间转换。

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `value` | string \| number | 是 | epoch 秒/毫秒或 ISO 时间 |
| `from_timezone` | string | 否 | 默认 UTC |
| `to_timezone` | string | 否 | 默认 UTC |

数字或纯数字字符串：长度 ≥ 13 按毫秒，否则按秒。返回 UTC ISO、目标时区 ISO、格式化时间、偏移、epoch 秒/毫秒。

```json
{ "value": 0, "from_timezone": "UTC", "to_timezone": "Asia/Shanghai" }
```

### 3.6 `cron_next`

计算 Cron 下次运行时间。

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `expression` | string | 是 | 5/6 字段 Cron |
| `timezone` | string | 否 | IANA 时区，默认 UTC |
| `count` | number | 否 | 1–20，默认 5 |

返回 `{ expression, timezone, runs: [{ iso, formatted }] }`。

### 3.7 `qr_generate`

生成二维码。

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `text` | string | 是 | 文本/URL |
| `format` | `png` \| `svg` | 否 | 默认 png |
| `size` | number | 否 | 128–1024，默认 320 |
| `error_correction` | `L`/`M`/`Q`/`H` | 否 | 默认 M |

- `png` 返回 MCP `image/png` content + 尺寸说明。
- `svg` 返回 SVG 文本。

### 3.8 `encoding_convert`

Base64 / URL / Hex 编解码。

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `text` | string | 是 | 输入文本 |
| `operation` | enum | 是 | `base64_encode`、`base64_decode`、`url_encode`、`url_decode`、`hex_encode`、`hex_decode` |
| `component` | boolean | 否 | URL 编解码使用 encodeURIComponent/decodeURIComponent |

### 3.9 `hash_text`

哈希与 HMAC。

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `text` | string | 是 | 输入文本 |
| `algorithm` | enum | 是 | `md5`、`sha1`、`sha256`、`sha512`、`hmac-sha256` |
| `key` | string | HMAC 必填 | HMAC 密钥 |
| `output` | `hex` \| `base64` | 否 | 默认 hex |

### 3.10 `jwt_decode`

解码 JWT，并可用 HMAC 密钥校验签名。

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `token` | string | 是 | JWT |
| `secret` | string | 否 | HS256/384/512 密钥 |

返回 `header`、`payload`、`signatureValid`；未提供密钥时为 `null`，签名不匹配时为 `false`。仅支持 HS 系列校验，不是完整鉴权库。

### 3.11 `regex_test`

JavaScript 正则测试。

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `pattern` | string | 是 | ≤ 500 字符 |
| `flags` | string | 否 | 默认 `g`，允许 `gimsuy` |
| `text` | string | 是 | ≤ 1MB |
| `replacement` | string | 否 | 提供时返回替换后文本 |

返回匹配内容、索引、捕获组、命名组；最多 1000 条。复杂正则可能存在回溯开销，请避免不可信的超复杂 pattern。

### 3.12 `text_diff`

文本 unified diff。

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `old_text` | string | 是 | ≤ 1MB、≤ 5000 行 |
| `new_text` | string | 是 | ≤ 1MB、≤ 5000 行 |
| `context` | number | 否 | 1–10，默认 3 |

返回 `{ added, removed, diff }`；diff 输出去除时间戳。

### 3.13 `image_info`

读取图片元数据。

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `path` | string | 是 | 图片绝对路径 |

返回格式、宽高、通道、alpha、色彩空间与文件大小。

### 3.14 `image_convert`

转换图片，不写本地文件。

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `path` | string | 是 | 图片路径 |
| `format` | `png`/`jpeg`/`webp` | 是 | 目标格式 |
| `quality` | number | 否 | 1–100，默认 82（JPEG/WebP） |
| `width` | number | 否 | 16–4096 |
| `height` | number | 否 | 16–4096 |

宽高按 `inside` 缩放且不放大。返回 MCP image content 与输出尺寸/字节数；结果超过 10MB 拒绝。

## 4. 典型 AI 操作示例

可以直接对 AI 说：

- “格式化这段 JSON，并检查是否合法：……”
- “查询 `/path/app.db` 中 `users` 表前 20 行，按 id 排序。”
- “把 `/path/report.pdf` 转成 Markdown，保存结果到对话里。”
- “在 `/path/project` 下找名字包含 config 的文件，深度 4。”
- “把 epoch `0` 转成 Asia/Shanghai 时间，并给出 Cron `*/5 * * * *` 接下来 5 次运行时间。”
- “为 `https://example.com` 生成 SVG 二维码。”
- “计算 `hello` 的 SHA-256，并解码这个 JWT 并校验签名。”
- “比较这两段配置的差异。”
- “读取这张图片信息，并转成 200px 宽的 WebP。”

## 5. 日志与排查

每次工具调用写入 JSONL 日志，字段包括 `tool`、`args`、`durationMs`、`success`、`error`、`result`。`secret/key/token/password` 自动脱敏，长文本截断。

默认日志：

- macOS：`~/Library/Logs/bennett-toolbox/mcp.log`
- Windows：`%LOCALAPPDATA%\bennett-toolbox\logs\mcp.log`
- Linux：`~/.local/state/bennett-toolbox/mcp.log`
- `BENNETT_MCP_LOG_DIR` 可覆盖；超过 5MB 轮转为 `mcp.log.1`。

```bash
tail -f ~/Library/Logs/bennett-toolbox/mcp.log
grep '"success":false' ~/Library/Logs/bennett-toolbox/mcp.log
```

排查建议：

1. 客户端没有工具：确认 `command` 是 Node 24+，`args` 指向正确的 `mcp/server.mjs`，查看客户端 stderr。
2. `node:sqlite` 相关错误：升级 Node 或改用 Node 26 绝对路径。
3. MarkItDown 缺失：安装文档转换组件，或设置 `MARKITDOWN_BIN`。
4. SQLite 读失败：确认文件存在、不是目录、不是损坏文件；写语句会被拒绝。
5. 图片转换失败：确认图片可读；执行 `npm install` 重新安装 sharp。
6. 日志无法写入：检查 `BENNETT_MCP_LOG_DIR` 权限。

## 6. 安全与当前限制

- SQLite 只读、单语句；MCP 不提供数据库写入。
- 文件搜索、MarkItDown、图片工具读取本地路径；返回内容会发送给 AI 客户端，请勿传入敏感文件。
- 图片转换、二维码 PNG 以 base64 image content 返回，不写文件；需要落盘时由客户端处理。
- 日志会记录路径与文本摘要；密钥类字段已脱敏，但仍建议定期清理日志。
- 当前未接入 PDF 转图片、视频转 GIF、去水印、截图/取色；MCP 服务未打包进桌面安装包。
- 客户端与应用更新后，重新加载 MCP 服务以获取最新工具列表。

## 7. 验证

```bash
npm run test:mcp
```

当前 14 个工具、9 项集成测试全部通过，覆盖 JSON、SQLite 只读、MarkItDown、文件搜索、时间/Cron、二维码、编码/哈希/JWT、正则/Diff、图片与操作日志。
