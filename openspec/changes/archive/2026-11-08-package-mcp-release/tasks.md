# Tasks

## 1. 打包

- [x] 1.1 新增 `scripts/build-mcp.mjs`，生成 standalone、ZIP 与 SHA-256
- [x] 1.2 更新 MCP 版本 0.2.0 与 `build:mcp` 脚本、gitignore

## 2. 发布流水线

- [x] 2.1 新增 `mcp-v*` 触发的 `.github/workflows/mcp-release.yml`
- [x] 2.2 发布时设置 `make_latest: false` 并上传全部产物

## 3. 文档与验证

- [x] 3.1 更新 README、docs/mcp.md、AGENTS、CHANGELOG 下载/安装说明
- [x] 3.2 本地构建并验证 standalone/ZIP 产物与测试
- [x] 3.3 归档 OpenSpec 变更
