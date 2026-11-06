# Proposal

## Why

应用目前只有中文界面，且布局主要面向 1400×900 窗口。英文文案更长、不同屏幕宽度也更常见，需要可切换语言并保证在 1000×700 及以上窗口无横向溢出。

## What Changes

- 增加中英双语：侧边栏底部胶囊按钮切换 中文 / English，选择持久化到 localStorage。
- 建立运行时国际化层：以中文原文为键，英文词典 + 动态消息规则覆盖 JSX 文案、属性、错误和结果状态。
- 主进程增加 `set-language` IPC，原生对话框、错误返回和悬浮窗 HTML 使用当前语言。
- 响应式布局：1000–1200px 窗口下侧栏收窄、面板堆叠、英文侧栏不截断。
- 所有含文字的新图形使用 SVG（语言切换图标为内联 SVG）。
- 新增 e2e：英文全模块扫描、英文数据状态、主进程英文错误、1000×700/1200×760 溢出检查。

## Capabilities

### New Capabilities

- `i18n`: 语言切换、持久化与全部用户可见文案的中英翻译。
- `responsive-layout`: 窄窗口与英文文案下的布局适配。

### Modified Capabilities

无。

## Impact

- 新增 `src/i18n/`（词典、动态规则、JSX 运行时包装）。
- 修改 `src/App.tsx`、`src/components/Sidebar.tsx`、`src/styles/global.css`、`electron/main.ts`、`vite.config.ts`。
- 新增 4 项 e2e；现有中文用例保持默认中文。
