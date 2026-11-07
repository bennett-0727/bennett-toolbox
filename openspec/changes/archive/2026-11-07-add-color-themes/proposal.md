# Proposal

## Why

当前只有深色玻璃与浅色玻璃两套主题，主色固定为蓝色，用户无法按喜好选择更具个性化的外观。内置多套彩色玻璃皮肤可以提升视觉新鲜感，同时沿用现有玻璃配方，不增加维护多套完整样式的负担。

## What Changes

- 在 `glass-dark` / `glass-light` 之外新增三套内置深色彩色皮肤：极光紫 `glass-aurora`、深海青 `glass-ocean`、落日橙 `glass-sunset`。
- 将主题主色、辅助色与背景光晕抽取为可覆盖的 CSS 颜色令牌，彩色皮肤通过覆盖令牌实现整站换色，保留现有玻璃质感与所有表面配方。
- 设置页外观分区展示五个主题选项，追加的三套彩色皮肤排在原有两项之后，保持既有选项顺序不变；每套皮肤提供对应配色的 CSS 预览。
- 主题选择继续写入 `bennett-theme`，重启后恢复；非法或旧值回退到 `glass-dark`。
- 新增主题名称与更新后的外观说明补齐中英文案，英文模式下不出现中文。
- 补充 e2e 覆盖：五套主题可选、彩色皮肤生效与持久化、英文设置页文案、响应式无横向溢出。
- 同步更新 README、AGENTS.md 中关于主题列表与测试数量的描述。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `glass-theme`: 主题从两套深浅玻璃扩展为五套，新增彩色皮肤的切换、持久化、主色令牌与预览要求。
- `settings-page`: 外观分区由两个主题选项扩展为五个，并覆盖彩色皮肤选项的预览与响应式布局。

## Impact

- `src/theme.ts`：Theme 联合类型与持久化校验。
- `src/components/SettingsPage.tsx`：主题选项列表。
- `src/styles/glass.css`：颜色令牌抽取、三套彩色皮肤变量与背景、主题预览样式、主题网格响应式。
- `src/i18n/en.json`：新增主题名称与外观说明文案。
- `tests/electron.full.mjs`：主题切换与设置页国际化、响应式测试。
- `README.md`、`AGENTS.md`：主题与测试数量描述。
