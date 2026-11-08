# Proposal

## Why

MCP 已提供 14 个工具，但 AI 客户端需要稳定的工具路由、安全边界与排错流程。新增一个薄 Skill，指导何时使用哪个 MCP 工具，并避免重复工具 Schema。

## What Changes

- 新增项目级 skill：`.qoder/skills/bennett-toolbox-mcp/SKILL.md`。
- Skill 覆盖 14 个工具的选择、只读 SQLite 约束、路径/密钥安全、MarkItDown/sharp 依赖与日志排错。
- README 说明 skill 位置与复制到用户级技能目录的方法。
- 不修改 MCP 服务行为。

## Capabilities

无（AI 使用指南，不改变运行时行为）。

## Impact

- 新增：`.qoder/skills/bennett-toolbox-mcp/SKILL.md`
- 修改：`README.md`、`AGENTS.md`、`CHANGELOG.md`
