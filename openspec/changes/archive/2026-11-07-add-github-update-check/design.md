# Design

## Context

应用无自动更新框架，版本发布在 GitHub Releases。需求只要求版本检测与跳转，不引入下载器或签名更新流程。

## Goals / Non-Goals

**Goals:**

- 启动静默检测、手动复查、更新提示与 Release 跳转。
- 兼容现有中英双语和 1000×700 布局。
- 测试不依赖真实 GitHub 网络。

**Non-Goals:**

- 不自动下载、不自动安装、不做增量更新。
- 不处理预发布版本或多渠道。

## Decisions

1. **主进程检测**
   - 使用 GitHub `releases?per_page=20`，过滤 draft/prerelease 与非 `vX.Y.Z` tag（避免 `markitdown-binaries` 被当成版本）。
   - 使用 `app.getVersion()` 与简单三段版本比较；10 秒超时。
   - 备选渲染进程直接 fetch 被否决：主进程可统一超时、避免 CORS，并方便测试 stub。

2. **侧边栏版本按钮 + 顶部提示条**
   - 版本号从静态文本改为按钮；启动自动检查，手动点击复查。
   - 新版本显示提示条和下载按钮；错误/最新状态可关闭。

3. **外部链接白名单**
   - `open-external` 仅允许 `https://github.com/bennett-0727/bennett-toolbox` 前缀。

## Risks / Trade-offs

- GitHub API 匿名限流 60 次/小时 → 启动只检查一次，手动按需；失败静默。
- 仅检测，不自动更新 → 用户需手动下载安装；符合当前需求。
