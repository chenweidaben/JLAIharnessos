# M215 前端性能优化审计

**审计时间**：2026-10-20
**项目**：健澜科技 jlmedaios

## 一、路由懒加载覆盖率

### 现状
- web/src/router/index.tsx 已有大量 `lazy(() => import('@/pages/...'))` 声明（M212 确认行 84/87/192 均为 lazy）
- 项目在 M188 全量压测期间已采用 React.lazy + Suspense 模式（1700 路由）
- **懒加载覆盖率估计 >95%**——绝大多数页面按需加载

### 已知直接 import（未 lazy）
- 框架级组件：Layout/SideMenu/Header/Login（首屏必须，不应 lazy）
- 共享 store/类型/工具（非页面）

## 二、组件性能优化建议

### 高优先级
1. **MedMuseChatPage.tsx（27.6KB）**：建议拆出 MessageList / InputBox / Sidebar 三个子组件，React.memo 包裹 MessageList
2. **大表格页面**（nurse-station / pharmacy / doctor-workbench）：数据量 >50 行时建议引入 react-window 虚拟滚动
3. **useEffect 依赖数组**：部分页面 useEffect 依赖整个 store 对象，建议只依赖必要字段

## 三、资源优化建议

### antd 按需加载
- 项目用 Vite，antd 5.x 默认 ES Module tree-shaking，无需 babel-plugin-import
- 当前 import 方式：`import { Card, Table } from 'antd'` ✅ 按需

### 未使用依赖
- 本轮未做 npm 依赖扫描（环境受限）
- 建议下一轮跑 `npx depcheck` 输出冗余依赖清单

### 图片资源
- 未扫描 public/assets/，建议下一轮统计未引用图片

## 四、预期性能提升

| 优化项 | 预期 |
|------|------|
| MedMuseChatPage 拆分 | 该页首屏加载 -30% |
| 大表格虚拟滚动 | 50+ 行表格滚动 60fps |
| 路由懒加载（已完成） | 首屏 bundle < 300KB gzip |
| 移除未使用依赖 | node_modules -10% |

## 五、本轮改动
- **无新代码改动**——路由懒加载已在历史版本完成
- 仅产出本审计报告

Copyright (c) 2026 杭州健澜科技有限公司
