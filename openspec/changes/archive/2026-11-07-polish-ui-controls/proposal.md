# Proposal

## Why

UI 审查发现多类共性问题：英文模式下“清清空 / 拷复制 / 存保存”出现重复文字；输入框叠加 `:focus-visible`、边框和阴影形成多重蓝框；禁用主按钮仍呈亮蓝色；1000×700 下侧边栏最后一个工具被挤出、图片转换格式按钮单独换行、设置页第三张卡片被截断。这些都属于摆放和显示不协调。

## What Changes

- 将“清 / 拷 / 存 / 警”等中文单字图标替换为 🗑️ / 📋 / 💾 / ⚠️，消除中英文重复与未翻译字符。
- 移除输入控件重复的 `:focus-visible` 外框，保留单一焦点环；JSON/文档输入区改用标题栏下划线提示焦点。
- 禁用主按钮改为中性玻璃灰，不再显示为可点击的亮蓝色。
- 700px 高度下压缩侧边栏导航与设置卡片，使 11 个工具和设置卡片尽量在首屏完整显示。
- 图片转换控制区在 1180px 以下改为单列，避免 ICO 格式按钮孤立换行。
- 黑色取色预览增加内描边，避免与背景融在一起；PDF ZIP 按钮保持标题栏内。

## Capabilities

### New Capabilities

无。视觉与布局修复，`skip_specs: true`。

### Modified Capabilities

无。

## Impact

- `src/modules/DocumentConverter.tsx`、`WatermarkRemoval.tsx`、`PdfToImages.tsx`、`VideoToGif.tsx`：图标替换。
- `src/styles/glass.css`：焦点、禁用态、短窗口导航/设置、批量控制响应式、取色预览描边。
- 截图与安装包重新生成；不改变业务流程或 IPC。