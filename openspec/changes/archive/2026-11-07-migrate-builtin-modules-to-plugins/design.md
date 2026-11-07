# Design

## 应用壳

App 删除内置模块导入/注册/switch，模块来自已安装启用插件并按 manifest order 排序。新增空状态（安装全部/打开插件管理）、安装全部推荐插件、`bennett-active-module` 持久化与旧 ID 映射（json-formatter → bennett.json-formatter 等）。

## 插件仓库

11 个插件复制现有模块源码，仅调整 shared 导入与 PDF worker。插件 repo 提供 shared/i18n（dict + JSX runtime）、electron helpers、FormatItem、MarkItDown client、plugin mount helper。esbuild IIFE 捆绑 React/依赖，alias react/jsx-runtime 到 shared i18n runtime；PDF 插件打包 worker，通过 `api.assets.url()` 设置 workerSrc。应用全局 CSS 继续为插件提供样式。

## 运行时

Bundle payload 增加 baseUrl；API 增加 assets.url（路径约束）。主题切换不 remount，语言切换仍 remount。现有 main IPC 保持，新增 sender 校验；截图相关辅助窗口 sender 允许。

## 测试/CI

应用 CI 增加 build-plugins job（固定 plugin ref），Electron 测试使用本地 registry 安装全部插件；浏览器/smoke 默认测空壳；截图脚本安装插件后截取。插件 repo 发布 plugin-v1.1.0。

## 安全

插件仍为受信代码；不新增沙箱。资产路径限制在插件版本目录内；IPC sender 校验覆盖主页面与已知辅助窗口。
