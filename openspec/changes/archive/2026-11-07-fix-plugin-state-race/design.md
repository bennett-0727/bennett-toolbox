# Design

## Context

`updatePluginState` 直接执行“读取状态 → 修改 → 写入”，没有串行化；`writePluginState` 只串行化写入本身。并发安装时，多个调用读到同一份旧状态，最后写入者覆盖其他条目。另外应用未申请单实例锁，多开实例会各自维护状态写者，进一步放大覆盖风险。

已复现：4 个并发安装全部返回成功、4 个插件目录都存在，但 `plugins-state.json` 只剩 1 条。

## Goals / Non-Goals

**Goals:**

- 同一进程内所有状态变更串行执行，读与写处于同一个临界区。
- 同一用户数据目录只允许一个应用实例写入状态。
- 用回归测试覆盖并发安装与重复启动。

**Non-Goals:**

- 不改变插件清单、安装包格式或安装安全校验。
- 不引入跨进程文件锁或数据库；单实例锁已覆盖桌面使用场景。
- 不修改插件界面与工作台交互。

## Decisions

- 在 `state.ts` 增加 `stateUpdateQueue`，`updatePluginState` 将“读取 + 修改 + 写入”整体排入队列；失败不阻塞后续更新。`writePluginState` 的写队列保留，作为写入原子性的第二层保障。
- 在 `main.ts` 中于 `app.setPath("userData", ...)` 之后调用 `requestSingleInstanceLock()`，保证不同 `BENNETT_USER_DATA_DIR` 的测试实例互不影响；未获得锁时立即退出。`second-instance` 事件聚焦现有主窗口，必要时恢复最小化状态。
- `createMainWindow` 记录主窗口引用并在关闭时清理，供单实例事件与 `activate` 复用。
- 测试沿用 `tests/plugins.electron.mjs` 的本地 registry 与临时用户数据，通过 IPC 并发安装多个 fixture 插件，断言状态与快照包含全部条目。

## Risks / Trade-offs

- 单实例锁在 macOS 开发调试时可能阻止并行启动；通过独立 `BENNETT_USER_DATA_DIR` 仍可并行，测试不受影响。
- 状态更新排队会略微增加连续安装的延迟，但安装本身受网络与解压耗时主导，影响可忽略。
- 若未来需要多进程共享同一用户数据目录，当前方案不覆盖；届时需跨进程锁。
