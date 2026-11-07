# Design

## Context

当前应用只有 11 个工具模块，没有路由；`App` 以 `activeModuleId` 决定主内容。语言与主题状态已提升到 `App`，并分别由 `i18n` 与 `theme` 持久化。玻璃主题通过 `src/styles/glass.css` 中的令牌和选择器覆盖全局样式，但经历多轮追加后存在重复的浅色变量块，部分内部表面未纳入玻璃配方。

## Goals / Non-Goals

**Goals:**

- 以最小改动引入设置页，不引入路由库或全局状态库。
- 语言、主题、版本更新继续复用 `App` 现有状态与 IPC。
- 设置页和剩余内部表面使用同一套玻璃令牌。
- 保持 1000×700 无横向溢出，原有 54 项 e2e 继续通过。

**Non-Goals:**

- 不新增应用级导航路由或设置持久化后端。
- 不改变 GitHub Releases 更新检测协议。
- 不重构模块内部组件结构。

## Decisions

### 设置页作为主内容视图而非模态框

在 `App` 增加 `settingsOpen` 布尔状态；设置页与模块共用 `main-module` 容器，侧边栏保持可见。选择工具时同时更新 `activeModuleId` 并关闭设置页；设置页“返回”只关闭设置页并恢复此前工具。

选择视图而非模态框的原因：设置页内容较多，窄窗口需要滚动；视图方式可直接复用主内容布局与响应式断点。模态方案需要额外的焦点陷阱、遮罩与关闭逻辑，收益不足。

### 设置页组件接收受控 props

新增 `SettingsPage`，由 `App` 传入 `language`、`theme`、`updateStatus`、`updateVersion` 及回调。组件不直接读写 localStorage 或 IPC，保持与现有 `Sidebar` 一致的单向数据流；语言和主题仍通过 `App` 的 `handleLanguageChange` / `handleThemeChange` 应用。

### 主题预览使用 DOM/CSS 而非截图

外观选项内用 CSS 渐变、伪元素和两个 `span` 模拟侧边栏与内容面板，文字用 DOM 渲染。相比位图预览，CSS 预览可随主题令牌实时变化、支持翻译且不产生额外资源。

**关键修复**：`theme-option` 是 `<button>`，全局按钮样式可能带来 `align-items:center`，导致作为 flex 子项的 `.theme-preview` 收缩为 2px。设计上显式设置 `align-items:stretch` 与 `width:100%`，保证预览宽度。

### 玻璃样式收敛为最终覆盖层

保留既有历史样式块，在 `glass.css` 末尾追加“最终对比度层”和设置页/内部表面规则，统一浅色玻璃填充与边框，避免逐块回改造成回归。新增规则覆盖设置卡片、主题预览、批量控制区、内部信息条、SVG 代码区与结果值。

### 测试通过设置页操作

e2e 增加 `openSettings`、`closeSettings`、`setLanguage`、`setTheme` 辅助函数，语言/主题用例改为先打开设置页再操作。英文扫描设置页时排除语言选项的本地名称（中文、English），因为语言名按设计保持原生写法。

## Risks / Trade-offs

- [设置页增加 glass 模糊层，软件渲染下可能增加合成开销] → 只对三个卡片和必要内部表面应用 `backdrop-filter`；保留 `--disable-gpu` e2e，验证可用性。
- [历史 CSS 块较多，后续覆盖可能相互影响] → 新规则集中在文件末尾，并用主题 e2e 校验 `backdrop-filter`、背景透明度和无横向溢出。
- [英文扫描误报语言选项] → 测试只排除 `.language-option` 节点，其余设置页文案仍全量扫描。
- [设置页打开状态不持久化] → 重启回到默认工具页符合预期，主题和语言单独持久化。

## Migration Plan

无数据迁移。旧版 localStorage 键 `bennett-theme` 与 `bennett-language` 继续有效；设置页读取同一状态。回滚时删除设置页组件与样式、恢复侧边栏控件即可，不影响持久化数据。
