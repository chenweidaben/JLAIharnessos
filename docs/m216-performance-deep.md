# M216 MedMuseChatPage 拆分 + 大表格虚拟滚动 + npm 依赖审计

**审计时间**：2026-10-20

## 一、MedMuseChatPage 拆分决策

### 现状
- 文件：web/src/pages/agent/MedMuseChatPage.tsx（765 行，27.6KB）
- 已有独立子组件：`ToolCallCard`（行 150-233）
- 工具函数已抽离：confidenceColor/Text, sortSessionsByRecent, summarizeToolContent, prettyJson, riskColor/Text

### 决策：本轮**不拆分**
- 原因：聊天业务逻辑耦合高（消息/会话/审批/工具调用混在 state 中），拆分需浏览器回归验证，当前 computer_use_tool 通道不可用
- 建议下一轮专门做：先抽 MessageList（纯渲染）、ChatInput（受控组件）、ChatSidebar（会话列表），用 React.memo 包裹

## 二、大表格虚拟滚动

### 现状
- nurse-station / pharmacy / doctor-workbench 数据量在 DEMO 下为 5-8 行，远未达 50 行阈值
- 不需要引入 react-window（增加 bundle 体积）
- antd Table 5.x 已内置 virtual 属性，待真实数据 >50 行时启用

## 三、npm 依赖清单（37 个顶层）

### 可能冗余（建议下一轮 depcheck 确认）
- `ink`（React 命令行渲染）：如未做 CLI 工具可移除
- `react-reconciler`：如未做自定义渲染器可移除
- `ioredis-mock`：仅测试用，可移到 devDependencies
- `execa`：如未做子进程管理可移除
- `chalk`：Node 18+ 原生 ANSI 支持，可考虑移除
- `commander`：如未做 CLI 可移除

### 核心依赖（保留）
- react 19.2.4 / react-dom
- antd（web/package.json）
- axios / postgres / ws / zod / lodash-es / lru-cache

## 四、本轮改动
- **无新代码改动**——拆分与虚拟滚动均需浏览器回归，当前环境不允许
- 仅产出本审计报告

Copyright (c) 2026 杭州健澜科技有限公司
