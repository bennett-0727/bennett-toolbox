# Bennett Toolbox（反编译重建版）

从 `/Applications/Bennett Toolbox.app/Contents/Resources/app.asar`（v1.1.1）反编译还原的 Electron + React + TypeScript 工程。原始 TSX 源码已不可得（GitHub 仓库随账号封禁不可访问，安装包内无 sourcemap），本工程是按 bundle 结构、JSX 和字符串语义重建的可运行版本。

## 已验证

- Node.js v26.13.0（最新 LTS）
- `npx tsc --noEmit` 0 错误
- `npx vite build` 成功（CSS 产物哈希与官方包一致：`index-Bf_C6pjF.css`）
- `npx e2e run` 3/3 通过（11 个模块渲染、JSON 格式化与语法错误、模块切换）
- `npm run build:electron` 成功

## 快速开始

```bash
npm install
npm run dev          # 前端开发服务器 http://127.0.0.1:5173
npm run test:e2e     # Playwright 冒烟测试
npm run build:all    # tsc + 前端构建 + 主进程构建
```

打包/运行 Electron 需要系统 Electron 28 运行时（`electron .`），本仓库只包含源码与构建脚本。

## 目录结构

```
├── electron/main.ts          # 主进程：窗口、IPC、HEIC、MarkItDown、截图
├── src/main.tsx              # React 入口
├── src/App.tsx               # 模块注册表、切换、拖拽排序持久化
├── src/components/Sidebar.tsx
├── src/components/FormatItem.tsx   # 颜色格式复制行（原 bundle 中的 Um）
├── src/modules/              # 11 个工具模块
│   ├── JsonFormatter.tsx
│   ├── NamingConverter.tsx
│   ├── ImageConverter.tsx
│   ├── ImageCompressor.tsx
│   ├── WatermarkRemoval.tsx
│   ├── PdfToImages.tsx
│   ├── VideoToGif.tsx
│   ├── FileSearch.tsx
│   ├── DocumentConverter.tsx
│   ├── ScreenshotFloat.tsx
│   └── ColorPicker.tsx
├── src/shared/               # 版本号与类型
├── src/styles/global.css     # 从 dist 还原，未改动
├── tests/smoke.e2e.ts
└── e2e.config.ts
```

## 还原映射（bundle 符号 → 源码）

| bundle 符号 | 源码 |
| --- | --- |
| `TM` / `CM` / `v0` / `HI` | `App.tsx` / `Sidebar.tsx` |
| `XI`、`WI`、`GI`、`_Component`、`VI` | `modules/JsonFormatter.tsx`（JsonFormatter / JsonInput / JsonViewer / JsonNode / escapeJsonString） |
| `QI` | `modules/NamingConverter.tsx` |
| `_Component2` | `modules/ImageConverter.tsx` |
| `_Component3` | `modules/ImageCompressor.tsx` |
| `_Component4` | `modules/WatermarkRemoval.tsx` |
| `_Component5` | `modules/VideoToGif.tsx` |
| `_Component6` | `modules/FileSearch.tsx` |
| `_Component7` | `modules/ScreenshotFloat.tsx` |
| `SP` | `modules/ColorPicker.tsx` |
| `NP` | `modules/DocumentConverter.tsx` |
| `EM` | `modules/PdfToImages.tsx` |
| `hC` + IPC handlers | `electron/main.ts` |

第三方库已从 bundle 内联代码替换为 npm 包：JSZip 3.10.1、gifenc 1.0.3、pdfjs-dist 5.6.205、heic-convert 2.1.0。

## 代码 review 结论

已核对：

1. 渲染进程 8 个 `ipcRenderer.invoke` 与主进程 `ipcMain.handle` 通道一一对应；`capture-result` 监听有 `removeListener` 清理。
2. gifenc 调用与 API 一致：`GIFEncoder()` / `quantize(rgba, maxColors)` / `applyPalette(rgba, palette)`。
3. pdf.js 使用 `getDocument({ data }).promise`，worker 路径经 Vite 打包验证存在。
4. 拖拽排序索引、localStorage 持久化、模块回退逻辑与原 bundle 一致。

修复项：

- `capture-selection-complete` 原逻辑用 `floatingWindows.has(window.id.toString())` 过滤悬浮窗，但 Map 的 key 是渲染进程传入的业务 id，不是 Electron 窗口 id，过滤永远不会命中。已改为按窗口实例过滤。

保留的原始行为（非缺陷，仅提示）：

- `nodeIntegration: true`、`contextIsolation: false`：渲染进程直接 `window.require("fs"/"path"/"electron")`，这是原应用架构，改成安全默认值会破坏全部 IPC 调用。
- MarkItDown 依赖随包 `vendor/markitdown/markitdown` 二进制作业，安装包 asar 中不包含该二进制，需要按原项目 `npm run setup:markitdown` 的方式另行准备。

## 已知限制

1. 压缩后的局部变量名（`r`、`t`、`e`…）在大型模块中仍保留，无法从 bundle 恢复原始命名；组件名、导入、JSX、类型边界已还原。
2. TypeScript 类型在构建时被擦除，现有类型是按使用方式补回的，不是原始类型定义。
3. 原始文件名、注释、目录层级无法从单文件 bundle 恢复。
