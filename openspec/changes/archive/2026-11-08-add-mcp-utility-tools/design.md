# Design

## Context

MCP 服务为独立 Node ESM 进程，已有 `json_format`、`sqlite_query`、`markitdown_convert`。新工具应保持单文件、stdio 与错误隔离。

## Decisions

- `file_search`：`fs.readdir({withFileTypes:true})` 递归；不跟随 symlink 目录；默认深度 5、limit 100；深度上限 20、limit 上限 500；扫描上限 100000 条目；仅返回文件（不含目录）。
- `time_convert`：使用 Luxon；数字字符串按长度判断秒/毫秒；ISO 字符串按 `from_timezone` 解析；输出 UTC、目标时区 ISO/格式化、epoch 秒/毫秒。
- `cron_next`：使用 `cron-parser` 的 `CronExpressionParser.parse(expression, {tz})`；用 Luxon 校验时区；count 默认 5、上限 20。
- `qr_generate`：使用 `qrcode`；PNG 通过 `toBuffer` 返回 MCP image content + 说明文本；SVG 通过 `toString` 返回文本；size 128–1024，纠错级别 L/M/Q/H。
- 所有工具异常返回 `isError` 文本，不抛出到 stdio 协议层。

## Risks

- 文件搜索在超大目录耗时；深度/数量/扫描上限控制。
- 时间解析依赖本地 Luxon 版本；输入需明确 epoch 或 ISO。
- PNG base64 内容较大；size 上限 1024。
