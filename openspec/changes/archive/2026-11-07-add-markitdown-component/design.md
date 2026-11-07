# Design

## 资产

应用 Release 每个平台/架构上传：
- `markitdown-darwin-arm64`、`markitdown-darwin-x64`
- `markitdown-win32-arm64.exe`、`markitdown-win32-x64.exe`
- 同名 `.sha256` 文本文件

资产名由 `process.platform` 与 `process.arch` 组成。下载地址固定到应用版本 tag：`https://github.com/bennett-0727/bennett-toolbox/releases/download/v<appVersion>/<asset>`，避免 latest 漂移。

## 安装

主进程下载组件到 `userData/components/markitdown/<appVersion>/`：先写临时文件，SHA-256 校验通过后 rename，macOS/Linux chmod 755。状态由文件存在与 `component.json` 判断。下载进度通过 IPC 推送。

## 查找顺序

MarkItDown 查找顺序保持兼容：`MARKITDOWN_BIN` → 应用组件目录 → `resourcesPath`（旧安装包回退）→ vendor/cwd。组件缺失时文档转换返回可读错误。

## UI

设置页插件卡片新增“组件”分组，列出文档转换组件、版本/大小状态、下载/重新下载与进度。文档转 Markdown 在组件缺失时显示下载提示与按钮。

## CI

构建矩阵在准备 MarkItDown 后运行 `scripts/prepare-component-assets.mjs`，把二进制复制为规范化资产名并生成 `.sha256`，随 artifact 上传；Release job 一并附加。`extraResources` 删除后安装包减小约 104MB。

## 安全

只允许应用 Release 的 GitHub 下载地址；校验 SHA-256；组件目录固定在 userData；不使用 shell 执行下载内容。
