# Spec Delta

## Purpose

定义 Apple 风格玻璃主题与深浅换肤能力，确保切换后全部界面表面保持一致质感并可持久化。

## ADDED Requirements

### Requirement: 深浅玻璃主题切换

系统 SHALL 提供深色玻璃与浅色玻璃两套主题，切换立即生效并持久化。

#### Scenario: 切换到浅色玻璃

- **WHEN** 用户点击浅色主题按钮
- **THEN** `html[data-theme]` 为 `glass-light`，页面使用浅色令牌与浅色玻璃表面

#### Scenario: 重启恢复主题

- **WHEN** 用户选择主题后重新打开应用
- **THEN** 主题从 localStorage 恢复

### Requirement: 全部表面覆盖

所有主要界面表面 SHALL 使用玻璃配方（半透明填充、backdrop blur、白边与高光），不得保留不透明实心底。

#### Scenario: 面板与列表

- **WHEN** 打开任一模块
- **THEN** 面板、卡片、表格、输入框、错误条与进度条均呈现玻璃效果

### Requirement: 主题切换图标使用 SVG

主题切换按钮 MUST 使用内联 SVG 图标，不把中文或图标烘焙进位图。

#### Scenario: 侧边栏主题按钮

- **WHEN** 查看侧边栏底部
- **THEN** 太阳/月亮图标为内联 SVG，激活项文字/图标为白色
