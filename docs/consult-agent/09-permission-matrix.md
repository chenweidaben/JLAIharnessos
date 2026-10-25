# consult-agent M86 权限矩阵（三权限码 × 12 端点）

> Copyright (c) 2026 杭州健澜科技有限公司
>
> 所属产品：**健澜AI原生医院操作系统OS**。
> 本文对齐 [03-contract.md](./03-contract.md) §3 端点契约与 [README.md](./README.md) §6 权限码一览；权限码定义、角色映射、12 端点逐行对照、前端二次判权口径如下。所有行号均指向仓库当前基线源码，可逐行核对。

## 1. 权限码定义

权限码在 `src/bff/permissions.ts` 末尾 `CONSULT_AGENT_PERMISSIONS` 常量段集中登记，不改既有其他业务段。

| 权限码常量 | 权限码字面值 | 用途 | 源码位置 |
|---|---|---|---|
| `CONSULT_AGENT_PERMISSIONS.READ` | `consult-agent:read` | 查看会话列表、历史消息、草稿、画像、规则快照、事件回放 | `src/bff/permissions.ts` 207–208 |
| `CONSULT_AGENT_PERMISSIONS.WRITE` | `consult-agent:write` | 创建会话、发送消息、语音转写、流式问诊、退出会话 | `src/bff/permissions.ts` 207、209 |
| `CONSULT_AGENT_PERMISSIONS.AUDIT` | `consult-agent:audit` | 查看会话审计轨迹（仅脱敏摘要，不回显原始入参） | `src/bff/permissions.ts` 207、210 |

- 联合类型 `ConsultAgentPermissionCode`：`src/bff/permissions.ts` 213–215。
- 全码遍历数组 `ALL_CONSULT_AGENT_PERMISSION_CODES`（供种子 / 自检遍历）：`src/bff/permissions.ts` 217–218。
- 注释口径（三码用途与医疗安全说明）：`src/bff/permissions.ts` 198–206。

## 2. 登录角色与权限码映射

BFF 只校验权限码、不直接判断业务角色名；角色 → 权限码由 JWT `permissions` 数组在登录签发侧决定。映射口径与 [README.md](./README.md) §6 保持一致。

| 登录角色 | `consult-agent:read` | `consult-agent:write` | `consult-agent:audit` | 说明 |
|---|---|---|---|---|
| `admin` | ✓ | ✓ | ✓ | 三码全持；中间件内 `admin` 直通（见下文 2.1） |
| `doctor` | ✓ | ✓ | – | 可查看与会诊，不可查看审计轨迹 |
| `nurse` | ✓ | – | – | 仅查看，不可发起写操作 |

### 2.1 服务端校验口径

- `requirePermissionCode(c, code)`：`src/bff/middleware/auth.ts` 314–326。
  - 316 行：`c.user` 不存在 → 401「未登录或登录已过期」。
  - 318 行：`c.user.roles` 含 `admin` → 直通放行。
  - 319 行：`c.user.permissions` 显式包含该权限码 → 放行。
  - 321 行：分组码通配（仅 `:read` 的既有扩展口径，复用全局中间件）。
  - 322–324 行：其余一律 403「权限不足：需要 {code}」。
- 每个 BFF handler 首行调用 `requirePermissionCode`，未通过即直接返回 401 / 403，不进入编排与仓储。
- 审计码 `consult-agent:audit` 仅 `admin` 持有，`doctor` / `nurse` 不分配该码；角色与码的签发逻辑归身份认证分片，不在 consult 范围内修改。

### 2.2 前端判权口径

- `hasPermission(code)`：`web/src/store/authStore.ts` 338–341；`permissions` 含 `*` 通配或显式含该码即放行。
- 角色判断 `hasRole`：`web/src/store/authStore.ts` 343–346（本页面不使用角色判断，仅用权限码）。
- 页面派生：`web/src/pages/consult-agent/ConsultAgentChatPage.tsx` 322（取 `hasPermission`）、323（`canWrite`）、324（`canAudit`）、325（`canRead`）。

## 3. 12 端点权限矩阵

路径前缀为 `/api/v1/consult-agent`；前端服务层 baseURL 已含 `/api/v1`，故服务层使用相对路径 `/consult-agent/...`。下表共 12 行，与 `src/bff/routes/consultAgentRoutes.ts` 路由表、`docs/api/consult-agent-openapi.yaml` 路径段、`web/src/services/api/consultAgent.ts` 函数一一对应。

