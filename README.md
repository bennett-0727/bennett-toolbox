# Bennett Toolbox

多功能工具箱桌面应用，基于 Electron + React + TypeScript，内置 11 个常用工具。

## 功能

- JSON 格式化与压缩
- 中英变量命名转换
- 图片格式转换与批量压缩
- 图片去水印
- PDF 转图片
- 视频转 GIF
- 文件搜索
- 文档转 Markdown
- 截图悬浮
- 屏幕取色

## 技术栈

- Electron 28
- React 19.3.1 + TypeScript 5
- Vite 5
- Playwright e2e

## 已验证

- Node.js v26.13.0（最新 LTS）
- `npx tsc --noEmit` 0 错误
- `npx vite build` 成功
- `npx e2e run` 3/3 通过（11 个模块渲染、JSON 格式化与语法错误、模块切换）
- `npm run build:electron` 成功

## 快速开始

```bash
npm install
npm run dev          # 前端开发服务器 http://127.0.0.1:5173
npm run test:e2e     # Playwright 冒烟测试
npm run build:all    # tsc + 前端构建 + 主进程构建
```

运行 Electron 需要系统安装 Electron 28 运行时（`electron .`）。

## 目录结构

```
├── electron/main.ts          # 主进程：窗口、IPC、HEIC、MarkItDown、截图
├── src/main.tsx              # React 入口
├── src/App.tsx               # 模块注册表、切换、拖拽排序持久化
├── src/components/Sidebar.tsx
├── src/components/FormatItem.tsx   # 颜色格式复制行
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
├── src/styles/global.css     # 全局样式
├── tests/smoke.e2e.ts
└── e2e.config.ts
```

## 模块一览

| 模块 | 文件 | 说明 |
| --- | --- | --- |
| JSON 格式化 | `modules/JsonFormatter.tsx` | 格式化、压缩、复制结果、语法错误定位 |
| 变量命名 | `modules/NamingConverter.tsx` | 中英互译并生成常见命名格式 |
| 图片转换 | `modules/ImageConverter.tsx` | PNG/JPG/WebP/HEIC/SVG 等格式转换 |
| 图片压缩 | `modules/ImageCompressor.tsx` | 按目标大小或质量批量压缩 |
| 图片去水印 | `modules/WatermarkRemoval.tsx` | 涂抹或框选后修补水印区域 |
| PDF 转图片 | `modules/PdfToImages.tsx` | 按页导出 PNG/JPG，可打包 ZIP |
| 视频转 GIF | `modules/VideoToGif.tsx` | 截取片段、设置帧率与尺寸 |
| 文件搜索 | `modules/FileSearch.tsx` | 按文件名搜索目录，支持在文件夹中显示 |
| 文档转 MD | `modules/DocumentConverter.tsx` | 调用 MarkItDown 转换文档 |
| 截图悬浮 | `modules/ScreenshotFloat.tsx` | 屏幕源截图、框选截图、悬浮置顶 |
| 屏幕取色 | `modules/ColorPicker.tsx` | EyeDropper 取色与历史记录 |

## 开发说明

1. 渲染进程通过 `ipcRenderer` / `ipcMain` 与主进程通信，通道定义见 `electron/main.ts`。
2. 当前启用 `nodeIntegration: true`、`contextIsolation: false`，渲染进程可直接使用 `window.require`；请勿加载不可信页面。
3. MarkItDown 需要另行准备 `vendor/markitdown/markitdown` 二进制。
