# Design

## Context

`PluginManagerCard` 直接把 `snapshot.registryUpdatedAt` 插入“更新于 …”，该值是 registry 的 `generatedAt`（UTC ISO 字符串）。应用已有基于 `language` 的 i18n 正则翻译，但只翻译“更新于”前缀，不处理时间值。

## Goals / Non-Goals

**Goals:**

- 使用 `Intl.DateTimeFormat(language, ...)` 输出本地日期时间。
- 无效时间回退为“尚未刷新”。
- 用 e2e 断言防止原始 ISO 时间回归。

**Non-Goals:**

- 不改变 registry 生成或缓存逻辑。
- 不引入相对时间（“3 分钟前”）或多时区切换。

## Decisions

- 在 `PluginManagerCard` 内新增 `formatRegistryTime(value, language)`，使用固定字段（年、月、日、时、分，24 小时制）格式化；语言来自已有 `language` 属性。
- 解析失败返回 `null`，界面显示“尚未刷新”；英文由现有 i18n 字典翻译。
- e2e 在刷新 registry 后断言 `.plugin-registry-time` 不含 ISO 的 `T…Z` 片段，且以时分结尾。

## Risks / Trade-offs

- 不同平台的 `Intl` 分隔符略有差异（`/` 或 `.`），测试只断言“不含 ISO 且包含时分”，避免平台脆弱性。
- 仍使用系统本地时区；用户跨时区查看时显示本机时间，符合桌面应用预期。
