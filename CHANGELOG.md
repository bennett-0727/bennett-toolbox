# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.1.3] - 2026-11-07

### Added

- 内置五套玻璃主题：深色玻璃、浅色玻璃、极光紫、深海青、落日橙，支持主题预览与持久化
- 主题主色、辅助色与背景光晕改用 CSS 令牌驱动，彩色皮肤整体换色
- 屏幕录制权限提示条增加“打开系统设置”入口，并在检测到 denied 时实际取源复核
- macOS 打包使用稳定开发证书签名，补充 `NSScreenCaptureUsageDescription`

### Changed

- 升级依赖：Electron 45、Vite 8、TypeScript 7、pdfjs-dist 6、esbuild 0.28、@vitejs/plugin-react 6
- 适配 Electron 45 新剪贴板 API，截图复制改由主进程写入 PNG
- 统一设置页、截图源、取色结果等区域的玻璃控件与文字对比度

### Fixed

- 修复 JSON 格式化双栏间距过窄与中间分隔线
- 修复 Markdown 输出与 JSON 输入区在面板内出现多余圆角和边框
- 修复截图源列表双层玻璃叠加、卡片发灰的问题
- 修复取色结果面板圆角切断预览、标签与 CSS 值看不清的问题
- 修复更新检查按钮在玻璃卡片内呈现实心灰块的问题
- 修复 Electron 45 移除 `File.path` 后 HEIC 与文档拖拽无法读取本地路径
- 修复 PDF.js 6 离开 PDF 模块时因 `destroy` API 变化导致的崩溃
- e2e 增加逐用例隔离，修复 Windows 环境下的玻璃断言兼容

## [1.1.2] - 2026-11-06

### Added

- GitHub Actions 自动打包：macOS x64/arm64（`dmg` + `zip`）、Windows x64/arm64（NSIS）
- 推送 `v*` tag 自动构建并附加到 GitHub Release，支持手动触发
- tag 构建自动同步 `package.json` 版本号
- 本地打包脚本 `package:mac`、`package:win`
- Electron 全功能 e2e（54 项）与 `tests/fixtures/` 测试素材
- README 功能截图与介绍（11 个模块）
- 中英双语与设置页语言切换，选择持久化到 localStorage
- 主进程错误、原生对话框与悬浮窗文案国际化
- 1000×700 / 1200×760 响应式布局与英文侧边栏适配
- 语言选项使用 DOM 渲染，不依赖位图
- 基于 GitHub Releases 的版本检查、更新提示与下载跳转
- 深色/浅色玻璃主题切换与持久化，全部主要表面玻璃化
- 独立设置页：外观、语言、版本与更新三个玻璃卡片，支持返回与工具自动关闭
- 主题选项提供深色/浅色玻璃预览，显示当前版本与更新状态
- e2e 增加设置页英文扫描、主题持久化与 1000×700 响应式覆盖
- 本地打包通过 `extraResources` 内置 MarkItDown，真实转换器 e2e 覆盖 TXT/PDF
- `npm run setup:markitdown` 准备本地转换器
- CI 自动准备 MarkItDown：macOS arm64 下载 Release 资源，其余平台 PyInstaller 构建
- CI 增加浏览器 e2e 与 macOS x64 Electron e2e

### Changed

- 界面版本号改为从 `package.json` 注入，tag 构建自动同步
- 全部界面文案改为运行时国际化，支持中英即时切换
- 语言与主题切换从侧边栏底部移入设置页，侧边栏仅保留设置与版本入口

### Fixed

- 主题预览卡片在按钮 flex 布局中宽度塌缩为 2px，现完整显示深色/浅色预览
- PDF 转图片结果区的“下载全部 ZIP”单独悬空，现移入“图片结果”标题栏与数量徽标同排
- 文档、PDF、视频、去水印按钮的单字图标导致“清清空 / Clear Clear”重复，现改用 emoji 图标
- 输入框同时叠加 outline、边框和阴影形成多重蓝框，现保留单一焦点提示
- 禁用主按钮仍显示亮蓝色，现改为中性灰玻璃并移除阴影
- 1000×700 下侧边栏最后工具被挤出，现压缩短窗口导航使 11 个工具可见
- 图片转换格式按钮在 1000px 下孤立换行，现 1180px 以下控制区改单列
- 设置页在 700px 高度下第三张卡片截断，现压缩卡片间距并完整显示
- 批量控制区、内部信息条、SVG 代码区与结果值缺少玻璃配方，现统一半透明填充与模糊
- 浅色主题多层历史变量覆盖导致表面过透，现统一最终玻璃填充与边框

- PDF 转图片在 Electron 28 下缺少 `Promise.try`、`Uint8Array.toHex`、`Map.getOrInsertComputed` 等 API，补充 core-js polyfill
- 文档转 Markdown 通过“选择文件”可绕过类型校验，现与拖拽一致并提示不支持类型
- 文件搜索根目录不存在时静默返回空结果，现显示“搜索失败”；不可读子目录继续跳过
- MarkItDown 转换成功但内容为空时（如图片型 PDF）无任何提示，现显示“未提取到 Markdown 内容”
- 图片转换的 GIF/ICO 输出实际为 PNG，现使用真正编码器输出对应格式
- 损坏图片被静默接受，现提示图片加载失败

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
