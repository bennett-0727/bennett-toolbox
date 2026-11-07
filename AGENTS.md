# 项目记忆

## 硬性规则

1. Git
   - 默认分支是 `master`，不使用 `main`。
   - 未经用户明确指令，不执行 `git add` / `commit` / `push` / `tag`；改完文件先汇报，等待指令。
   - 提交信息、推送信息使用中文。
2. 文案与国际化
   - 不在 README、CHANGELOG、提交信息、Release 等位置使用“反编译”“重建版”等表述。
   - 所有用户可见文案必须支持 中文 / English；新增中文文案需补 `src/i18n/en.json` 或 `src/i18n/messages.ts` 动态规则。
   - 语言与主题切换集中在设置页（`src/components/SettingsPage.tsx`），默认 `zh-CN` 与 `glass-dark`，持久化 key 为 `bennett-language` / `bennett-theme`。
   - 含文字的图形/图标使用 SVG 或 DOM/CSS，不把中文烘焙进位图。
3. 变更流程（OpenSpec）
   - 所有代码与文档变更先走 OpenSpec：
     1. `/opsx:propose "<需求>"`
     2. `/opsx:apply`
     3. `/opsx:archive`
   - 规格目录 `openspec/specs/`，变更目录 `openspec/changes/`。
   - 新产物使用中文（`openspec/config.yaml` 已配置）。
4. 测试
   - 单元测试与 e2e 都必须相互隔离：每个用例自行准备和清理状态，不依赖其他用例或执行顺序。
   - 做功能或修复时，只运行与改动影响面相关的定向测试，不做无差别全量回归。
   - 定向运行示例：`node --test --test-name-pattern="<用例名>" tests/electron.full.mjs`
   - 全量测试仅在发布新版本或用户明确要求时执行。

## 项目信息

- 名称：Bennett Toolbox
- 技术栈：Electron 45、React 19.3.1、TypeScript 7、Vite 8
- 运行时：Node.js >= 24.8.0（验证环境 26.13.0），包管理器 npm
- 测试：浏览器 `npm run test:e2e`；Electron 功能 `npm run test:electron`（54 项，含设置页英文扫描、主题持久化与响应式）；插件规则 `npm run test:unit`（6 项）；插件安装/加载/安全/组件下载 `npm run test:plugins`（3 项）；打包版通过 `ELECTRON_APP_PATH` 指向 `.app` 可执行文件
- 插件：独立仓库 `bennett-0727/bennett-toolbox-plugins`，registry 通过 GitHub Release 分发；插件运行在受信渲染进程，安装包使用 SHA-256 校验
- 屏幕适配：验证 1000×700 与 1200×760 无横向溢出，英文侧栏不截断，设置页 1120px 以下单列
- 设置页：侧边栏“设置”入口，含外观（主题预览）、语言、插件管理与版本更新；选择工具自动关闭
- 更新检查：读取 GitHub `bennett-0727/bennett-toolbox` 的 Releases；仅检测与跳转，不自动下载/安装
- 主题：`glass-dark` / `glass-light` / `glass-aurora` / `glass-ocean` / `glass-sunset`，`html[data-theme]` 驱动，localStorage key `bennett-theme`；彩色皮肤通过 `--accent-rgb` 等令牌换色，新表面必须使用玻璃配方
- 校验：`npm run typecheck`、`npm run build`、`npm run build:electron`

## 备注

- OpenSpec CLI 需要 Node.js 20+；本机默认 Node 16 会报错，使用前切到 Node 26。
