# Proposal

## Why

工作台插件列表把 registry 的 `generatedAt` 原始 ISO 字符串直接显示为“更新于 2026-11-07T12:08:29.027Z”，不符合当前语言的日期时间格式，也不便阅读。

## What Changes

- 将 registry 更新时间按当前语言格式化为本地日期时间（如“2026/11/07 22:15”）。
- 时间无效或缺失时回退为“尚未刷新”。
- 增加 e2e 断言，确保界面不再出现原始 ISO 时间。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `plugin-settings`: 增加 registry 更新时间的本地化显示要求。

## Impact

- 修改：`src/components/PluginManagerCard.tsx`
- 测试：`tests/plugins.electron.mjs`
- 不改变 registry 数据结构与刷新逻辑。
