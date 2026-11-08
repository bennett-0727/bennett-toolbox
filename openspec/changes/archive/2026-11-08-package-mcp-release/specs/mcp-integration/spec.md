# Spec Delta

## ADDED Requirements

### Requirement: MCP 发布产物

系统 SHALL 提供 MCP 独立发布流程，生成 standalone `.mjs`、可安装 ZIP 与 SHA-256 校验文件；发布 tag MUST 使用 `mcp-v*`，且 MUST NOT 修改桌面应用版本或成为应用更新源。

#### Scenario: 独立发布

- **WHEN** 推送 `mcp-v0.2.0` tag
- **THEN** Release 包含 MCP standalone、ZIP、校验文件，且不标记为应用最新版本

#### Scenario: 安装 ZIP

- **WHEN** 用户解压 ZIP 并执行 `npm install && npm start`
- **THEN** MCP 服务可启动并列出全部工具

#### Scenario: Standalone

- **WHEN** 用户使用 standalone `.mjs` 启动
- **THEN** 除依赖 sharp 的图片工具外，其余工具可用
