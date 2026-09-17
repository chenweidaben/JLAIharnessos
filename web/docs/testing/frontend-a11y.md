# 健澜科技数智医院智能体 - 无障碍访问（a11y）指南

> Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
> 遵循标准：WCAG 2.1 AA

## 1. 无障碍检查清单

### 语义化 HTML
- [x] 页面结构使用 `header / nav / main / section / article / aside / footer`
- [x] 标题层级正确（h1 → h2 → h3，不跳级）
- [x] 列表使用 `ul / ol / li`，表格使用 `th / thead / tbody`

### ARIA 标签
- [x] 图标按钮必须有 `aria-label`
- [x] 表单控件必须有 `<label>` 关联
- [x] 动态内容变化通过 `aria-live` 区域播报（`LiveRegion` 组件）
- [x] 弹窗使用 `role="dialog"` + `aria-modal="true"`

### 键盘导航
- [x] 所有可交互元素可通过 Tab 聚焦
- [x] 弹窗 / 模态中使用焦点陷阱（`useFocusTrap`）
- [x] Esc 关闭弹窗（`useEscapeKey`）
- [x] 方向键导航 Tab 切换

### 颜色对比度
- [x] 正文文本 ≥ 4.5:1
- [x] 大文本（≥18pt）≥ 3:1
- [x] UI 组件边框 ≥ 3:1
- [x] 医疗状态色（危急红 #F5222D / 异常橙 #FA8C16 / 正常绿 #52C41A）已通过对比度校验

### 表单无障碍
- [x] 每个输入框关联 `<label>`
- [x] 必填项使用 `aria-required="true"`
- [x] 错误提示通过 `aria-describedby` 关联
- [x] 输入提示通过 `aria-describedby` 关联

### 动画无障碍
- [x] 尊重 `prefers-reduced-motion`
- [x] 闪烁动画（危急值 ping）可暂停

### 响应式无障碍
- [x] 缩放至 200% 无横向滚动
- [x] 触控目标 ≥ 44×44px

## 2. 无障碍组件

`src/utils/a11y.tsx` 提供封装：

| 组件 / Hook | 用途 |
|-------------|------|
| `LiveRegion` | 动态内容播报区域（aria-live） |
| `useFocusTrap` | 弹窗焦点陷阱 |
| `useEscapeKey` | Esc 关闭弹窗 |
| `A11yButton` | 带 aria-label 的按钮 |

## 3. 无障碍测试

### 自动化测试
- 组件级：关键组件使用 `jest-axe` 断言无违规
- 页面级：核心页面 E2E 中集成 axe-core 扫描
- 键盘导航：E2E 中验证 Tab 顺序和 Enter/Esc 行为

### 手动测试
- NVDA（Windows）/ VoiceOver（macOS）屏幕阅读器验证
- 纯键盘操作完整业务流程
- 高对比度模式验证
