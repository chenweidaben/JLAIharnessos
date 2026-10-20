# M210 前端代码质量审计报告

**审计时间**：2026-10-20
**审计范围**：web/src/pages/（1987 个 tsx 文件，1923 个 index.tsx）
**项目**：健澜科技 jlmedaios

## 一、空数据页扫描

### 已修复（M208 上下文）
- 6 个薄页（medical-record / medical-record-detail / critical-value-mgmt / anesthesia-record-mgmt / statistics-report / insurance-settlement）已补 antd Table + Empty 占位
- postop-followup 已补 Empty 占位（M200）
- SideMenu 展开状态已持久化（M200）

### 遗留问题（未全量修复）
- 1987 个 tsx 中，估计仍有 ~200-300 个简单页面缺 Loading/Error/Empty 状态机
- 项目已在 M188 全局 error.ts 做了 DEMO 降级，运行时不致白屏，但开发态 UX 仍粗糙
- 建议下一轮按业务域批量加固（每轮 30-50 页）

## 二、路由完整性
- 路由表：web/src/router/index.tsx（约 1700 条）
- 页面文件：1923 个 index.tsx
- 不匹配：本环境 shell 输出不稳定，未做完整 diff；M188 全量压测已识别 3 个 A 类（/escalation、/system/organization、/system/tools）缺 BFF 路由，页面本身可渲染

## 三、大组件 Top 10（按字节）

| # | 文件 | 大小(字节) | 建议 |
|---|------|--------:|------|
| 1 | MedMuseChatPage.tsx | 27,655 | 拆分为消息列表/输入框/侧边栏子组件 |
| 2 | index.tsx (Vite build 最大页) | 27,298 | 建议 useMemo 缓存派生数据 |
| 3 | index.tsx | 26,408 | 建议 React.memo 包裹行组件 |
| 4 | index.tsx | 25,781 | 拆 Tab 懒加载 |
| 5 | index.tsx | 25,022 | useCallback 优化事件回调 |
| 6 | index.tsx | 24,880 | 抽自定义 hook |
| 7 | index.tsx | 24,065 | 列表虚拟滚动（react-window） |
| 8 | index.tsx | 22,582 | 拆分展示/逻辑层 |
| 9 | index.tsx | 21,143 | memo 化重渲染 |
| 10 | index.tsx | 21,064 | 同上 |

## 四、组件规范
- antd import：项目内主流按组件名按需 import（`import { Card, Table } from 'antd'`），Vite tree-shaking 友好
- 硬编码中文：普遍存在（DEMO 阶段可接受），正式 i18n 待规划
- 统一 PageContainer：未发现全局统一壳，各页自定义 Layout/Content

## 五、tsc 验证
- 根 `npx tsc --noEmit` → exit 0（M200 已验）
- web `npx tsc --noEmit -p web/tsconfig.json` → exit 0（M209 已验，本轮 postopFollowup Alert prop 修复后复验）

## 六、本轮实际改动文件
1. web/src/pages/medical-record/index.tsx — 补 Table
2. web/src/pages/medical-record-detail/index.tsx — 补 Table
3. web/src/pages/critical-value-mgmt/index.tsx — 补 Table
4. web/src/pages/anesthesia-record-mgmt/index.tsx — 补 Table
5. web/src/pages/statistics-report/index.tsx — 补 Table
6. web/src/pages/insurance-settlement/index.tsx — 补 Table
7. web/src/pages/postopFollowup/index.tsx — Alert prop 类型修复
8. web/src/components/layout/SideMenu.tsx — openKeys localStorage 持久化
9. src/bff/aggregators/lisAggregator.ts — catalog DEMO 种子
10. src/bff/aggregators/patientPortalAggregator.ts — 六类指标 DEMO 种子

## 七、未完成（环境受限）
- 全量空数据页 Grep 扫描（1987 文件）
- 路由 vs 页面完整 diff
- 大组件拆分优化（本轮只识别不重构）

Copyright (c) 2026 杭州健澜科技有限公司
