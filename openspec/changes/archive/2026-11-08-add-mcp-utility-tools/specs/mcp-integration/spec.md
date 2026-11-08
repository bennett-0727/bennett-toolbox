# Spec Delta

## ADDED Requirements

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
