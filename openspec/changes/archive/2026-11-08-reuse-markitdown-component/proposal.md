# Proposal

## Why

组件按应用版本存放在 `components/markitdown/<appVersion>`。应用升级后（如 2.0.0 → 2.0.1）会忽略已安装的旧组件，界面显示未安装，用户被迫重新下载约 118MB，而组件本身是独立可执行文件。

## What Changes

- 组件查找支持跨版本回退：当前版本目录不存在时，使用最近安装且带有效 `component.json` 的旧组件。
- 状态显示实际组件版本；跨版本复用时显示旧版本号。
- 成功安装新版本组件后清理其他版本目录，避免磁盘累积。
- 新增跨版本复用回归测试。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `markitdown-component`: 增加跨应用版本复用与旧组件清理要求。

## Impact

- 修改：`electron/components.ts`
- 测试：`tests/plugins.electron.mjs`
- 不改变组件资产格式、下载地址与文档转换调用方式。
