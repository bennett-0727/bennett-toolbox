# Spec Delta

## ADDED Requirements

### Requirement: 组件管理

设置页插件卡片 SHALL 包含“组件”分组，展示文档转换组件状态，并支持下载/重新下载与进度显示。

#### Scenario: 组件未安装

- **WHEN** 用户打开设置页且 MarkItDown 未安装
- **THEN** 组件行显示未安装与“下载组件”按钮

#### Scenario: 组件已安装

- **WHEN** MarkItDown 已安装
- **THEN** 组件行显示已安装、版本与重新下载入口
