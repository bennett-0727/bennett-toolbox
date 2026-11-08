# Proposal

## Why

MCP 试点已提供 JSON、SQLite 只读查询与 MarkItDown。文件搜索、时间/Cron、二维码是高频通用能力，适合继续暴露给 AI 客户端。

## What Changes

- 扩展 `mcp/server.mjs`，新增四个 tools：
  - `file_search`：按文件名递归搜索目录，限制深度与结果数。
  - `time_convert`：时间戳/ISO 时间在时区间转换。
  - `cron_next`：解析 Cron 表达式并返回下一次运行时间。
  - `qr_generate`：生成 PNG（MCP image content）或 SVG 文本。
- 增加依赖 `cron-parser`、`luxon`、`qrcode`。
- 扩展 MCP 集成测试、README 与 AGENTS 说明。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `mcp-integration`: 增加文件搜索、时间转换、Cron 与二维码工具的约束。

## Impact

- 修改：`mcp/server.mjs`、`tests/mcp.pilot.mjs`、`package.json`、`README.md`、`AGENTS.md`、`CHANGELOG.md`
- 不修改桌面 UI 与插件运行时。
