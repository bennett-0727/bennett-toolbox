# Proposal

## Why

应用发布在 GitHub Releases，但用户无法在应用内知道是否有新版本，只能手动查看仓库。

## What Changes

- 主进程新增 `check-updates`：读取 GitHub Releases，筛选 `vX.Y.Z` 版本，与当前 `app.getVersion()` 比较。
- 侧边栏版本号变为可点击的“检查更新”按钮；发现新版本时显示提示条和“前往下载”。
- 新版本提示支持中英双语；下载链接通过 `open-external` 打开 GitHub Release。
- e2e 用 IPC stub 覆盖“有新版本/已是最新”，避免真实网络依赖。

## Capabilities

### New Capabilities

- `update-check`: 基于 GitHub Releases 的版本检测、提示与下载跳转。

### Modified Capabilities

无。

## Impact

- 修改 `electron/main.ts`、`src/App.tsx`、`src/components/Sidebar.tsx`、`src/styles/global.css`、`src/i18n/`、`tests/electron.full.mjs`。
- 不引入自动下载/安装，仅检测与跳转。
