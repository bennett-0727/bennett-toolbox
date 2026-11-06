# Proposal

## Why

Electron 全功能 e2e 发现两个行为缺陷：文档转 Markdown 通过“选择文件”按钮可以绕过类型校验；文件搜索在搜索目录不存在时静默返回空结果，用户无法判断是目录错误还是确实没有匹配文件。

## What Changes

- 文档转 Markdown：选择文件后复用拖拽路径的类型校验；不支持的类型立即提示，且不设置当前文件。
- 文件搜索：根搜索目录读取失败时显示错误；子目录读取失败仍然跳过，不中断整体搜索。
- 新增对应 e2e 回归用例，并保留有效目录恢复正常搜索的断言。

## Capabilities

### New Capabilities

- `document-converter`: 文档选择与转换的输入校验行为。
- `file-search`: 搜索目录错误提示与结果行为。

### Modified Capabilities

无。

## Impact

- 修改：`src/modules/DocumentConverter.tsx`、`src/modules/FileSearch.tsx`
- 修改：`tests/electron.full.mjs`
- 不改变主进程 IPC 协议与现有有效文件流程。
