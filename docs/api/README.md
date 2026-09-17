# 健澜科技数智医院智能体 - 前后端 API 对接与 Mock 数据层

> 版权所有 (c) 2026 杭州健澜科技有限公司

本目录/工程负责**前端 API 服务层、Mock 数据层、WebSocket 封装**，以及后端 **BFF（Backend for Frontend）** 聚合层。前端在 Mock 模式下可脱离后端独立运行并完整演示全部功能。

## 1. 目录结构

```
web/src/
├── types/api/            # ① 完整 TypeScript 接口类型规范
│   ├── common.ts         #   ApiResponse / PageResult / ErrorCode / paginate
│   ├── auth.ts           #   登录/用户/角色/权限/菜单
│   ├── patient.ts        #   患者/就诊/医嘱/处方/检验/检查/病历/费用
│   ├── chat.ts           #   会话/消息/工具调用/流式事件
│   ├── knowledge.ts      #   知识库 + CDS + 药品
│   ├── quality.ts        #   质控
│   ├── operation.ts       #   运营/仪表盘/DRG-DIP/质量指标
│   └── system.ts         #   系统管理/集成/日志/监控
├── services/
│   ├── http.ts           # ⑥ fetch 封装：Token/重试/取消/缓存/队列/上传下载
│   ├── api/              # ② API 服务层（11 个模块）
│   └── websocket/        # ⑤ WebSocketClient + useWebSocket/useChatStream/useAlert
└── mock/                 # ④ Mock 数据层
    ├── server.ts         #   路由分发/延迟/错误注入
    ├── data/             #   10 个数据文件
    └── handlers/         #   10 个模块处理器

src/bff/                  # ⑤ BFF 聚合层（Bun 原生，零依赖）
├── server.ts             #   Bun.serve + WS /ws/chat
├── routes/               #   auth/patient/chat/medical/dashboard/quality/operation/system
├── aggregators/          #   patient360 / dashboard / chat 聚合
├── adapters/             #   脱敏适配器
└── middleware/           #   认证/权限/日志/错误/限流

docs/api/openapi.yaml     # ⑦ OpenAPI 3.0
examples/                 # ⑧ 使用示例
```

## 2. 快速开始

```bash
# 前端（Mock 模式默认开启，无需后端）
cd web && npm install && npm run dev

# 后端 BFF（可选，接入真实数据）
bun run bff
```

应用入口中启用 Mock：

```ts
import { setupMock } from '@/mock';
setupMock();
```

## 3. 统一响应规范

```ts
{ "code": 0, "message": "ok", "data": T, "timestamp": "2026-...", "traceId": "..." }
```

- `code === 0` 成功，`data` 即业务数据。
- 非 0 时抛出 `ApiError`，由 http 拦截器统一提示。

## 4. 错误码

| code   | 含义               |
| ------ | ------------------ |
| 0      | 成功               |
| 40000  | 请求参数错误       |
| 40100  | 未登录             |
| 40101  | 令牌过期（自动刷新）|
| 40300  | 无权限             |
| 40400  | 资源不存在         |
| 42900  | 限流               |
| 50000  | 服务器内部错误     |
| 50300  | 服务不可用         |
| 44001  | CDS 阻断           |

## 5. WebSocket 事件

连接：`wss://host/ws/chat?token=<accessToken>`

| 通道                 | 说明                 |
| -------------------- | -------------------- |
| chat.stream          | 对话流式增量         |
| chat.message         | 新消息               |
| chat.tool_call       | 工具调用事件         |
| alert.critical_value | 危急值告警           |
| alert.drug_interaction | 药物相互作用告警   |
| alert.allergy        | 过敏告警             |
| notification         | 系统通知             |
| system.status        | 系统状态/心跳        |

## 6. 接口版本管理

所有业务接口统一前缀 `/api/v1/`。前端 `http` 自动补全版本与 baseURL，业务代码只需写 `/patients`。
