# Proposal

## Why

MCP 服务目前只能从源码仓库运行，无法从 GitHub Releases 下载。需要在**不发布新应用版本**的前提下，用独立 `mcp-v*` Release 提供可直接运行/安装的 MCP 产物。

## What Changes

- 新增 `npm run build:mcp`：esbuild 打包 MCP 服务，生成 standalone `.mjs` 与可安装 ZIP。
- ZIP 包含 `server.mjs`、`package.json`（仅 sharp 依赖）与 README；standalone 版本除图片工具外开箱可用。
- 新增 `.github/workflows/mcp-release.yml`：推送 `mcp-v*` tag 时运行 MCP 测试、构建并发布，标记 `make_latest: false`，不影响应用最新版本。
- README 与 `docs/mcp.md` 增加下载/安装说明。
- MCP 版本提升到 `0.2.0`。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `mcp-integration`: 增加 MCP 发布产物与独立 Release 要求。

## Impact

- 新增：`scripts/build-mcp.mjs`、`.github/workflows/mcp-release.yml`
- 修改：`mcp/server.mjs`（版本）、`package.json`、`docs/mcp.md`、`README.md`、`AGENTS.md`、`CHANGELOG.md`
- 不修改桌面应用版本与安装包。
