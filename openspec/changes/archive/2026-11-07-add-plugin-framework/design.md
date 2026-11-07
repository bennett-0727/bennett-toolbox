# Design

## 插件包

ZIP 内包含 `plugin.json`、`main.js`（esbuild IIFE，自带依赖与 React）、可选图标/说明。manifest 使用反向域名 id、语义化版本、`apiVersion: 1`、`minAppVersion`、`activation: on-demand | resident`、双语名称与描述。

## 运行时

主进程读取 `userData/plugins/<id>/<version>/main.js` 并通过 IPC 返回源码；渲染层用 `new Function(code)` 执行 IIFE，插件调用 `window.__BENNETT_REGISTER_PLUGIN__(id, factory)` 注册。宿主在受控容器内调用 `mount(container, api)`，返回 cleanup；语言/主题变化通过 API 订阅。插件 UI 与宿主 React 树隔离，样式必须限定在 `.btp-<id>` 下。

插件 API：locale/theme、`t()`、变更订阅、命名空间 storage、日志、宿主版本。插件异常由 `PluginErrorBoundary` 与 mount try/catch 局部兜底。

## 安装与状态

registry 来自固定 GitHub 仓库的 Release 资产；下载地址必须属于该仓库。安装流程：下载 → 校验大小/SHA-256 → JSZip 安全解压到 staging → 校验 manifest → rename 到版本目录 → 原子写状态 → 清理旧版本与 staging。状态文件记录 version/enabled/activation；渲染层沿用模块顺序 key，禁用/移除后回退默认模块。

## 安全边界

只允许 HTTPS 与固定 host；拒绝绝对路径、反斜杠、`..`、空字节、符号链接和超限包；IPC 校验应用页面 sender。插件在 `nodeIntegration: true` 的渲染进程内运行，属于受信代码，SHA-256 不防恶意插件；真正沙箱化列为后续阶段。

## 插件仓库

独立公开仓库包含示例插件、构建/打包/registry 脚本与 tag 发布 workflow；应用默认读取 `releases/latest/download/registry.json`。首个插件 `bennett.text-stats` 为纯前端文本统计，覆盖双语、主题、挂载/卸载与更新。

## 取舍

- 不自建签名体系，依赖 GitHub HTTPS 与 registry SHA-256；
- 插件自带 React，牺牲少量体积换取版本隔离；
- Phase 1 不迁移现有内置模块，不处理 MarkItDown 二进制；
- 插件崩溃只能局部兜底，异步异常仍可能影响页面。
