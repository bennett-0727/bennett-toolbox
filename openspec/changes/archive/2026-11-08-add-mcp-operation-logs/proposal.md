# Proposal

## Why

MCP 工具被 AI 调用后，目前只有 stderr 的启动行，无法事后定位失败原因、耗时或调用参数。需要把每次操作写入固定日志文件，便于排查与修改。

## What Changes

- MCP 服务为每次工具调用写结构化 JSONL 日志：时间、工具名、参数摘要、耗时、成功/失败、错误、结果摘要。
- 敏感参数（secret/key/token/password）脱敏；长文本仅保留摘要与长度。
- 日志写入平台固定目录，支持 `BENNETT_MCP_LOG_DIR` 覆盖；单文件超过 5MB 轮转为 `.1`。
- 启动、未捕获异常也写日志；stderr 只输出简短调用摘要。
- 扩展 MCP 测试验证日志内容与脱敏。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `mcp-integration`: 增加 MCP 工具操作日志要求。

## Impact

- 修改：`mcp/server.mjs`、`tests/mcp.pilot.mjs`、`README.md`、`AGENTS.md`、`CHANGELOG.md`
- 不修改桌面 UI 与插件运行时。
