# Tasks

## 1. 主题模型与设置项

- [x] 1.1 扩展 `src/theme.ts` 的 `Theme` 为 `glass-dark | glass-light | glass-aurora | glass-ocean | glass-sunset`，用支持列表校验 `getInitialTheme` 并对非法值回退 `glass-dark`；运行 `npm run typecheck` 通过
- [x] 1.2 在 `src/components/SettingsPage.tsx` 的 `THEMES` 中按「深色玻璃 → 浅色玻璃 → 极光紫 → 深海青 → 落日橙」顺序追加三项；打开设置页可见 5 个 `.theme-option`

## 2. 彩色皮肤样式

- [x] 2.1 在 `src/styles/glass.css` 的 `:root` 增加 `--accent-rgb`、`--accent-2-rgb`、`--accent-3-rgb`，将主色 `rgba(10, 132, 255, …)`、辅助色 `rgba(191, 90, 242, …)`、点缀色 `rgba(48, 209, 188, …)` 及 `#0a84ff` / `#64d2ff` 替换为令牌或 `--primary-*` 变量；搜索上述字面量确认 `glass.css` 无残留
- [x] 2.2 新增 `html[data-theme="glass-aurora"]`、`glass-ocean`、`glass-sunset` 变量块，覆盖三组 RGB 令牌、`--primary-hue/-color/-light/-dark` 与 `.app` 基底渐变；切换皮肤后导航激活态、主按钮、进度条与背景光晕呈现对应主色
- [x] 2.3 为 `.theme-preview.glass-aurora` / `.glass-ocean` / `.glass-sunset` 增加独立配色预览，并将 `.theme-options` 改为 `repeat(auto-fit, minmax(120px, 1fr))`；设置页每个预览可见且宽度大于 100px
- [x] 2.4 回归 `glass-light`：切换浅色玻璃后主色仍为蓝色系，玻璃表面含 `backdrop-filter: blur`，正文对比度正常

## 3. 国际化

- [x] 3.1 设置页外观说明改为「选择玻璃主题或彩色皮肤」，在 `src/i18n/en.json` 增加该说明与「极光紫」「深海青」「落日橙」的英文映射；English 模式下设置页扫描无中文

## 4. 测试

- [x] 4.1 将 `tests/electron.full.mjs` 的 `setTheme` 改为按 `data-theme` 定位选项，并扩展主题测试：5 个选项齐全、逐套选择彩色皮肤后 `html[data-theme]` 与 `aria-pressed` 正确、重载后恢复、计算主色随皮肤变化；`npm run test:electron` 通过
- [x] 4.2 在设置页英文扫描与响应式测试中覆盖新增标签，验证 1000×700 与 1200×760 无横向溢出且英文标签不截断；`npm run test:electron` 通过

## 5. 文档与整体校验

- [x] 5.1 更新 `README.md` 与 `AGENTS.md` 的主题列表、设置页说明与测试数量；文档中不出现“反编译”“重建版”等表述
- [x] 5.2 运行 `npm run typecheck`、`npm run build`、`npm run build:electron` 全部通过；浏览器 `npm run test:e2e` 按用户要求未全量执行
