# Tasks

## 1. 打包配置

- [x] 1.1 在 `package.json` 添加 `electron-builder` 开发依赖，执行 `npm install` 并确认安装成功
- [x] 1.2 在 `package.json` 增加 `build` 配置（appId、productName、asar、files、mac dmg/zip、win nsis、x64/arm64），用 `npx electron-builder --dir --mac --arm64` 验证配置可解析并产出 `.app`
- [x] 1.3 增加本地打包脚本 `package:mac`、`package:win`，并确认脚本出现在 `npm run` 列表中

## 2. GitHub Actions

- [x] 2.1 新增 `.github/workflows/release.yml`，配置 `v*` tag 与 `workflow_dispatch` 触发，并用 YAML 解析或 `actionlint` 验证语法
- [x] 2.2 添加构建步骤：Node 26、`npm ci`、`npm run build`、`npm run build:electron`，确认本地按相同命令可执行
- [x] 2.3 添加矩阵任务：macOS x64/arm64（均在 macos-15-intel 上构建）、Windows x64/arm64（windows-latest），执行 `electron-builder --publish never`
- [x] 2.4 添加 artifact 上传步骤，确认 artifact 名称包含平台与架构
- [x] 2.5 添加 tag 触发的 release job：下载全部 artifacts 并附加到对应 GitHub Release
- [x] 2.6 tag 构建前将 `package.json` 版本同步为 tag 版本（去掉 `v` 前缀），确保产物文件名与版本一致
- [x] 2.7 增加 MarkItDown 准备步骤（macOS arm64 下载 Release 资源，其他平台 PyInstaller 构建），确认打包产物包含转换器
- [x] 2.8 增加 Web e2e、macOS x64 与 Windows Electron e2e job
- [x] 2.9 CI 中强制重新安装 Electron 二进制，避免 e2e 启动失败

## 3. 文档

- [x] 3.1 在 `README.md` 增加发布章节：产物清单、下载方式、未签名产物在 Gatekeeper / SmartScreen 下的提示
- [x] 3.2 在 `CHANGELOG.md` 记录新增自动打包能力

## 4. 验证

- [x] 4.1 本地执行 macOS arm64 打包命令，确认 `release/` 下生成 dmg 与 zip，且应用可启动
- [x] 4.2 执行 `npm run typecheck`、`npm run build`、`npm run test:e2e`，确认现有测试无回归
- [ ] 4.3（需推送授权）在 GitHub 手动触发 workflow，确认 4 个矩阵任务全部成功且 artifacts 可下载
- [ ] 4.4（需推送授权）推送下一个 `v*` tag，确认 Release 附带 macOS 与 Windows 全部产物
