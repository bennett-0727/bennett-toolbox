# Tasks

## 1. 跨版本查找

- [x] 1.1 新增组件解析逻辑：当前版本优先，回退到最近安装的旧版本
- [x] 1.2 状态返回实际组件版本，保留 `MARKITDOWN_BIN` 优先级

## 2. 安装与清理

- [x] 2.1 成功安装新组件后清理其他版本目录

## 3. 测试与文档

- [x] 3.1 在 `tests/plugins.electron.mjs` 增加跨版本复用用例
- [x] 3.2 更新 `CHANGELOG.md`、`README.md` 与 `AGENTS.md` 测试数量

## 4. 验证与归档

- [x] 4.1 运行 `npm run typecheck`、`npm run build`、`npm run test:plugins`
- [x] 4.2 用旧版本组件目录验证升级场景
- [x] 4.3 归档 OpenSpec 变更
