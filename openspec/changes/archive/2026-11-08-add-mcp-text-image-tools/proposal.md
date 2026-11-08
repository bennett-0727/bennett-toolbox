# Proposal

## Why

MCP 已有 JSON、SQLite、MarkItDown、文件搜索、时间/Cron、二维码。继续补齐全栈开发常用的编码加密、正则/文本 Diff 与图片处理能力，让 AI 客户端直接完成日常转换与分析。

## What Changes

- 新增 7 个 MCP tools：
  - `encoding_convert`：Base64 / URL / Hex 编解码
  - `hash_text`：MD5/SHA1/SHA256/SHA512 与 HMAC-SHA256
  - `jwt_decode`：解码 JWT，并可用 HMAC 密钥校验签名
  - `regex_test`：正则匹配/分组/替换
  - `text_diff`：unified diff 与增删行统计
  - `image_info`：读取图片格式、尺寸、通道与文件大小
  - `image_convert`：转换格式/质量/尺寸，返回 MCP image content
- 增加依赖 `diff`、`sharp`，扩展 MCP 测试与文档。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `mcp-integration`: 增加编码加密、正则/Diff、图片工具要求。

## Impact

- 修改：`mcp/server.mjs`、`tests/mcp.pilot.mjs`、`package.json`、`README.md`、`AGENTS.md`、`CHANGELOG.md`
- 不修改桌面 UI 与插件运行时；图片工具只读取输入并返回内容，不写文件。
