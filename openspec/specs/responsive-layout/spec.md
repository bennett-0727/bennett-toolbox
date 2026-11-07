# responsive-layout Specification

## Purpose
定义 Bennett Toolbox 在 1000px 起的窄窗口、英文长文案与不同高度下的响应式布局行为，保证主要内容可读、面板自动堆叠且不产生横向滚动。

## Requirements

### Requirement: 窄窗口无横向溢出

在 1000×700 与 1200×760 内容尺寸下，页面、设置页和主内容区域 MUST NOT 出现横向溢出。

#### Scenario: 中文窄窗口

- **WHEN** 窗口内容区为 1000×700 并依次打开所有模块
- **THEN** `scrollWidth` 不超过 `clientWidth`

#### Scenario: 英文窄窗口

- **WHEN** 语言为英文且窗口为 1000×700
- **THEN** 侧边栏导航文字不截断，所有模块与设置页无横向溢出

### Requirement: 响应式面板

窄窗口下宽面板、工具栏、双栏区域和设置卡片 SHALL 自动堆叠或收窄，而非压缩到不可用。

#### Scenario: 双栏模块

- **WHEN** 窗口宽度低于现有断点
- **THEN** PDF、视频、去水印等双栏区域切换为单列

#### Scenario: 设置页单列

- **WHEN** 窗口宽度低于 1120px 并打开设置页
- **THEN** 外观、语言、版本与更新卡片按单列排列