| 序号 | HTTP 方法 | 路径（契约相对路径） | BFF 处理函数 / 源码区间 | 所需权限码 | 是否幂等 | 是否落审计 | 是否 SSE | 前端 service 函数（行号区间） | 页面入口位置（行号区间） | 备注 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | POST | `/threads` | `createThread`，`src/bff/routes/consultAgentRoutes.ts` 173–231（175 方法、176 路径、179 WRITE、183–185 入参 schema、209 无初始消息响应、220–226 带初始消息响应、227–228 异常映射） | `consult-agent:write` | 是 | 是（全局 `auditOperation`） | 否 | `createThread`，`web/src/services/api/consultAgent.ts` 317–318 | `handleCreate` 430–442；「新建会话」按钮 802–811；会话列表新建小按钮 899–907 | 回调内无二次判权，由 BFF WRITE 权威拦截；请求体 `threadCreateSchema`（`types.ts` 194–197） |
| 2 | GET | `/threads` | 会话列表 handler，`src/bff/routes/consultAgentRoutes.ts` 233–244（235 方法、236 路径、239 READ、241 `repo.listThreads`、242 响应） | `consult-agent:read` | 否 | 否 | 否 | `listThreads`，`web/src/services/api/consultAgent.ts` 322–325 | `loadThreads` 355–372；列表项点击选中 924 | 仅返回当前登录用户名下线程（241 行 `c.user?.id`） |
| 3 | POST | `/threads/:threadId/messages` | `sendMessage`（非流式快照），`src/bff/routes/consultAgentRoutes.ts` 246–288（248 方法、249 路径、252 WRITE、256–261 schema、267–271 编排调用、272–283 响应、284–285 异常映射） | `consult-agent:write` | 是 | 是（全局 `auditOperation`） | 否 | `sendMessage`，`web/src/services/api/consultAgent.ts` 328–330 | 流式失败回退 `sendMessage`，`ConsultAgentChatPage.tsx` 594；`handleSend` 445–623 | 返回 `{ thread, message, draft?, events? }`；终态会话由编排器抛 `THREAD_CLOSED` → 409 |
| 4 | GET | `/threads/:threadId/messages` | 历史消息 handler，`src/bff/routes/consultAgentRoutes.ts` 290–305（292 方法、293 路径、296 READ、299 `findOwnedThread`、302 `repo.listMessages`、303 响应） | `consult-agent:read` | 否 | 否 | 否 | `listMessages`，`web/src/services/api/consultAgent.ts` 333–338 | 进入会话刷新 399；发送后刷新 614–616 | 归属隔离由 `findOwnedThread` 强制；消息按 `createdAt` 升序 |
| 5 | POST | `/threads/:threadId/transcribe` | `transcribe`（DEMO 文本归一化），`src/bff/routes/consultAgentRoutes.ts` 307–332（309 方法、310 路径、313 WRITE、316 `findOwnedThread`、320–325 schema、329–330 归一化响应） | `consult-agent:write` | 是 | 是（全局 `auditOperation`） | 否 | `transcribe`，`web/src/services/api/consultAgent.ts` 341–346 | `handleTranscribe` 642–661（643 行首行 `if (!canWrite) return;`，650 行调用服务函数）；语音按钮 1123–1133，被 `canWrite`（1123）条件渲染包裹 | `transcript` / `audioText` 至少其一非空（`transcribeSchema`，`types.ts` 206–218）；响应 `{ text }` |
| 6 | GET | `/threads/:threadId/audit` | 审计轨迹 handler，`src/bff/routes/consultAgentRoutes.ts` 334–349（336 方法、337 路径、340 AUDIT、343 `findOwnedThread`、346 `repo.listAudit`、347 响应） | `consult-agent:audit` | 否 | 否 | 否 | `listAudit`，`web/src/services/api/consultAgent.ts` 349–354 | `handleOpenAudit` 664–679（665 行 `if (!canAudit) return;`，673 行调用）；「审计轨迹」按钮 861–871，被 `canAudit`（861）包裹；审计抽屉 1212–1288 | 条目仅含脱敏摘要（见 ADR-005）；抽屉标题 1213 行明示「仅脱敏摘要，不回显原始入参」 |
| 7 | GET | `/rules/snapshot` | 规则快照 handler，`src/bff/routes/consultAgentRoutes.ts` 351–374（353 方法、354 路径、357 READ、359 `buildRulesSnapshot`、361–371 响应） | `consult-agent:read` | 否 | 否 | 否 | `getRulesSnapshot`，`web/src/services/api/consultAgent.ts` 357–359 | `handleOpenRules` 682–694（683 行 `if (!canRead) return;`，688 行调用）；「规则快照」按钮 825–835，被 `canRead`（825）包裹；规则抽屉 1291–1339 | 返回 `{ version, disclaimer, acuteKeywords, tools, permissions }` |
| 8 | POST | `/threads/:threadId/stream` | `streamReply` SSE 实时流式，`src/bff/routes/consultAgentRoutes.ts` 376–409（377 注释声明不消费幂等键、378 方法、379 路径、382 WRITE、386–391 schema、398–402 编排调用、403–404 异常映射、407 `openSseStream`） | `consult-agent:write` | 否（不消费 `Idempotency-Key`） | 是（全局 `auditOperation`，POST 留痕） | 是 | `streamReply`，`web/src/services/api/consultAgent.ts` 536–548（543 URL、544 `method: 'POST'`、546 `signal`） | `handleSend` 445–623（520 行 `streamReply`、558–561 `onMeta`、562–572 `onDone` 回填 `messageId`）；输入框 1135–1146、发送按钮 1148–1159 | 请求体 `{ content }`；八类 SSE 事件 + `data: [DONE]`；方法为 **POST**（非 GET，口径见 [13-contract-reconciliation.md](./13-contract-reconciliation.md) §5） |
| 9 | GET | `/threads/:threadId/stream/replay` | 历史事件回放 handler，`src/bff/routes/consultAgentRoutes.ts` 411–507（413 方法、414 路径、417 READ、420 `findOwnedThread`、424–460 消息 / 草稿 / 审计时间线、462–499 回放事件装配、502 固定 `medium` meta、503 `done` 取末条消息、505 `openSseStream`） | `consult-agent:read` | 否 | 否 | 是 | `replayEvents`，`web/src/services/api/consultAgent.ts` 551–562（557 URL、558 `method: 'GET'`、560 `signal`） | `handleReplay` 712–754（713 行 `if (!canRead) return;`、730 行调用、742 `onMeta`、743–744 `onDone`）；「事件回放」按钮 837–847，被 `canRead`（837）包裹；回放抽屉 1342–1382 | 回放 `meta.confidence` 固定 `medium`；`done.messageId` 为空会话回退空串 |
| 10 | GET | `/threads/:threadId/drafts/:kind` | 草稿查询 handler，`src/bff/routes/consultAgentRoutes.ts` 509–532（511 方法、512 路径、515 READ、518–523 `kind` 枚举校验、526 `findOwnedThread`、529 `repo.listDrafts`、530 响应 `{ draft: drafts[0] ?? null }`） | `consult-agent:read` | 否 | 否 | 否 | `getDraft`，`web/src/services/api/consultAgent.ts` 362–367 | `refreshDrafts` 373–383（376、377 行分别取 diagnosis / prescription）；草稿卡片 254–296 | `kind ∈ diagnosis / prescription`；非法 `kind` 返回 400；无草稿返回 `draft: null`；草稿卡片 254–296 渲染「需执业医师复核」「非院外处方」标签与「AI 辅助建议，待医师复核」正文标注，由草稿三红线字段驱动 |
| 11 | GET | `/profile` | 画像读取 handler，`src/bff/routes/consultAgentRoutes.ts` 534–545（536 方法、537 路径、540 READ、542 `repo.getProfile`、543 响应 `{ facts }`） | `consult-agent:read` | 否 | 否 | 否 | `getProfile`，`web/src/services/api/consultAgent.ts` 370–373 | `handleOpenProfile` 697–709（698 行 `if (!canRead) return;`、703 行调用）；「用户画像」按钮 849–858，被 `canRead`（849）包裹；画像抽屉 1385–1420（标题「用户画像事实」1386） | 返回当前登录用户画像事实数组；不存在时返回空白画像（`consultAgentRepo.ts` DEMO 口径见文件头 7–9 行注释） |
| 12 | POST | `/threads/:threadId/exit` | `exitThread` 退出 / 关闭会话，`src/bff/routes/consultAgentRoutes.ts` 547–580（549 方法、550 路径、553 WRITE、556 `findOwnedThread`、560–561 终态 409、564–566 置 `closed`、569–576 `thread_exit` 审计、578 响应 `{ thread }`） | `consult-agent:write` | 是 | 是（全局 `auditOperation` + handler 内 `thread_exit` 审计条目） | 否 | `exitThread`，`web/src/services/api/consultAgent.ts` 376–379 | `handleExit` 626–638（630 行调用）；「退出会话」按钮 813–823，终态 `disabled`（817） | 回调内无二次判权，由 BFF WRITE 权威拦截；终态重复退出返回 409 |

