# Design

## Context

现有工具运行在 Electron 渲染进程，通过 React 插件 UI 使用；AI 客户端需要 stdio MCP 进程。试点不重构插件运行时，而是在独立的 Node 进程内实现三条能力，复用本机数据库与 MarkItDown 组件。

## Goals / Non-Goals

**Goals:**

- 一个可被任意 MCP 客户端启动的 stdio 服务，包含三个工具。
- SQLite 严格只读、单语句、行数上限；错误可读。
- MarkItDown 自动发现已安装组件或 `MARKITDOWN_BIN`。
- 客户端集成测试覆盖成功、错误与截断。

**Non-Goals:**

- 不把全部 16 个插件自动转成 MCP tools。
- 不实现 HTTP/SSE MCP、鉴权、多用户。
- 不修改桌面 UI、插件运行时或应用打包产物。
- 不支持 SQLite 写操作。

## Decisions

- 使用官方 `@modelcontextprotocol/sdk` + `zod`，服务入口 `mcp/server.mjs`（ESM），`StdioServerTransport`。
- `json_format`：`JSON.parse` + `JSON.stringify`；`indent` 0..8，默认 2；`minify` 优先。
- `sqlite_query`：`DatabaseSync(path, {readOnly:true})`；只允许 `SELECT/WITH/PRAGMA/EXPLAIN`；拒绝 `PRAGMA ... = ...` 写入形式；`StatementSync.iterate()` 读取至 limit+1 判断截断；BigInt 转字符串，BLOB 返回 `<BLOB n B>`；关闭数据库。
- `markitdown_convert`：按 `MARKITDOWN_BIN` → 各平台 userData 组件目录（`components/markitdown/<version>/markitdown[.exe]`）查找；macOS 设置 `DYLD_LIBRARY_PATH=<dir>/_internal`；`execFile` 120 秒超时、20MB stdout 上限；返回 stdout。
- 服务日志只写 stderr；工具异常包装为 `isError` 文本。
- Node 需要 24+（`node:sqlite`）；README 说明 AI 客户端应使用 Node 26 路径。

## Risks / Trade-offs

- MarkItDown 组件按应用版本存放；服务扫描最新有效目录，升级后仍可复用。
- MCP 客户端使用系统 Node 时可能版本过低；文档要求显式 Node 路径。
- SQLite 查询仍可能很慢；单条只读与行数限制降低风险，但不提供取消。
- 本地文件路径由 AI 提供；服务仅读，不写入文件。

## 验证

- `npm run test:mcp` 启动真实 stdio 服务，通过 MCP Client 调用三个工具。
- SQLite 临时库验证 SELECT、BigInt、截断、写拒绝。
- MarkItDown 用临时假二进制验证成功与缺失提示。
