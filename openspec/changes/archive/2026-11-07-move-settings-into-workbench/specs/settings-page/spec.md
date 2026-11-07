# Spec Delta

## ADDED Requirements

### Requirement: 工作台内设置

设置 SHALL 以卡片形式嵌入工作台主界面，侧栏 MUST NOT 提供独立设置入口。

#### Scenario: 打开应用

- **WHEN** 应用启动进入工作台
- **THEN** 外观、语言、版本更新卡片直接可见，无需打开弹层

#### Scenario: 切换主题

- **WHEN** 用户在工作台点击主题
- **THEN** 主题立即生效，工作台保持当前滚动位置