### 3.1 矩阵口径说明

- **幂等**：序号 1、3、5、12 为状态变更写端点，接受 `Idempotency-Key`，由全局 `withIdempotency` 中间件处理（`src/bff/server.ts` 6822–6823，归属共享基础设施分片）；序号 8 流式端点不消费幂等键（OpenAPI `x-idempotent: false`，`docs/api/consult-agent-openapi.yaml` 272；BFF 注释 `consultAgentRoutes.ts` 377；服务层 `streamReply` 536–548 不传幂等头）。
- **审计**：序号 1、3、5、8、12 的 HTTP 状态变更由全局 `auditOperation` 在 `finally` 段落库（`src/bff/server.ts` 6838–6839，fire-and-forget）；序号 6 是审计轨迹**读取**端点，本身不落操作审计；核心包内 `sentinel_approved` / `sentinel_rejected` / `acute_bypass` / `thread_exit` 等业务审计条目由编排器 / 退出端点显式构造（见 [08-adr.md](./08-adr.md) ADR-005、ADR-014）。
- **SSE**：仅序号 8（实时流式）与序号 9（历史回放）返回 `text/event-stream`；响应头见 `consultAgentRoutes.ts` 48–53，结束帧 `data: [DONE]\n\n` 见 127 行。
- **归属隔离**：序号 3、8 的线程归属校验在编排器内完成（`consultOrchestrator.ts` 129–132 抛 `THREAD_NOT_FOUND`、133–135 抛 `THREAD_CLOSED`）；其余带 `:threadId` 的端点在 handler 内先调用 `findOwnedThread`（`consultAgentRoutes.ts` 106–112），不存在或不属于当前用户均返回 404，不泄露线程存在性。

