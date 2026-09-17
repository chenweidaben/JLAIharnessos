# 健澜科技数智医院智能体 - Web 前端

> 医院临床场景 Web 端，面向医生 / 护士 / 管理员 / 药师 / 技师五类角色。

## 技术栈

- **框架**：React 19 + TypeScript 5.6
- **构建**：Vite 6
- **UI**：Ant Design 5 + TailwindCSS 3
- **路由**：react-router-dom 6
- **状态**：Zustand 5
- **请求**：Axios 1（封装超时/重试/401/离线）
- **图表**：ECharts 5
- **测试**：Vitest + Testing Library + Playwright

## 快速启动

### 环境要求

- Node.js >= 18
- 已安装依赖：在 `web/` 目录执行

```bash
npm install
```

### 开发模式

```bash
npm run dev          # 启动 Vite 开发服务器（默认 http://localhost:5173）
npm run dev:open     # 自动打开浏览器
```

### 构建

```bash
npm run build        # tsc 类型检查 + vite build，产物输出 dist/
npm run preview      # 本地预览构建产物
npm run build:analyze # 分析 Bundle 体积
```

### 测试

```bash
npm run test              # 单元测试（Vitest）
npm run test:coverage      # 覆盖率报告
npm run test:e2e           # E2E 测试（Playwright）
```

### 代码质量

```bash
npm run typecheck   # TypeScript 类型检查
npm run lint        # ESLint 检查
npm run lint:fix    # 自动修复
npm run format      # Prettier 格式化
```

## 目录结构

```
web/src/
├── assets/         # 静态资源
├── components/      # 通用组件
│   ├── common/      # PageContainer / ErrorBoundary / EmptyState / OfflineIndicator
│   ├── layout/     # AppLayout / SideMenu / TopHeader
│   ├── outpatient/  # 门诊场景组件
│   ├── ward/        # 住院场景组件
│   ├── emergency/  # 急诊场景组件
│   ├── operation/   # 运营管理组件
│   ├── quality/    # 质控组件
│   ├── system/      # 系统管理组件
│   └── charts/     # ECharts 封装
├── hooks/           # 自定义 Hooks（useOnlineStatus / useAsync / useAlert / useChatStream）
├── mock/            # Mock 数据
├── monitoring/      # 前端监控
├── pages/          # 页面
│   ├── login/       # 登录
│   ├── dashboard/   # 工作台
│   ├── outpatient/  # 门诊
│   ├── ward/        # 住院
│   ├── emergency/  # 急诊
│   ├── operation/   # 运营
│   ├── quality/    # 质控
│   ├── system/      # 系统管理
│   └── patients/   # 患者
├── router/         # 路由与守卫（AuthGuard / RequirePermission / SessionTimeoutWatcher）
├── services/       # API 层
│   ├── request.ts  # Axios 封装（超时/重试/拦截器）
│   ├── websocket.ts # WebSocket 客户端（指数退避重连/心跳）
│   └── api/        # 各业务 API 模块
├── store/          # Zustand 状态（authStore / chatStore / 各业务 store）
├── styles/         # 全局样式与主题
├── types/          # TypeScript 类型定义
└── utils/          # 工具函数（auth / storage / validate / format / performance）
```

## 环境变量

在 `web/` 目录创建 `.env.local`：

```bash
VITE_APP_TITLE=健澜科技数智医院智能体
VITE_API_BASE_URL=/api/v1
VITE_WS_URL=ws://127.0.0.1:5173/ws
VITE_APP_ENV=development
VITE_MOCK_ENABLED=true
VITE_API_TIMEOUT_MS=30000
```

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_API_BASE_URL` | BFF 接口前缀 | `/api/v1` |
| `VITE_WS_URL` | WebSocket 地址 | `ws://127.0.0.1:5173/ws` |
| `VITE_APP_ENV` | 运行环境 | `development` |
| `VITE_MOCK_ENABLED` | 是否启用 Mock | `false` |
| `VITE_API_TIMEOUT_MS` | 请求超时（毫秒） | `30000` |

## 异常边界说明

- **断网**：顶部红色横幅提示，表单内容暂存本地，恢复后自动隐藏。
- **请求超时**：默认 30s，超时提示"请求超时"，可取消。
- **5xx 错误**：仅幂等 GET 指数退避重试（1s/2s/4s，最多 2 次）；POST/PUT 不自动重试避免重复提交。
- **401**：清除 Token 并跳转登录页。
- **403**：无权限提示，页面跳转 `/403`。
- **WebSocket**：断线指数退避重连，30s 心跳保活。
- **错误边界**：React ErrorBoundary 捕获渲染异常，展示降级 UI。

## 常见问题

**Q: 登录后页面白屏？**
A: 检查浏览器控制台是否有 JS 报错；清除 localStorage 后重试；确认后端 BFF 已启动。

**Q: 接口 401 反复跳转登录？**
A: 检查 Token 是否过期；生产环境确认 `JWT_SECRET` 已配置；演示 token 仅非生产环境可用。

**Q: ECharts 图表不显示？**
A: 确认容器有明确高度；检查数据是否为空（EmptyState 兜底）；大屏建议使用 `build:analyze` 优化体积。

**Q: 如何对接真实后端？**
A: 配置 `VITE_API_BASE_URL` 指向 BFF 地址，并在 `web/vite.config.ts` 配置代理。

---

Copyright (c) 2026 杭州健澜科技有限公司
