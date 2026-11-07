# Spec Delta

## Purpose

定义应用基于 GitHub Releases 的版本检测、提示展示与下载跳转行为，让用户无需手动查看仓库即可知道是否有新版本。

## ADDED Requirements

### Requirement: 启动时检测版本

应用 SHALL 在启动时请求 GitHub Releases，筛选语义化 `vX.Y.Z` 版本并与当前应用版本比较；请求失败 MUST NOT 打断应用使用。

#### Scenario: 发现新版本

- **WHEN** 最新 Release 版本高于当前版本
- **THEN** 侧边栏版本号显示更新标记，并展示“发现新版本”提示条

#### Scenario: 已是最新

- **WHEN** 用户点击版本号手动检查且没有更高版本
- **THEN** 显示“已是最新版本”提示

#### Scenario: 网络失败

- **WHEN** GitHub API 请求失败且用户手动检查
- **THEN** 显示“检查更新失败”，应用其他功能不受影响

### Requirement: 下载跳转

提示条 SHALL 提供“前往下载”按钮，打开对应 GitHub Release 页面，且 MUST 只允许打开本仓库的 GitHub 链接。

#### Scenario: 点击前往下载

- **WHEN** 用户点击“前往下载”
- **THEN** 通过系统默认浏览器打开该版本 Release 页面
