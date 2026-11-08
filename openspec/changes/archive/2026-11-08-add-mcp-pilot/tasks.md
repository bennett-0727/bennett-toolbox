# Tasks

## 1. MCP 服务

- [x] 1.1 安装 `@modelcontextprotocol/sdk` 与 `zod`，增加 `mcp` 脚本
- [x] 1.2 实现 stdio MCP 服务与 `json_format`、`sqlite_query`、`markitdown_convert`

## 2. 安全与发现

- [x] 2.1 SQLite 只读、单语句、写语句拒绝与行数截断
- [x] 2.2 MarkItDown 二进制发现（环境变量/组件目录）与错误提示

## 3. 测试与文档

- [x] 3.1 新增 MCP Client 集成测试并接入 `test:mcp`
- [x] 3.2 更新 README、AGENTS、CHANGELOG 与客户端配置示例

## 4. 验证与归档

- [x] 4.1 运行 `npm run test:mcp` 与 typecheck
- [x] 4.2 归档 OpenSpec 变更
