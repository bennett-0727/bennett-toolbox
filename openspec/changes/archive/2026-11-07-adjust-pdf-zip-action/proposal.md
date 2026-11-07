# Proposal

## Why

PDF 转图片的“下载全部 ZIP”按钮单独占用结果卡片中的一行，位于标题栏和图片网格之间，右侧悬空、与内容脱节，视觉上不协调。

## What Changes

- 将“下载全部 ZIP”移入“图片结果”标题栏，与图片数量徽标组成右侧操作组。
- 按钮使用紧凑尺寸，标题栏在窄窗口下保持不溢出。
- 不改变 ZIP 生成逻辑、按钮功能或测试数据。

## Capabilities

### New Capabilities

无。该变更为纯布局调整，设置 `skip_specs: true`。

### Modified Capabilities

无。

## Impact

- `src/modules/PdfToImages.tsx`：结果卡片标题栏结构。
- `src/styles/glass.css`：标题栏操作组样式与响应式。
- 截图：`docs/screenshots/07-pdf.png` 重新生成。
- 无运行时依赖或接口变更。
