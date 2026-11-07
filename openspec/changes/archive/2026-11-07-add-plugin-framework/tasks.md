# Tasks

## 1. 主进程

- [x] 1.1 新增 manifest/registry/semver 校验与测试
- [x] 1.2 新增插件状态读写与原子更新
- [x] 1.3 新增下载、SHA-256、安全解压、staging/rename 安装器
- [x] 1.4 注册插件 IPC 与 sender 校验
- [x] 1.5 复用应用版本比较逻辑

## 2. 渲染层

- [x] 2.1 新增插件类型、IPC client、运行时与错误边界
- [x] 2.2 新增 PluginHost 挂载/卸载/常驻激活
- [x] 2.3 App 合并插件模块与导航顺序
- [x] 2.4 设置页插件管理卡片与操作状态
- [x] 2.5 补齐中英文文案、样式与浅色/窄窗口适配

## 3. 独立插件仓库

- [x] 3.1 初始化 `bennett-toolbox-plugins` 仓库结构
- [x] 3.2 实现 text-stats 示例插件
- [x] 3.3 实现构建、打包、registry 生成与校验脚本
- [x] 3.4 配置 tag 发布 workflow

## 4. 验证与文档

- [x] 4.1 单元测试：校验、版本、校验和、路径穿越、状态
- [x] 4.2 Electron e2e：安装/启用/停用/更新/卸载与异常包拒绝
- [x] 4.3 更新 smoke/browser 测试的动态导航数量
- [x] 4.4 更新 README、CHANGELOG 与插件管理截图
- [x] 4.5 运行 typecheck/build/e2e/打包并记录体积
