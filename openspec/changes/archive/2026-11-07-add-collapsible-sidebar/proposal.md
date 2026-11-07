# Proposal

## Why

左侧栏固定占用约 200–230px，在 1000×700 等窄窗口下压缩主画布。用户需要一键收起侧栏，只保留图标，把空间让给工具内容。

## What Changes

- 侧栏头部增加展开/收起按钮，收起后侧栏变为约 64px 的图标栏。
- 收起时隐藏 Logo 文字、分组标题、工具名称、拖拽手柄与版本文字，保留工作台与工具图标，并通过 `title` 提供名称提示。
- 展开状态持久化到 localStorage（`bennett-sidebar-collapsed`），重启后保持。
- 补中英文按钮文案与 e2e 覆盖。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `responsive-layout`: 增加侧栏展开/收起与状态持久化要求。

## Impact

- 修改：`src/components/Sidebar.tsx`、`src/styles/glass.css`、`src/i18n/en.json`
- 测试：`tests/electron.full.mjs`
- 不改变侧栏工具顺序、拖拽排序与插件加载逻辑。
