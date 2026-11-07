# Tasks

## 1. 侧栏交互

- [x] 1.1 在 `Sidebar` 增加收起状态、localStorage 持久化与展开/收起按钮
- [x] 1.2 收起时隐藏文字标签，保留图标并补充 `title`/`aria-label`

## 2. 样式与文案

- [x] 2.1 在 `glass.css` 增加 `.sidebar.collapsed` 宽度、布局、过渡与浅色主题样式
- [x] 2.2 在 `src/i18n/en.json` 增加“收起侧栏 / 展开侧栏”英文文案

## 3. 测试与文档

- [x] 3.1 在 `tests/electron.full.mjs` 增加展开/收起、文字隐藏、重载持久化与恢复用例
- [x] 3.2 更新 `CHANGELOG.md`、`README.md` 与 `AGENTS.md` 的测试数量说明

## 4. 验证与归档

- [x] 4.1 运行 `npm run typecheck`、`npm run build`、定向侧栏测试与 `npm run test:plugins`
- [x] 4.2 归档 OpenSpec 变更