## 4. 前端二次判权说明

### 4.1 条件渲染入口（无权限不渲染）

| 页面元素 | 判权条件 | 渲染位置 | 回调函数 / 二次判权行号 |
|---|---|---|---|
| 「规则快照」按钮 | `canRead` | `ConsultAgentChatPage.tsx` 825–835 | `handleOpenRules` 682–694，683 行首行 `if (!canRead) return;` |
| 「事件回放」按钮 | `canRead` | `ConsultAgentChatPage.tsx` 837–847 | `handleReplay` 712–754，713 行首行 `if (!canRead) return;` |
| 「用户画像」按钮 | `canRead` | `ConsultAgentChatPage.tsx` 849–858 | `handleOpenProfile` 697–709，698 行首行 `if (!canRead) return;` |
| 「审计轨迹」按钮 | `canAudit` | `ConsultAgentChatPage.tsx` 861–871 | `handleOpenAudit` 664–679，665 行首行 `if (!canAudit) return;` |
| 语音转写按钮 | `canWrite` | `ConsultAgentChatPage.tsx` 1123–1133 | `handleTranscribe` 642–661，643 行首行 `if (!canWrite) return;` |

### 4.2 回调内二次判权清单

回调内首行再次判权、无权限直接 `return`、不调用服务函数的处理器共 5 个：

1. `handleTranscribe`（`canWrite`）：`ConsultAgentChatPage.tsx` 642–643。
2. `handleOpenAudit`（`canAudit`）：`ConsultAgentChatPage.tsx` 664–665。
3. `handleOpenRules`（`canRead`）：`ConsultAgentChatPage.tsx` 682–683。
4. `handleOpenProfile`（`canRead`）：`ConsultAgentChatPage.tsx` 697–698。
5. `handleReplay`（`canRead`）：`ConsultAgentChatPage.tsx` 712–713。

### 4.3 不做回调内二次判权的动作（BFF 权威拦截）

