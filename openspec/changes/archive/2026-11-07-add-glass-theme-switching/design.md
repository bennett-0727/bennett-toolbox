# Design

## Context

现有 11 个模块共用一套 minified CSS 类。直接引入 shadcn/Tailwind 需要重写全部标记；采用 shadcn 同款 CSS 变量 + `data-theme`，在 `glass.css` 中集中覆盖表面样式。

## Goals / Non-Goals

**Goals:**

- 深/浅玻璃主题即时切换与持久化。
- 所有主要表面统一玻璃配方。
- 主题切换使用 SVG，适配中英文与窄窗口。

**Non-Goals:**

- 不引入 Tailwind/Radix/shadcn 组件依赖。
- 不改变模块业务逻辑。

## Decisions

1. **CSS 变量 + `html[data-theme]`**
   - 主题令牌集中定义，浅色主题只覆盖 token 与少数硬编码底色。
   - 备选 daisyUI/shadcn CLI 需 Tailwind 与类名迁移，成本高。

2. **玻璃配方**
   - `background: radial highlight + sheen + translucent fill`，`backdrop-filter: blur(36px) saturate(190%)`，白边与 inset 高光。
   - 移除 `.json-formatter-body` 等不透明包裹层，确保环境光能透出。
   - 全屏加入柔和彩色渐变 + 细点纹理，使 blur 有可见内容。

3. **主题切换 UI**
   - 侧边栏底部主题胶囊（月亮/太阳 SVG）；`bennett-theme` 持久化。
   - App 同步设置 `document.documentElement.dataset.theme`。

## Risks / Trade-offs

- backdrop-filter 在低端 GPU 有性能成本 → 仅主要表面使用，CI 测试禁用 GPU。
- 浅色玻璃对比度敏感 → 激活按钮固定白字并加 e2e 断言。
