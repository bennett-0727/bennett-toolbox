# Design

## Context

当前仓库只有本地打包脚本（`tests/electron.full.mjs` 依赖本机 `release/` 目录），没有 CI 产物。应用由 Vite 生成 `dist/`、esbuild 生成 `dist-electron/main.js`，运行时不依赖 `node_modules`。GitHub 仓库为 `bennett-0727/bennett-toolbox`，默认分支 `master`。项目无签名证书。参见 `proposal.md`。

## Goals / Non-Goals

**Goals:**

- 在 GitHub Actions 中用同一套命令产出 macOS 与 Windows、x64 与 arm64 的安装包。
- 产物文件名、版本、架构可预测，tag 构建自动附加到 Release。
- 构建失败即停止，不发布半成品。

**Non-Goals:**

- 不引入代码签名、公证或自动更新服务。
- 不改变应用运行时行为与现有 e2e 测试。
- 不构建 Linux 产物。

## Decisions

1. **使用 electron-builder 作为打包工具**
   - 原生支持 `dmg`、`zip`、NSIS，多架构与产物命名开箱可用。
   - 备选 `@electron/packager` + 手写 dmg/NSIS 脚本被否决：维护成本高且不易在 CI 复用。

2. **GitHub 托管 runner 矩阵**
   - macOS x64：`macos-15-intel`；macOS arm64：`macos-15`。
   - Windows：`windows-latest`，分别以 `--x64` 与 `--arm64` 打包。
   - 备选单 runner 构建全部架构被否决：跨架构 dmg/NSIS 稳定性较差，矩阵隔离更清晰。

3. **electron-builder 配置放在 `package.json` 的 `build` 字段**
   - `files` 仅包含 `dist/**/*`、`dist-electron/**/*`、`package.json`，保持 asar 最小化。
   - `appId` 使用 `com.bennett.toolbox`，`productName` 使用 `Bennett Toolbox`。
   - 备选独立 `electron-builder.yml` 也可行，但当前配置量小，集中在一个文件更直观。

4. **不签名，构建时禁用自动证书发现**
   - macOS 设置 `CSC_IDENTITY_AUTO_DISCOVERY=false`，避免 CI 因无证书失败。
   - 产物在 Gatekeeper / SmartScreen 下会触发拦截，README 明确说明。

5. **发布与产物归档分离**
   - 各平台 job 只负责构建与 `actions/upload-artifact`。
   - tag 构建增加独立 release job，下载全部 artifacts 后用 `softprops/action-gh-release` 附加到 Release。
   - 备选 electron-builder `--publish` 被否决：矩阵并发发布容易互相覆盖，独立 job 更可控。

6. **构建门槛复用现有脚本**
   - 先执行 `npm ci`、`npm run build`（含 `tsc --noEmit`）、`npm run build:electron`，再做平台打包。
   - Node 版本使用 26（项目验证版本 26.13.0，`engines >=24.8.0`）。

## Risks / Trade-offs

- **Windows arm64 交叉打包兼容性** → 使用最新 electron-builder；若 CI 失败，改用 `windows-11-arm` runner 原生构建。
- **macOS runner 标签变化** → 使用 `macos-15-intel` / `macos-15`；若不可用回退到当前可用的 macOS 版本标签。
- **未签名产物被系统拦截** → README 说明运行方式；后续可增加证书与公证。
- **GitHub Actions Node 26 供应** → `actions/setup-node` 指定 `26.13.0`；若不可用回退 `24`（满足 `engines`）。
- **矩阵产物相互覆盖** → 每个 job 的 artifact 名称包含平台与架构，release job 统一下载。
- **Release 已存在** → `softprops/action-gh-release` 对已存在的 tag Release 采用更新并追加资产；不删除历史资产。

## Migration Plan

1. 合并配置与 workflow 后，先通过 `workflow_dispatch` 手动跑通全部平台。
2. 手动运行成功后再推送下一个 `v*` tag 验证 Release 附件。
3. 回滚：删除 workflow 文件并移除 `electron-builder` 配置即可恢复本地打包；已上传的 artifacts 可在 Actions 中删除。

## Open Questions

无。
