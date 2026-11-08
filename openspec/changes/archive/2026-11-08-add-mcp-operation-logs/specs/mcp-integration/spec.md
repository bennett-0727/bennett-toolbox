# Spec Delta

## ADDED Requirements

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
