# Proposal

## Why

当前 11 个工具全部内置，安装包体积主要由 Electron 与 MarkItDown 二进制构成；后续功能继续增加会持续放大包体，也无法让用户按需启用。需要一套通用插件框架，把纯代码功能与重型二进制组件解耦，支持按需下载、启用、常驻与更新。

## What Changes

- 新增进程内受信插件运行时：插件以 ZIP 包分发，包含 `plugin.json` 与 IIFE `main.js`，安装到用户数据目录后由宿主加载并挂载到主界面。
- 新增独立插件仓库 `bennett-toolbox-plugins`，托管 registry.json、示例插件与构建发布流程。
- 新增设置页“插件”管理卡片：查看已安装/可安装插件，安装、启用、停用、常驻、更新、卸载与刷新 registry。
- 首个示例插件 `bennett.text-stats`（文本统计），用于验证安装、加载、主题/语言跟随、停用与更新链路。
- 主进程增加下载、SHA-256 校验、安全解压、原子安装、状态持久化与插件 IPC。
- 内置模块保持内置；MarkItDown 二进制迁移到组件/插件列为后续阶段。

## Capabilities

### New Capabilities

- `plugin-framework`: 插件包格式、manifest/registry 校验、安装与加载生命周期、安全边界。
- `plugin-settings`: 设置页插件管理 UI、启用/常驻/更新/卸载操作。

### Modified Capabilities

- `settings-page`: 增加插件管理卡片。
- `i18n`: 增加插件管理文案与插件名称本地化规则。
- `responsive-layout`: 插件管理卡片在窄窗口下无横向溢出。

## Impact

- `electron/main.ts` 与新增 `electron/plugins/*`：下载、校验、安装、状态与 IPC。
- 新增 `src/plugins/*`、`src/components/PluginManagerCard.tsx`：运行时与管理 UI。
- `src/App.tsx`、`src/components/Sidebar.tsx`、`src/shared/types.ts`：插件模块合并与导航。
- `src/i18n/en.json`、`src/styles/global.css`：文案与样式。
- 测试、README、CHANGELOG 与独立插件仓库。
