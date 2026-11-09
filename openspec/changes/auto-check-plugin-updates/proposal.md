# Proposal

## Why

插件新版本发布后，已安装插件只有在用户手动点击“刷新插件列表”后才会出现“更新 vX”按钮；应用启动时仅读取本地 registry 缓存，导致更新感知依赖用户主动操作。

## What Changes

- 应用启动并在初始插件快照加载完成后，后台自动刷新一次插件 registry。
- 刷新成功后更新可安装/可更新列表，使已安装插件的新版本自动显示“更新”按钮，无需手动刷新。
- 自动刷新失败时静默回退到本地缓存，不阻塞界面，不显示错误提示。
- 同一时间仅允许一个 registry 刷新请求；自动刷新与手动刷新复用同一个进行中的请求。
- 将“自动刷新”职责统一到 `PluginsProvider`，移除插件卡片中“仅无缓存时刷新一次”的局部逻辑。
- 补充 Electron 测试：存在旧缓存时，启动或重载后无需手动刷新即可看到插件更新按钮。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `plugin-settings`: 新增“自动检查插件更新”的行为要求，覆盖启动自动刷新、静默失败回退与并发刷新合并。

## Impact

- 代码：`src/plugins/PluginsContext.tsx`、`src/plugins/client.ts`、`src/components/PluginManagerCard.tsx`
- 测试：`tests/plugins.electron.mjs` 或新增独立 Electron 测试文件
- 不改动 IPC 接口、registry 格式与插件包格式；不涉及插件仓库
