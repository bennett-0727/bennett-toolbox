# Spec Delta

## ADDED Requirements

### Requirement: Registry 更新时间显示

工作台 MUST 按当前界面语言将 registry 更新时间显示为本地日期时间，不得直接显示 ISO 8601 原始字符串；时间缺失或无法解析时 SHALL 显示“尚未刷新”。

#### Scenario: 中文时间显示

- **WHEN** 语言为中文且 registry 已刷新
- **THEN** 显示形如“更新于 2026/11/07 22:15”的本地时间，不包含 `T`、`Z` 或毫秒

#### Scenario: 英文时间显示

- **WHEN** 语言为 English 且 registry 已刷新
- **THEN** 显示形如“Updated 11/07/2026, 22:15”的本地时间

#### Scenario: 无效时间

- **WHEN** registry 时间缺失或无法解析
- **THEN** 显示“尚未刷新”或对应英文文案，不显示原始字符串
