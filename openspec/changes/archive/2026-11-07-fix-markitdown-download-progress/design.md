# Design

## Context

`downloadMarkitdownComponent` 先下载 `.sha256`，再用 `fetch` + `arrayBuffer()` 一次性获取约 118MB 资产，只在 5%、20%、80%、100% 四个节点广播。`fetchChecked` 总超时 120 秒；下载成功后先删除旧组件目录，再解压，失败会丢失可用组件。

## Goals / Non-Goals

**Goals:**

- 按实际字节数报告下载进度，118MB 资产全程可见。
- 超时延长到 10 分钟，超时错误可读。
- 校验或解压失败时旧组件保持可用。
- UI 区分下载与安装阶段。

**Non-Goals:**

- 不实现断点续传、后台下载或镜像加速。
- 不改变组件 ZIP 结构、SHA-256 校验或转换调用方式。

## Decisions

- `fetchBuffer` 使用 `response.body.getReader()` 流式读取，按 `content-length` 计算百分比，整数百分比变化时才回调；无 content-length 时只发结束信号。
- 资产下载超时 10 分钟，校验文件保持 120 秒；AbortError 映射为“下载超时，请检查网络后重试”。
- 进度映射：校验完成 20%，下载 20%→80%，解压 85%，预热 95%，完成 100%。
- 解压到 `<componentDir>.staging-<pid>-<time>`，确认可执行文件存在并写入 `component.json` 后再删除旧目录并 rename，失败只清理 staging。
- `MarkitdownComponentRow` 根据百分比显示“下载中 / 安装中 / 重新下载”，沿用现有中英文词典。

## Risks / Trade-offs

- 无 content-length 的响应无法显示精确百分比；GitHub Release 资产通常带长度。
- 10 分钟超时下，网络完全无响应时用户需等待较久；可后续增加取消按钮。
- staging 替换仍有一个毫秒级窗口没有正式目录；但旧组件在验证通过前不会被删除。
