# Proposal

## Why

插件框架已支持外部插件，但 11 个功能仍静态内置，应用壳与工具耦合、安装包包含全部模块代码。将全部功能迁移为插件，可以让用户按需安装、独立更新，并为后续插件生态建立统一入口。

## What Changes

- 11 个内置模块迁移到独立插件仓库，ID 为 `bennett.<old-id>`，recommended + order 元数据。
- 应用壳移除模块静态导入与 switch，侧栏/模块区完全由已启用插件提供；新增空壳引导与“安装全部推荐工具”。
- 插件运行时增加 `assets.url()` 与 bundle baseUrl，支持 PDF worker 等插件资产；插件保留受信 Node/IPC 能力。
- 模块旧 order/active ID 自动迁移到新插件 ID；主题切换不再 remount 插件。
- 测试/CI/截图改为从固定插件仓库构建或本地 registry 安装 11 个插件；浏览器测试改为壳层。
- 版本提升到 2.0.0，保留 1.3.0 回滚。

## Capabilities

### New Capabilities

- `plugin-delivery`: 11 个官方插件、recommended/order、安装全部与空壳引导。

### Modified Capabilities

- `plugin-framework`: assets API、主题生命周期、全 IPC sender 校验。
- `plugin-settings`: 安装全部推荐工具与自动刷新。
- `i18n`: 插件自带字典与宿主语言同步。
- `settings-page`: 空壳/插件入口。

## Impact

- `src/App.tsx`、`src/components/Sidebar.tsx`、`src/components/SettingsPage.tsx`、`src/plugins/*`
- `electron/plugins/*`、`electron/main.ts`、`electron/ipc-utils.ts`
- 插件仓库新增 11 个插件与 shared 层
- 测试、CI、截图、README/CHANGELOG/AGENTS
