# Proposal

## Why

MarkItDown 组件约 118MB，首次下载在较慢网络下会超过当前 120 秒超时；进度只广播 5/20/80/100 四个固定值，实测会在 0% 停留约 30 秒后直接跳到 80%，看起来像卡死。解压失败时还会先删除旧组件。

## What Changes

- 下载改为流式读取，按实际字节数广播进度（节流），超时延长到 10 分钟。
- 超时错误返回可读提示；下载或校验失败时保留已安装的旧组件。
- 新组件先解压到临时目录，校验可执行文件后再替换正式目录。
- 组件行按阶段显示“下载中 / 安装中 / 重新下载”。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `markitdown-component`: 增加下载进度、超时与失败保留旧组件的要求。

## Impact

- 修改：`electron/components.ts`、`src/components/MarkitdownComponentRow.tsx`
- 测试：`tests/plugins.electron.mjs`（组件下载回归）
- 不改变组件资产格式、SHA-256 校验与文档转换调用方式。
