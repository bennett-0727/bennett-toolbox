# Spec Delta

## ADDED Requirements

### Requirement: 主题选择控件使用 DOM/CSS

主题选择控件 MUST 使用 DOM 渲染的文字与 CSS 预览，不得把中文或主题界面截图烘焙进位图。

#### Scenario: 设置页主题选项

- **WHEN** 查看设置页外观分区
- **THEN** 主题预览由 DOM/CSS 绘制，界面文字由 DOM 渲染并支持翻译，不依赖位图预览

## MODIFIED Requirements

### Requirement: 深浅玻璃主题切换

系统 SHALL 提供深色玻璃与浅色玻璃两套主题，用户 MUST 能在设置页切换，切换立即生效并持久化。

#### Scenario: 切换到浅色玻璃

- **WHEN** 用户在设置页点击浅色玻璃主题选项
- **THEN** `html[data-theme]` 为 `glass-light`，页面使用浅色令牌与浅色玻璃表面，选项显示激活状态

#### Scenario: 重启恢复主题

- **WHEN** 用户选择主题后重新打开应用
- **THEN** 主题从 localStorage 恢复，设置页对应选项为激活状态

### Requirement: 全部表面覆盖

所有主要界面表面 SHALL 使用玻璃配方（半透明填充、backdrop blur、白边与高光），不得保留不透明实心底。

#### Scenario: 面板与列表

- **WHEN** 打开任一模块
- **THEN** 面板、卡片、表格、输入框、错误条与进度条均呈现玻璃效果

#### Scenario: 设置页与内部表面

- **WHEN** 打开设置页或查看批量控制区、内部信息条、SVG 代码区
- **THEN** 这些表面同样使用半透明填充与模糊，不得出现扁平实心底

## REMOVED Requirements

### Requirement: 主题切换图标使用 SVG

**Reason**: 主题切换控件已从侧边栏移入设置页，原侧边栏图标场景不再存在。

**Migration**: 使用“主题选择控件使用 DOM/CSS”要求，主题选项文字与预览均由 DOM/CSS 渲染。
