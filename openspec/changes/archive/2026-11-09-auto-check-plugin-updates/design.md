# Design

## Context

- 插件快照由 `PluginsProvider` 持有；挂载时先调用 `listPlugins()` 读取本地缓存并渲染，避免界面空白。
- registry 刷新现有两个入口：工作台“刷新插件列表”按钮调用 `refreshRegistry()`；插件卡片内仅在“无缓存”时自动刷新一次。
- 主进程 `loadRegistry({ forceRefresh: true })` 负责拉取并写入 `registry-cache.json`，单次请求受 30 秒超时限制。
- 应用使用 `React.StrictMode`，挂载效果会执行两次；自动刷新必须只发一次请求。

## Goals / Non-Goals

**Goals:**

- 每次应用启动后自动检查一次插件更新，存在缓存时也执行。
- 自动刷新不阻塞界面、不显示错误，失败保留缓存。
- 自动与手动刷新共享同一个进行中的请求。

**Non-Goals:**

- 不实现定时轮询或后台常驻定时器。
- 不自动下载或自动安装插件更新，只让“更新”入口可见。
- 不改变 registry 格式、下载地址校验与插件安装流程。

## Decisions

### 自动刷新位置：PluginsProvider

在 `PluginsProvider` 的初始快照加载完成后触发自动刷新，而不是放在 `PluginManagerCard`。

- 原因：插件卡片只在工作台渲染，且现有逻辑仅在“无缓存”时刷新；应用直接进入某个插件时不会检查更新。
- 备选：保留卡片内逻辑并放宽条件——仍受挂载时机限制，且与手动刷新状态耦合。

### 静默刷新路径与快照合并

自动刷新走独立静默路径：不设置 `busy`、不写 `error`，失败仅 `console.warn`。成功后只合并 `available` 与 `registryUpdatedAt`，保留当前 `installed`。

- 原因：静默失败符合规格；只合并 registry 数据可避免自动刷新结果覆盖同时发生的安装/更新状态。
- 备选：复用 `run("registry", ...)`——会置全局 busy，阻塞按钮，违反“界面可交互”场景。

### 单飞刷新：client 层共享 in-flight Promise

在 `src/plugins/client.ts` 为 `refreshRegistry()` 增加模块级 in-flight Promise：存在进行中请求时后续调用复用同一 Promise，结束后清空。

- 原因：自动刷新与手动刷新来自不同组件调用点，client 层单飞能覆盖全部入口。
- 备选：只在 Provider 内用 ref 去重——无法拦截手动刷新路径，且容易出现两次网络请求。

### StrictMode 与生命周期保护

使用 ref 记录“本次会话已触发自动刷新”，并用取消标记避免 Provider 卸载后写入状态；client 单飞作为第二道保护。

- 原因：StrictMode 会重复执行挂载效果，仅靠状态判断可能触发两次请求。

### 移除插件卡片的局部自动刷新

删除 `PluginManagerCard` 中“无缓存时刷新一次”的效果与 `autoRefreshed` ref，由 Provider 统一负责；手动“刷新插件列表”按钮保留。

- 原因：避免新装环境出现两次请求，并让职责单一。
- 备选：保留卡片逻辑——与 Provider 自动刷新重复。

## Risks / Trade-offs

- [每次启动多一次 GitHub 请求] → 仅一次、复用 30 秒超时与缓存回退；不引入定时轮询。
- [离线或 GitHub 不可达] → 静默失败，界面继续使用缓存，不显示错误。
- [自动刷新与安装并发导致快照覆盖] → 自动刷新只合并 `available` 与时间，不动 `installed`。
- [手动刷新与自动刷新同时发生] → client 单飞共享同一 Promise，两处获得一致结果。

## Migration Plan

- 无数据迁移；升级后首次启动即生效。
- 回滚：移除 Provider 自动触发与 client 单飞即可恢复原有手动刷新行为，缓存与状态文件不变。

## Open Questions

（无）
