# Tasks

## 1. 刷新单飞

- [x] 1.1 在 `src/plugins/client.ts` 为 `refreshRegistry()` 增加模块级 in-flight Promise，进行中的调用复用同一 Promise，结束后清空；验证：`npm run typecheck` 通过，且并发场景用例观察到一次 `plugins:refresh-registry` 调用

## 2. 启动自动刷新

- [x] 2.1 在 `src/plugins/PluginsProvider` 的初始 `listPlugins()` 完成后触发一次静默刷新，仅合并 `available` 与 `registryUpdatedAt`，失败 `console.warn` 且不设置 `error`/`busy`；验证：`npm run typecheck` 通过，启动后自动出现更新按钮（由 3.1 覆盖）
- [x] 2.2 删除 `PluginManagerCard` 中“无缓存时自动刷新”的效果与 `autoRefreshed` ref，保留“刷新插件列表”手动入口；验证：`node --test --test-name-pattern="插件安装" tests/plugins.electron.mjs` 通过

## 3. Electron 测试

- [x] 3.1 新增 `tests/plugins.autocheck.electron.mjs`：预置旧 `registry-cache.json`（v1.0.0），本地 registry 提供 v1.0.1，启动后不点击“刷新插件列表”应出现“更新 v1.0.1”；验证：`node --test --test-name-pattern="启动自动发现更新" tests/plugins.autocheck.electron.mjs` 通过
- [x] 3.2 在同一测试文件覆盖失败回退：registry 不可用时仍显示缓存插件、不出现 `.plugin-error`；验证：`node --test --test-name-pattern="自动刷新失败" tests/plugins.autocheck.electron.mjs` 通过
- [x] 3.3 在同一测试文件覆盖并发合并：通过 `page.addInitScript` 包装 `ipcRenderer.invoke` 计数并延迟 `plugins:refresh-registry`，自动刷新期间点击“刷新插件列表”只产生一次调用；验证：`node --test --test-name-pattern="并发刷新合并" tests/plugins.autocheck.electron.mjs` 通过

## 4. 集成验证

- [x] 4.1 运行 `npm run typecheck` 与 `npm run build`，确认构建通过
- [x] 4.2 运行定向 Electron 用例：`node --test --test-name-pattern="插件" tests/plugins.electron.mjs`，确认原有安装、更新、卸载流程无回归
