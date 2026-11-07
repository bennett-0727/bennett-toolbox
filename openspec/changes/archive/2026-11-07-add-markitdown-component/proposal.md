# Proposal

## Why

MarkItDown 二进制约 104MB，占安装包体积主要部分；只有使用“文档转 Markdown”的用户需要它。将其从安装包移出、改为按需下载组件，可以显著减小安装包，同时保留离线/测试用环境变量与本地 vendor 回退。

## What Changes

- 从 electron-builder `extraResources` 移除 `vendor/markitdown`，安装包不再内置 MarkItDown。
- 新增按平台/架构命名的组件资产（`markitdown-darwin-arm64`、`markitdown-win32-x64.exe` 等）与 SHA-256 文件，随应用 Release 上传。
- 主进程新增组件状态/下载 IPC，下载到 `userData/components/markitdown/<appVersion>/`，校验 SHA-256、设置可执行权限。
- 设置页插件卡片增加“组件”分组，显示 MarkItDown 状态、下载按钮与进度。
- 文档转 Markdown 在组件缺失时显示下载提示；已有 `MARKITDOWN_BIN` / vendor 回退继续用于开发与测试。
- CI 构建阶段生成并上传组件资产；打包阶段不再包含二进制。

## Capabilities

### New Capabilities

- `markitdown-component`: 组件资产、下载、校验、安装路径与状态。

### Modified Capabilities

- `settings-page`: 插件卡片增加组件管理。
- `document-converter`: 组件缺失时可下载后使用。

## Impact

- `package.json` 构建配置、`.github/workflows/release.yml`、`scripts/prepare-component-assets.mjs`
- `electron/main.ts`、新增 `electron/components.ts` 与 IPC
- `src/plugins/client.ts`、`src/components/PluginManagerCard.tsx`、`src/modules/DocumentConverter.tsx`
- `src/i18n/en.json`、README、CHANGELOG、OpenSpec specs
