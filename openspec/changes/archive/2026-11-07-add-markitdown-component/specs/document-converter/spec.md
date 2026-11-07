# Spec Delta

## ADDED Requirements

### Requirement: 缺少组件提示

文档转 Markdown 在 MarkItDown 组件缺失且无其他来源时 MUST 提示下载组件，并提供可操作入口。

#### Scenario: 组件缺失

- **WHEN** 用户进入文档转 Markdown 且组件未安装
- **THEN** 页面显示组件下载提示，用户可在原地下载并继续转换
