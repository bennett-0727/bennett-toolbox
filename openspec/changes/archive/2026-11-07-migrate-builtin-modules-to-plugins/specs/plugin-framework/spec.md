# Spec Delta

## ADDED Requirements

### Requirement: 插件资产

插件 bundle SHALL 提供 baseUrl 与 `assets.url()`，MUST 拒绝绝对路径、反斜杠与 `..`；PDF worker 等资产可从插件版本目录加载。

#### Scenario: PDF worker

- **WHEN** 打开 PDF 插件
- **THEN** workerSrc 指向插件目录内 `pdf.worker.min.mjs`，转换可用

### Requirement: 主题与语言生命周期

主题切换 MUST NOT remount 插件；语言切换 MAY remount 以更新翻译。

#### Scenario: 切换主题

- **WHEN** 用户在插件界面切换玻璃主题
- **THEN** 插件保持挂载状态，CSS 令牌即时更新

#### Scenario: 切换语言

- **WHEN** 用户切换中文/English
- **THEN** 插件重新挂载并使用对应语言字典
