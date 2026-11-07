# Tasks

## 1. 状态写入串行化

- [x] 1.1 在 `electron/plugins/state.ts` 增加状态更新队列，将 `updatePluginState` 的读取、修改、写入放入同一临界区
- [x] 1.2 确认更新失败不会阻塞后续状态操作

## 2. 单实例运行

- [x] 2.1 在 `electron/main.ts` 的 userData 设置之后申请单实例锁，未获得锁时退出
- [x] 2.2 监听 `second-instance`，恢复并聚焦已有主窗口
- [x] 2.3 记录主窗口引用并在关闭时清理

## 3. 回归测试

- [x] 3.1 新增 `tests/plugins.race.electron.mjs` 并发安装多个插件用例，断言状态文件与快照包含全部插件
- [x] 3.2 增加重复启动用例，断言第二实例不创建独立主窗口

## 4. 验证与归档

- [x] 4.1 运行 `npm run build:electron`、`npm run test:plugins` 与相关定向用例
- [x] 4.2 用复现脚本确认并发安装后状态包含全部条目
- [x] 4.3 归档 OpenSpec 变更
