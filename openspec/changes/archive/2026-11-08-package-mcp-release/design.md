# Design

## Context

MCP 服务依赖多个 ESM/CJS 包；sharp 含平台原生二进制，无法打包进单一跨平台脚本。应用版本 2.0.1 不动，MCP 独立版本 0.2.0。

## Decisions

- esbuild 将 `mcp/server.mjs` 打包为 ESM，bundle SDK/zod/cron-parser/luxon/qrcode/diff；`sharp` external，动态导入。
- 产物：
  - `bennett-mcp-<version>.mjs`：standalone；图片工具在无 sharp 时返回错误。
  - `bennett-mcp-<version>.zip`：`server.mjs`（同一 bundle）+ `package.json`（依赖 sharp）+ `README.md`；解压后 `npm install && npm start`。
  - 两个 `.sha256` 文件。
- 构建版本来自 `MCP_VERSION` 环境变量，默认 0.2.0；esbuild define 注入 `process.env.BENNETT_MCP_VERSION`。
- `.github/workflows/mcp-release.yml` 由 `mcp-v*` tag 触发：npm ci、`npm run test:mcp`、`npm run build:mcp`、softprops 发布；`make_latest: false`，避免应用更新检查误判（更新检查本身只接受 `vX.Y.Z`）。
- 不打包 node_modules；ZIP 通过 npm install 获取 sharp 原生依赖。

## Risks

- Standalone 图片工具不可用；文档明确推荐 ZIP 完整安装。
- sharp 安装需要网络与平台预编译包。
- `make_latest: false` 依赖 action 支持；已使用 softprops v2。
