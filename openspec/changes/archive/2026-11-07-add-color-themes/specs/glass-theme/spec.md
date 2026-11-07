# Spec Delta

## MODIFIED Requirements

### Requirement: 深浅玻璃主题切换

系统 SHALL 提供深色玻璃、浅色玻璃与至少三套彩色玻璃皮肤（极光紫、深海青、落日橙），用户 MUST 能在设置页切换，切换立即生效并持久化，重启后恢复。

#### Scenario: 切换到浅色玻璃

- **WHEN** 用户在设置页点击浅色玻璃主题选项
- **THEN** `html[data-theme]` 为 `glass-light`，页面使用浅色令牌与浅色玻璃表面，选项显示激活状态

#### Scenario: 切换到彩色皮肤

- **WHEN** 用户在设置页点击任一彩色皮肤选项
- **THEN** `html[data-theme]` 为该皮肤标识，导航激活态、主按钮、进度条、焦点边框与背景光晕切换为该皮肤主色，玻璃表面仍保持半透明与模糊

#### Scenario: 重启恢复主题

- **WHEN** 用户选择任意主题后重新打开应用
- **THEN** 主题从 localStorage 恢复，设置页对应选项为激活状态

#### Scenario: 存储值无效时回退

- **WHEN** localStorage 中的主题标识不在支持列表内
- **THEN** 应用回退到 `glass-dark`，设置页深色玻璃选项为激活状态

## ADDED Requirements

### Requirement: 彩色皮肤保持玻璃质感与可读性

彩色皮肤 MUST 仅改变主色、辅助色与背景光晕，不得破坏玻璃配方；正文、次要文字与按钮文字在对应背景上 MUST 保持可读对比度。

#### Scenario: 彩色皮肤表面

- **WHEN** 应用处于任一彩色皮肤
- **THEN** 面板、卡片、输入框与浮层仍使用半透明填充、backdrop blur、边框与高光，正文与按钮文字清晰可读

#### Scenario: 彩色皮肤主题预览

- **WHEN** 设置页展示彩色皮肤选项
- **THEN** 每个选项的预览使用该皮肤自身配色绘制，不得塌缩为空白或仅剩边框
