# Design

## Context

`componentDir()` 与 `componentBinary()` 只检查当前 `app.getVersion()` 目录；`getMarkitdownStatus()` 的 `installed` 与 UI 版本号都基于当前版本。组件是独立 PyInstaller 二进制，不依赖应用运行时，因此可在应用版本间复用。

## Goals / Non-Goals

**Goals:**

- 当前版本组件缺失时自动回退到最近安装的旧组件。
- 状态返回实际组件版本，跨版本复用时显示真实版本。
- 成功安装新组件后清理旧版本目录。
- 用 e2e 覆盖“仅存在旧版本组件”的场景。

**Non-Goals:**

- 不实现组件自动更新或后台下载。
- 不改变组件下载 URL、SHA-256 校验或 ZIP 结构。
- 不处理未来组件与应用的兼容性声明；当前组件无版本耦合。

## Decisions

- 新增 `resolveInstalledComponent()`：先检查当前版本目录；缺失时扫描 `components/markitdown/*`，只接受同时存在可执行文件与 `component.json`、且 `component.json.version` 与目录名一致的目录，按 mtime 倒序取第一个。
- `markitdownComponentPath()` 与状态 `installed` 使用该解析结果；`status.version` 返回组件元数据版本，缺失时回退应用版本。
- 成功替换当前版本目录后调用 `cleanupOtherComponents(currentVersion)`，删除其他版本目录；失败仅忽略，不影响本次安装。
- `MARKITDOWN_BIN` 环境变量仍优先于组件目录，保持现有行为。
- 测试在临时 userData 中只创建旧版本组件目录，重载工作台后断言状态已安装且版本为旧版本。

## Risks / Trade-offs

- 复用旧组件意味着新版本应用可能使用旧版转换器；组件无应用版本耦合时可接受，用户仍可“重新下载”覆盖。
- 清理旧目录后若新组件异常，需重新下载；新组件已在替换前完成校验与可执行文件检查。
- 目录扫描每次状态查询执行一次，目录数量很少，开销可忽略。
