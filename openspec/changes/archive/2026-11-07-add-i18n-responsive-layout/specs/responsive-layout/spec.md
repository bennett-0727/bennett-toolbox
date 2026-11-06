# Spec Delta

## Purpose

定义应用在窄窗口与英文文案下的布局行为，保证主要内容可读且不产生横向滚动。

## ADDED Requirements

### Requirement: 窄窗口无横向溢出

在 1000×700 与 1200×760 内容尺寸下，页面和主内容区域 MUST NOT 出现横向溢出。

#### Scenario: 中文窄窗口

- **WHEN** 窗口内容区为 1000×700 并依次打开所有模块
- **THEN** `scrollWidth` 不超过 `clientWidth`

#### Scenario: 英文窄窗口

- **WHEN** 语言为英文且窗口为 1000×700
- **THEN** 侧边栏导航文字不截断，所有模块无横向溢出

### Requirement: 响应式面板

窄窗口下宽面板、工具栏和双栏区域 SHALL 自动堆叠或收窄，而非压缩到不可用。

#### Scenario: 双栏模块

- **WHEN** 窗口宽度低于现有断点
- **THEN** PDF、视频、去水印等双栏区域切换为单列
