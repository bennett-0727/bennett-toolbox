# Design

## Context

侧栏宽度定义在 `global.css`（中文 200px、英文 220/230px，1100px 断点下 190/210/230px），`glass.css` 负责主题表面。侧栏由 `Sidebar.tsx` 渲染，工具项包含拖拽手柄、图标与名称；主内容通过 flex 自适应剩余宽度。

## Goals / Non-Goals

**Goals:**

- 通过 `.sidebar.collapsed` 类切换宽度与文字显隐，避免改动现有布局结构。
- 收起状态写入 localStorage，默认展开，兼容旧用户。
- 图标栏保留 `title`/`aria-label`，并支持中英文。

**Non-Goals:**

- 不改变拖拽排序、插件加载或工具顺序持久化。
- 不增加移动端抽屉或悬浮侧栏。

## Decisions

- 状态放在 `Sidebar` 内部，localStorage key 为 `bennett-sidebar-collapsed`；读取失败默认展开。
- 收起宽度用 `.sidebar.collapsed { width: 64px }` 并覆盖语言与媒体查询宽度，保证各语言一致。
- 收起时隐藏 `.logo-text`、`.nav-section-title`、`.nav-label`、`.drag-handle`、`.drag-hint`、`.nav-empty` 与版本文字；工具按钮保留图标并设置 `title={module.name}`。
- 按钮放在侧栏头部右侧；收起后头部改为纵向居中，按钮旋转 180° 表示展开。
- 宽度过渡 0.2s；`overflow: hidden` 防止文字在动画中溢出。

## Risks / Trade-offs

- 收起后工具名称仅靠图标与悬浮提示辨识；通过 `title`/`aria-label` 缓解。
- 拖拽排序在图标栏仍可用，但没有拖拽手柄提示；不影响功能。
- 窄窗口下 64px 图标栏可能仍占空间；后续可考虑自动收起，本次不做。
