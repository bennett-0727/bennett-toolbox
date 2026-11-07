# Design

## Context

PDF 结果卡片结构为：`panel-header`（标题 + 数量）→ `pdf-result-actions`（ZIP 按钮）→ `pdf-page-grid`。按钮独占一行且仅靠右，造成视觉断裂。图片转换与图片压缩的 ZIP 按钮位于顶部工具栏，位置稳定，因此只调整 PDF。

## Goals / Non-Goals

**Goals:**

- 让 ZIP 操作与“图片结果”标题、数量徽标处于同一视觉层级。
- 保持在 1000×700 下不产生横向溢出。

**Non-Goals:**

- 不调整图片转换、图片压缩的 ZIP 按钮。
- 不改变 ZIP 文件内容或 IPC。

## Decisions

在 `panel-header` 内新增右侧操作容器，包含数量徽标与 `btn-sm` ZIP 按钮；删除独立 `pdf-result-actions` 行。标题栏已有 `justify-content: space-between`，操作组用 flex 对齐即可。窄窗口下允许操作组换行。

替代方案是把按钮放在结果卡片底部，但下载动作应在结果生成后立即可见，放底部会增加滚动距离。

## Risks / Trade-offs

- [标题栏高度略增] → 使用 `btn-sm` 控制高度，并让标题与徽标垂直居中。
- [窄窗口挤压标题] → 操作组允许 `flex-wrap`，标题保持可读。
