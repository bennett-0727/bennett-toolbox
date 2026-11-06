# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.1.1] - 2026-11-06

从 `Bennett Toolbox.app` 安装包（v1.1.1）反编译并重建的源码版本。

### Added

- 完整的 Electron + React + TypeScript 源码工程（11 个工具模块）
- `electron/main.ts`：主窗口、8 个 IPC handler、HEIC 转换、MarkItDown 调用、悬浮截图窗口
- Playwright e2e 冒烟测试（3 项：模块渲染、JSON 格式化、模块切换）
- CHANGELOG 与版本 tag

### Changed

- React 从 18.3.1 升级到 19.3.1（react-dom、@types 同步升级）
- Node.js 要求提升到 `>=24.8.0`，验证环境为 v26.13.0
- 抽取共享组件 `FormatItem`（原 bundle 中的 `Um`）
- `App`、`Sidebar` 使用可读变量名与显式类型重写
- 第三方库从 bundle 内联代码替换为 npm 依赖：JSZip 3.10.1、gifenc 1.0.3、pdfjs-dist 5.6.205、heic-convert 2.1.0

### Fixed

- `capture-selection-complete` 用错误的窗口 id 过滤悬浮窗，导致截图结果可能发到错误窗口；改为按窗口实例过滤

### Known Limitations

- 原始 TSX 的类型、注释、文件层级和局部变量名无法从无 sourcemap 的 bundle 恢复
- MarkItDown 依赖的 `vendor/markitdown` 二进制未包含在仓库中，需另行准备
