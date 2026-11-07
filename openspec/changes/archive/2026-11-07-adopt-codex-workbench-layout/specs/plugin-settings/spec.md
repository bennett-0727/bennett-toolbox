# Spec Delta

## ADDED Requirements

### Requirement: 工作台管理

插件安装、启用、停用、常驻、更新与卸载 SHALL 在工作台完成；设置页不提供插件管理。

#### Scenario: 默认工作台

- **WHEN** 应用启动且未选择工具
- **THEN** 显示工作台与插件列表，不自动加载任何插件界面

#### Scenario: 卸载插件

- **WHEN** 用户在工作台卸载插件
- **THEN** 插件文件与状态被删除，侧栏移除该插件
