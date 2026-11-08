# Spec Delta

## ADDED Requirements

### Requirement: 编码与哈希

`encoding_convert` SHALL 支持 Base64、URL 与 Hex 编解码；`hash_text` SHALL 支持 MD5/SHA1/SHA256/SHA512 与 HMAC-SHA256，并返回 hex 或 base64。非法输入 MUST 返回可读错误。

#### Scenario: Base64 往返

- **WHEN** 客户端先编码再解码同一文本
- **THEN** 得到原文

#### Scenario: HMAC

- **WHEN** 客户端提交文本与密钥计算 HMAC-SHA256
- **THEN** 返回确定的摘要

### Requirement: JWT 解码

`jwt_decode` SHALL 解析 JWT header/payload；提供 HMAC 密钥时 MUST 校验 HS256/384/512 签名并在结果中标记是否有效。

#### Scenario: 解码与校验

- **WHEN** 客户端提交合法 JWT 与密钥
- **THEN** 返回 header、payload 与 signatureValid

### Requirement: 正则与文本 Diff

`regex_test` SHALL 执行正则匹配、分组与可选替换，限制匹配数量；`text_diff` SHALL 返回 unified diff 及新增/删除行数。输入超限 MUST 返回错误。

#### Scenario: 正则匹配

- **WHEN** 客户端提交 pattern 与文本
- **THEN** 返回匹配内容、索引与捕获组

#### Scenario: 文本 Diff

- **WHEN** 客户端提交两段文本
- **THEN** 返回 unified diff 与 added/removed 统计

### Requirement: 图片信息与转换

`image_info` SHALL 返回图片格式、宽高、通道与文件大小；`image_convert` SHALL 支持 PNG/JPEG/WebP 转换、质量控制与尺寸缩放，并以 MCP image content 返回结果，不写本地文件。

#### Scenario: 查询图片

- **WHEN** 客户端传入有效图片路径
- **THEN** 返回格式、尺寸与文件大小

#### Scenario: 转换图片

- **WHEN** 客户端指定目标格式
- **THEN** 返回对应 MIME 的 image content 与输出尺寸
