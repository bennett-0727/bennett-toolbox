# Proposal

## Why

当前桌面产物依赖本机手动打包，无法保证每次发布的多平台产物一致、可追溯。需要由 GitHub Actions 在版本 tag 上自动构建 macOS 与 Windows 安装包，并将产物附加到 Release，减少人工操作与遗漏。

## What Changes

- 新增 GitHub Actions 工作流 `.github/workflows/release.yml`：`v*` tag 触发，支持 `workflow_dispatch` 手动触发。
- 引入 `electron-builder`，在 `package.json` 中声明打包配置与构建脚本。
- 构建矩阵：
  - macOS：x64、arm64，产物为 `dmg` 与 `zip`。
  - Windows：x64、arm64，产物为 NSIS 安装包（`exe`）。
- 构建前执行 `npm run build`（类型检查 + 前端构建）与 `npm run build:electron`（主进程构建）。
- 每次构建上传 GitHub Actions artifacts；tag 构建将产物附加到对应 GitHub Release。
- 产物默认不签名、不公证，文档中说明 Gatekeeper / SmartScreen 影响。

## Capabilities

### New Capabilities

- `release-packaging`: 定义多平台桌面产物的自动构建、产物格式、触发条件与发布附件要求。

### Modified Capabilities

无。

## Impact

- 新增：`.github/workflows/release.yml`
- 修改：`package.json`（`electron-builder` 依赖、打包脚本与 `build` 配置）
- 修改：`README.md`（发布与产物说明）
- 不改变应用运行时行为与现有功能代码。
