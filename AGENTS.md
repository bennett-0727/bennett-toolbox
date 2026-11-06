# 项目记忆

## 硬性规则

1. Git
   - 默认分支是 `master`，不使用 `main`。
   - 未经用户明确指令，不执行 `git add` / `commit` / `push` / `tag`；改完文件先汇报，等待指令。
   - 提交信息、推送信息使用中文。
2. 文案
   - 不在 README、CHANGELOG、提交信息、Release 等位置使用“反编译”“重建版”等表述。
3. 变更流程（OpenSpec）
   - 所有代码与文档变更先走 OpenSpec：
     1. `/opsx:propose "<需求>"`
     2. `/opsx:apply`
     3. `/opsx:archive`
   - 规格目录 `openspec/specs/`，变更目录 `openspec/changes/`。
   - 新产物使用中文（`openspec/config.yaml` 已配置）。

## 项目信息

- 名称：Bennett Toolbox
- 技术栈：Electron 28、React 19.3.1、TypeScript 5、Vite 5
- 运行时：Node.js >= 24.8.0（验证环境 26.13.0），包管理器 npm
- 测试：浏览器 `npm run test:e2e`；Electron 功能 `npm run test:electron`；打包版通过 `ELECTRON_APP_PATH` 指向 `.app` 可执行文件
- 校验：`npm run typecheck`、`npm run build`、`npm run build:electron`

## 备注

- OpenSpec CLI 需要 Node.js 20+；本机默认 Node 16 会报错，使用前切到 Node 26。
