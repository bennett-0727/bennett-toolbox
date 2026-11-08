# Proposal

## Why

应用内的工具目前只能通过界面使用。AI 客户端（Claude、Codex 等）无法直接调用 JSON 格式化、SQLite 查询和文档转换。需要新增一个本地 MCP（Model Context Protocol）服务，把三类能力暴露为可被 AI 调用的 tools。

## What Changes

- 新增 stdio MCP 服务 `mcp/server.mjs`，与桌面应用共用本机数据。
- 暴露三个试点工具：
  - `json_format`：格式化/压缩 JSON，返回可读文本。
  - `sqlite_query`：只读执行单条 SQL，返回列/行/截断标记；拒绝写语句。
  - `markitdown_convert`：调用本机 MarkItDown 组件把本地文档转为 Markdown。
- 增加 `npm run mcp` 与 MCP 客户端集成测试 `npm run test:mcp`。
- 文档说明 AI 客户端配置、Node 版本要求与只读安全边界。

## Capabilities

### New Capabilities

- `mcp-integration`: 定义本地 MCP stdio 服务的工具、参数、只读约束与错误行为。

### Modified Capabilities

无。

## Impact

- 新增：`mcp/server.mjs`、`tests/mcp.pilot.mjs`
- 修改：`package.json`（`mcp`/`test:mcp` 脚本与 MCP SDK 依赖）、`README.md`、`AGENTS.md`、`CHANGELOG.md`
- 不修改桌面 UI 与现有插件运行时；MCP 服务在独立 Node 进程中运行。
