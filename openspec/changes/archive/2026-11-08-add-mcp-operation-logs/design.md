# Design

## Context

MCP 服务已有 14 个工具，注册入口集中在 `mcp/server.mjs`。为避免逐个修改 handler，使用统一注册包装器记录调用。

## Decisions

- 日志格式：JSONL，一行一个事件，包含 `ts`、`event`、`tool`、`args`、`durationMs`、`success`、`error`、`result`。
- 日志目录：`BENNETT_MCP_LOG_DIR` 优先；否则 macOS `~/Library/Logs/bennett-toolbox`、Windows `%LOCALAPPDATA%/bennett-toolbox/logs`、Linux `~/.local/state/bennett-toolbox`。
- 文件 `mcp.log`；写入队列串行化；启动时检查大小，超过 5MB 轮转为 `mcp.log.1`。
- 参数脱敏：键名匹配 `secret|key|token|password|authorization` 时替换 `[REDACTED]`；文本类字段（text/sql/json/old_text/new_text）截断到 300 字符并附长度；路径保留。
- 结果摘要：content 类型、文本长度、图像字节数；不记录完整输出。
- `registerTool` 包装：捕获异常并返回 `isError` 结果；记录成功/失败后返回原结果。
- stderr 输出一行 `[mcp] tool=... duration=... ok=...`，不输出敏感参数。

## Risks

- 日志可能包含文件路径/查询片段；本地文件权限由用户控制，敏感字段已脱敏。
- 每次调用 await 日志写入会略增延迟；文件写入很快，可接受。
- 轮转只保留当前与 `.1`，不归档历史。
