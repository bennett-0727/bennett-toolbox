# Proposal

## Why

插件状态当前采用无串行化的“读取-修改-写入”，并发安装或多个应用实例同时写入时会相互覆盖。实测 4 个并发安装全部返回成功、插件目录齐全，但状态文件只保留 1 条，用户会看到已安装插件消失。

## What Changes

- 在 `electron/plugins/state.ts` 串行化 `updatePluginState` 的读取、修改与写入，确保同一进程内的并发操作依次合并。
- 在 `electron/main.ts` 增加单实例锁；第二次启动只聚焦已有主窗口，不创建独立窗口与状态写者。
- 新增回归测试：并发安装多个插件后，状态文件与快照包含全部插件；第二实例启动不产生独立窗口。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `plugin-framework`: 增加插件状态写入一致性要求，以及应用单实例运行要求。

## Impact

- 修改：`electron/plugins/state.ts`、`electron/main.ts`
- 测试：`tests/plugins.electron.mjs`
- 不改变插件清单、安装包格式与用户界面行为。
