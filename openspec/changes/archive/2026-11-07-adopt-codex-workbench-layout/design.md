# Design

主内容分为 `.canvas-topbar`（当前工具/工作区/返回工作台）、`.canvas-content`（可滚动模块或工作台）、`.canvas-statusbar`（工具数、按需加载、版本）。设置使用 fixed 右侧 `.settings-drawer` 覆盖，关闭后恢复当前工具/工作台。

默认 active module 为空，App 渲染 Workbench；只有点击侧栏/插件卡“打开”才加载 PluginHost。退出/卸载当前插件回到工作台。插件管理从设置移到工作台，设置仅保留外观、语言、版本更新。

## 取舍

设置抽屉覆盖侧栏与主画布，简单可靠；工作台管理沿用插件列表；默认不自动打开工具，符合“默认不加载插件”。
