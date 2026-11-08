# Design

## Context

MCP 服务是独立 Node ESM 进程，已有 7 个工具。新工具应保持无状态、只读输入、错误隔离，并避免把大结果直接写入磁盘。

## Decisions

- 编码/哈希/JWT 使用 Node `crypto`；JWT 支持 base64url 解码与 HS256/384/512 常量时间校验。
- 正则：限制 pattern ≤ 500 字符、文本 ≤ 1MB、匹配 ≤ 1000 条；使用原生 RegExp。
- Diff：使用 `diff` 包生成 unified patch；限制两段文本各 ≤ 1MB、行数 ≤ 5000。
- 图片：使用 `sharp` 的 `metadata` 与转换管线；PNG/JPEG/WebP，quality 1..100，width/height 16..4096；结果 base64 image content，超过 10MB 拒绝返回。
- 所有工具不写本地文件；路径只读。

## Risks

- 极端正则可能回溯较慢；通过输入长度与匹配上限降低风险，后续可迁移 worker 超时。
- sharp 为原生依赖；安装失败时 MCP 服务其余工具仍可用，图片工具返回明确错误。
- 大图 base64 体积较大；限制输出大小。
