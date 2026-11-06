# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.1.2] - 2026-11-06

### Added

- GitHub Actions 自动打包：macOS x64/arm64（`dmg` + `zip`）、Windows x64/arm64（NSIS）
- 推送 `v*` tag 自动构建并附加到 GitHub Release，支持手动触发
- tag 构建自动同步 `package.json` 版本号
- 本地打包脚本 `package:mac`、`package:win`
- Electron 全功能 e2e（14 项）与 `tests/fixtures/` 测试素材
- README 功能截图与介绍（11 个模块）

### Changed

- 界面版本号改为从 `package.json` 注入，tag 构建自动同步

### Fixed

- PDF 转图片在 Electron 28 下缺少 `Promise.try`、`Uint8Array.toHex`、`Map.getOrInsertComputed` 等 API，补充 core-js polyfill

## [1.1.1] - 2026-11-06

首个 GitHub 版本。

### Added

- 完整的 Electron + React + TypeScript 源码工程（11 个工具模块）
- `electron/main.ts`：主窗口、8 个 IPC handler、HEIC 转换、MarkItDown 调用、悬浮截图窗口
- Playwright e2e 冒烟测试（3 项：模块渲染、JSON 格式化、模块切换）
- CHANGELOG 与版本 tag

### Changed

- React 19.3.1（react-dom、@types 同步升级）
- Node.js 要求 `>=24.8.0`，验证环境为 v26.13.0
- 抽取共享组件 `FormatItem`
- `App`、`Sidebar` 使用可读变量名与显式类型重写
- 第三方依赖：JSZip 3.10.1、gifenc 1.0.3、pdfjs-dist 5.6.205、heic-convert 2.1.0

### Fixed

- `capture-selection-complete` 用错误的窗口 id 过滤悬浮窗，导致截图结果可能发到错误窗口；改为按窗口实例过滤

### Notes

- MarkItDown 依赖的 `vendor/markitdown` 二进制未包含在仓库中，需另行准备