- `handleCreate`（430–442）、`handleExit`（626–638）、`handleSend`（445–623）不在回调内判权；对应端点由 BFF `requirePermissionCode(WRITE)` 权威拦截，前端若经调试触发越权调用，服务端返回 403。发送按钮仅以 `isTerminal` 禁用（1153 行），发送输入框终态禁用（1146 行），均为状态可用性提示而非权限闸。
- 页面路由兜底：`web/src/router/index.tsx` 8803–8811，`RequirePermission permission="consult-agent:read"` 包裹 `ConsultAgentChatPage`（8807 行；该路由文件归前端框架分片，此处仅引用）。
- 401 处理：`web/src/services/request.ts` 105、124 行 401 清除本地 token 并跳转登录；SSE 流请求在 `consumeSseStream` 内携带 Bearer 与 `X-CSRF-Token`（`consultAgent.ts` 479–480、486–492），非 2xx 走 `onError` 上报（501–507）。

## 5. 状态机合法迁移（引用，不重复改写）

会话状态合法迁移矩阵见 [05-state-machine.md](./05-state-machine.md) §2.1（46–57 行）与 §2.2 状态转移约束（59 行起）；源码实现为 `src/core/agent/consult/stateMachine.ts` 13–21（`THREAD_TRANSITIONS` 表）、25–27（`canTransition`）、30–34（`assertTransition`）、37–39（`isTerminalStatus`）。本文不复述转移矩阵，权限拦截与状态终态判定的衔接口径如下：

- 终态会话（`closed` / `aborted`）拒绝新消息：编排器 `consultOrchestrator.ts` 133–135 抛 `THREAD_CLOSED`，由 `consultAgentRoutes.ts` 99–100 映射为 409。
- 退出端点前置终态守卫：`consultAgentRoutes.ts` 560–561，已终态返回 409。

## 6. 错误码与拦截口径对照

| HTTP 状态 | 触发条件 | 服务端证据 | 前端表现 |
|---|---|---|---|
| 401 | 未登录 / 登录过期，`c.user` 为空 | `src/bff/middleware/auth.ts` 315–316；`src/bff/server.ts` 6805–6808（`requireAuth`） | `request.ts` 105、124 清 token 跳登录；SSE `consumeSseStream` 非 2xx 走 `onError('HTTP_ERROR', …)`（`consultAgent.ts` 501–507） |
| 403 | 已登录但权限码缺失 | `src/bff/middleware/auth.ts` 322–324 | 页面不渲染对应入口（§4.1）；未做二次判权的动作收到 403 后 `antdMessage.error` 提示 |
| 404 | 线程不存在或不属于当前用户 | `consultAgentRoutes.ts` 106–112（`findOwnedThread`）；`consultOrchestrator.ts` 129–132（`THREAD_NOT_FOUND` → `consultAgentRoutes.ts` 96–97） | 会话列表刷新；不弹出内部堆栈 |
| 409 | 终态会话重复操作（发消息 / 退出） | `consultOrchestrator.ts` 133–135；`consultAgentRoutes.ts` 99–100、560–561 | 退出按钮终态禁用（817）；消息发送输入框终态禁用（1146） |
| 400 | 入参 schema 非法 / `kind` 枚举非法 | `consultAgentRoutes.ts` 183–185、256–261、320–325、386–391、518–523 | 服务层抛出结构化错误，页面 `onError` / `antdMessage.error` 展示后端文案 |
| 500 | 编排器其他未归类异常 | `consultAgentRoutes.ts` 102（`INTERNAL_ERROR`，不回显堆栈与内部状态）；403–404、227–228、284–285 异常映射走 `mapConsultError` | 页面展示「咨询处理失败，请稍后重试」类统一文案 |

## 7. 边界与归属说明

- `src/bff/server.ts`（CSRF、租户上下文、`requireAuth`、`withIdempotency`、`auditOperation` 装配）、`src/bff/middleware/auth.ts`（鉴权与权限码中间件）、`web/src/store/authStore.ts`、`web/src/router/index.tsx` 归属共享基础设施 / 前端框架分片；本文仅引用其行号作为权限闸证据，不在 consult 范围内修改。
- 角色 → 权限码的 JWT 签发与种子数据归属身份认证 / 迁移分片；consult 范围仅保证 BFF 按权限码校验、前端按权限码渲染。
