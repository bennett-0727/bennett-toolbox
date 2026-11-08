# Proposal

## Why

应用壳、侧栏折叠、时间本地化与四个可选开发者工具已上线，但 README 截图仍停留在旧界面，且没有 SQLite、Markdown/Mermaid、二维码、时间/Cron 的功能展示。

## What Changes

- 更新截图脚本：安装 11 个推荐插件 + 4 个可选工具，生成 SQLite 演示库并新增 16–19 截图。
- 重新生成 01–15 截图，反映当前侧栏、时间格式与工作台界面。
- README 增加“可选开发者工具”表格与 16–19 截图。
- 不修改应用行为。

## Capabilities

无（纯截图与文档更新）。

## Impact

- 修改：`scripts/capture-screenshots.mjs`、`README.md`、`docs/screenshots/*`
