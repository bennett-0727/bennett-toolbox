# release-packaging Specification

## Purpose
定义 Bennett Toolbox 桌面产物的自动构建与发布行为，确保版本 tag 能稳定产出覆盖 macOS 与 Windows、多种 CPU 架构的可下载安装包。

## Requirements

### Requirement: 版本 tag 自动触发构建

系统 SHALL 在推送匹配 `v*` 的 Git tag 时自动启动桌面产物构建，并 SHALL 支持手动触发同一构建流程。

#### Scenario: 推送版本 tag

- **WHEN** 仓库收到形如 `v1.1.1` 的 tag 推送
- **THEN** GitHub Actions 自动启动打包工作流，且工作流标识对应 tag

#### Scenario: 手动触发

- **WHEN** 维护者在 Actions 页面手动运行打包工作流
- **THEN** 工作流执行同一套构建步骤，但跳过 Release 附件上传

### Requirement: 多平台多架构产物

系统 SHALL 为 macOS 产出 `dmg` 与 `zip` 两种格式的 x64 与 arm64 产物，并 SHALL 为 Windows 产出 x64 与 arm64 的 NSIS 安装包（`exe`）。

#### Scenario: macOS 产物

- **WHEN** 打包工作流在 macOS 构建任务中完成
- **THEN** 产物包含 x64 与 arm64 各自的 `dmg` 与 `zip` 文件，文件名包含应用名、版本与架构标识

#### Scenario: Windows 产物

- **WHEN** 打包工作流在 Windows 构建任务中完成
- **THEN** 产物包含 x64 与 arm64 的 NSIS `exe` 安装包，文件名包含应用名、版本与架构标识

### Requirement: 构建前质量门槛

系统 MUST 在生成安装包前完成 TypeScript 类型检查、前端构建与主进程构建；任一环节失败时 MUST 使工作流失败且不发布任何产物。

#### Scenario: 类型检查失败

- **WHEN** `npm run build` 因类型错误返回非零退出码
- **THEN** 打包步骤不执行，工作流标记为失败，且不创建 Release 附件

#### Scenario: 构建成功

- **WHEN** 类型检查、前端构建与主进程构建全部成功
- **THEN** 工作流继续执行各平台打包步骤

### Requirement: 产物归档与 Release 附件

系统 SHALL 将每次成功构建的安装包上传为 GitHub Actions artifacts，并 SHALL 在 tag 触发时将同一批产物附加到对应版本的 GitHub Release。

#### Scenario: tag 构建完成

- **WHEN** tag 触发的所有平台构建任务成功
- **THEN** 对应 Release 包含 macOS 与 Windows 的全部安装包，且 Actions 运行中可下载同一批 artifacts

#### Scenario: 手动构建完成

- **WHEN** 手动触发的所有平台构建任务成功
- **THEN** 产物仅上传为 Actions artifacts，不修改任何 Release

### Requirement: 未签名产物说明

系统 MUST 在项目文档中说明 macOS 与 Windows 产物默认未签名、未公证，并提示用户首次运行可能遇到的安全拦截。

#### Scenario: 查阅发布说明

- **WHEN** 用户阅读 README 的发布章节
- **THEN** 能看到未签名产物在 Gatekeeper 与 SmartScreen 下的运行提示
