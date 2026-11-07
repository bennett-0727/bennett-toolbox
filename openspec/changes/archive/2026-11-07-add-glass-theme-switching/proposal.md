# Proposal

## Why

应用只有一套深色样式，且大量面板仍是实心底，没有统一的 Apple 玻璃质感；用户需要可切换的皮肤。

## What Changes

- 新增深色玻璃、浅色玻璃两套主题，`html[data-theme]` 驱动，localStorage 持久化。
- 侧边栏加入主题切换按钮（内联 SVG 太阳/月亮），与语言切换并列。
- 统一 shadcn/ui 设计令牌：背景、前景、卡片、边框、圆角、focus ring。
- 覆盖全部主要表面：面板、卡片、列表、表格、输入框、按钮、错误条、进度条、空状态与浮层。
- 修复浅色主题下激活按钮对比度，并补充主题切换 e2e。

## Capabilities

### New Capabilities

- `glass-theme`: 深浅玻璃主题、切换、持久化与全量表面覆盖。

### Modified Capabilities

无。

## Impact

- 新增 `src/theme.ts`、`src/styles/glass.css`；修改 Sidebar/App/main、global.css、i18n 词典、e2e、README/CHANGELOG。
- 不改变业务逻辑与 IPC。
