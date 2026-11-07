# plugin-delivery Specification

## Purpose
TBD - created by archiving change migrate-builtin-modules-to-plugins. Update Purpose after archive.

## Requirements

### Requirement: 官方推荐插件

11 个内置工具 SHALL 作为独立插件发布，MUST 声明 `recommended: true` 与稳定 `order`；应用 SHALL 支持一键安装全部推荐插件。

#### Scenario: 空壳首启

- **WHEN** 应用未安装任何插件
- **THEN** 显示空状态与“安装全部推荐工具”，设置入口可用

#### Scenario: 安装全部

- **WHEN** 用户点击“安装全部推荐工具”
- **THEN** 顺序安装未安装的推荐插件，侧栏出现 11 个工具

### Requirement: 状态迁移

应用 MUST 将旧模块 ID 映射到新插件 ID，并持久化当前模块；插件缺失时回退到首个已启用插件。

#### Scenario: 旧排序迁移

- **WHEN** localStorage 中存在旧模块 ID 顺序
- **THEN** 应用将其映射为插件 ID，并按该顺序显示已安装插件

#### Scenario: 当前插件被卸载

- **WHEN** 用户卸载当前打开的插件
- **THEN** 应用回退到首个已启用插件，没有插件时显示空状态
