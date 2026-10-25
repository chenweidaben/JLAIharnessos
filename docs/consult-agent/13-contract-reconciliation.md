# consult-agent M86 三端契约一致性复核报告

> Copyright (c) 2026 杭州健澜科技有限公司
>
> 所属产品：**健澜AI原生医院操作系统OS**。
> 本文对 12 个 consult-agent 端点在 **OpenAPI 规范**、**BFF 路由**、**前端服务层** 三层逐一复核 HTTP 方法、路径、权限码、幂等、审计、请求 / 响应结构与 SSE 事件；每端证据给出文件相对路径与行号区间。复核纪律：**仅复核、不修改源码**；发现残余偏差如实列入 §5，不为消除偏差改动实现。

## 1. 复核范围与证据文件

### 1.1 三端证据清单

| 层 | 文件（相对仓库根路径） | 复核对象 |
|---|---|---|
| 契约规范 | `docs/api/consult-agent-openapi.yaml` | 路径、方法、`x-permission-code`、`x-idempotent`、`x-audit`、请求 / 响应 schema、SSE schema 与 `x-sse-events` 清单 |
| BFF 路由 | `src/bff/routes/consultAgentRoutes.ts` | `RouteDef[]` 12 个 handler：方法、路径、`requirePermissionCode`、zod 前置校验、编排调用、响应信封、SSE 装配 |
| 前端服务层 | `web/src/services/api/consultAgent.ts` | 12 个服务函数、入参 / 结果类型、SSE 联合类型、`handleFrame` 分派、`consumeSseStream` 请求头与方法 |
| 后端类型 / schema | `src/core/agent/consult/types.ts` | 枚举实体、zod 请求 / 草稿 schema、`SseEvent` 联合类型、安全常量 |
| 编排发射侧 | `src/core/agent/consult/consultOrchestrator.ts` | 急症旁路、退出、常规问诊三类事件发射位置 |
| 既有契约文档 | `docs/consult-agent/03-contract.md` | 术语、章节号与本文对齐（§3.2 端点表 190–203 行、§2 SSE 事件 163–179 行） |

### 1.2 复核口径

- 路径前缀：OpenAPI `servers.url = /api/v1/consult-agent`（26 行）；BFF `path` 含完整前缀（176、236 等行）；前端服务层使用相对路径 `/consult-agent/...`，经 `env.apiBaseUrl`（`web/src/utils/config.ts` 9 行，默认 `/api/v1`）拼接，`web/src/services/request.ts` 67 行注入 `baseURL`。
- 权限码三端枚举一致：`consult-agent:read` / `consult-agent:write` / `consult-agent:audit`（OpenAPI 42–45；`src/bff/permissions.ts` 208–210；服务层不直接持有权限码，仅消费 BFF 401 / 403 响应）。
- 响应信封 `ApiResponse<T>`：`{ code, message, data, timestamp, traceId? }`（OpenAPI 800–808）；BFF `ok` / `fail` 封装；前端 `get` / `post` 解包 `data`。
- 不复核：前端页面条件渲染与按钮入口（见 [09-permission-matrix.md](./09-permission-matrix.md) §4）；状态机迁移表（见 [05-state-machine.md](./05-state-machine.md) §2.1，本文不重复改写）。

## 2. 12 端点复核汇总矩阵

| # | 方法 | 路径（OpenAPI 相对路径） | OpenAPI 证据行号 | BFF 证据行号 | 前端服务证据行号 | 权限码 | 幂等 | 审计 | SSE | 结论 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | POST | `/threads` | 74–104（post 75；权限 81；幂等 82；审计 83；请求 90；响应 101） | 173–231（方法 175；路径 176；权限 179；schema 183–185；响应 209、220–226；catch 227–228） | `createThread` 317–318；入参 263–267；结果 270–274 | WRITE | 是 | 是（口径见 §5.2 D2） | 否 | 一致 |
| 2 | GET | `/threads` | 105–125（get 105；权限 109；幂等 110；审计 111；响应 122） | 233–244（方法 235；路径 236；权限 239；列表 241；响应 242） | `listThreads` 322–325 | READ | 否 | 否 | 否 | 一致 |
| 3 | POST | `/threads/:threadId/messages` | 126–158（post 127；权限 133；幂等 134；审计 135；请求 143；响应 154；409 158） | 246–288（方法 248；路径 249；权限 252；schema 256–261；编排 267–271；响应 272–283；catch 284–285） | `sendMessage` 328–330；结果 277–282 | WRITE | 是 | 是 | 否 | 一致 |
| 4 | GET | `/threads/:threadId/messages` | 159–181（get 159；权限 163；幂等 164；审计 165；响应 178） | 290–305（方法 292；路径 293；权限 296；归属 299；响应 303） | `listMessages` 333–338 | READ | 否 | 否 | 否 | 一致 |
| 5 | POST | `/threads/:threadId/transcribe` | 182–214（post 183；权限 189；幂等 190；审计 191；请求 199；响应 210） | 307–332（方法 309；路径 310；权限 313；归属 316；schema 320–325；响应 329–330） | `transcribe` 341–346；入参 291–294；结果 285–288 | WRITE | 是 | 是（口径见 §5.2 D2） | 否 | 一致 |
| 6 | GET | `/threads/:threadId/audit` | 215–238（get 216；权限 220；幂等 221；审计 222；响应 235） | 334–349（方法 336；路径 337；权限 340；归属 343；列表 346；响应 347） | `listAudit` 349–354 | AUDIT | 否 | 否 | 否 | 一致 |
| 7 | GET | `/rules/snapshot` | 239–262（get 240；权限 246；幂等 247；审计 248；响应 259） | 351–374（方法 353；路径 354；权限 357；快照 359；响应 361–371） | `getRulesSnapshot` 357–359；结果 304–310；工具描述符 297–301 | READ | 否 | 否 | 否 | 一致 |
| 8 | POST | `/threads/:threadId/stream` | 263–300（post 264；权限 271；幂等 272；审计 273；请求 280；SSE 295；响应头 284–292；409 299） | 376–409（方法 378；路径 379；权限 382；schema 386–391；编排 398–402；catch 403–404；`openSseStream` 407） | `streamReply` 536–548（URL 543；方法 POST 544；signal 546） | WRITE | **否** | 是 | **是（POST 流）** | 一致 |
| 9 | GET | `/threads/:threadId/stream/replay` | 301–328（get 302；权限 306；幂等 307；审计 308；SSE 325；响应头 314–322） | 411–507（方法 413；路径 414；权限 417；归属 420；时间线 424–460；回放事件 462–499；meta 502；done 503；`openSseStream` 505） | `replayEvents` 551–562（URL 557；方法 GET 558；signal 560） | READ | 否 | 否 | 是 | 一致 |
| 10 | GET | `/threads/:threadId/drafts/:kind` | 329–357（get 330；权限 334；幂等 335；审计 336；kind 参数 338–343；响应 354） | 509–532（方法 511；路径 512；权限 515；kind 校验 518–523；归属 526；响应 530） | `getDraft` 362–367 | READ | 否 | 否 | 否 | 一致（OpenAPI 未列 400，见 §5.1 D1） |
| 11 | GET | `/profile` | 358–379（get 359；权限 363；幂等 364；审计 365；响应 376） | 534–545（方法 536；路径 537；权限 540；画像 542；响应 543） | `getProfile` 370–373 | READ | 否 | 否 | 否 | 一致 |
| 12 | POST | `/threads/:threadId/exit` | 380–402（post 381；权限 385；幂等 386；审计 387；参数 389–390；响应 401） | 547–580（方法 549；路径 550；权限 553；归属 556；终态 409 560–561；关闭 564–566；审计 569–576；响应 578） | `exitThread` 376–379 | WRITE | 是 | 是 | 否 | 一致 |

> 端点 8 方法口径：三端均为 **POST**（OpenAPI 264、BFF 378、服务 544）；基线档案现行表内第 74 行已为 POST，初版曾误记 GET 的历史订正留痕见 §5.2 D5。

## 3. 逐端点三层比对明细

### 3.1 端点 1 · 创建会话（可带首条消息）

| 层 | 方法 | 路径 | 权限码 | 幂等 | 审计 | 请求体 | 响应体 | 证据行号 |
|---|---|---|---|---|---|---|---|---|
| OpenAPI | POST | `/threads` | `consult-agent:write` | `x-idempotent: true` | `x-audit: true` | `ThreadCreateRequest`：`title?` ≤120、`patientId?` uuid 可空、`initialMessage?` ≤2000（629–634） | `ThreadCreateData`：必需 `thread`、`messages`；`draft?`（653–659） | 74–104；schema 629–634、653–659 |
| BFF | POST | `/api/v1/consult-agent/threads` | `WRITE`（179） | 全局 `withIdempotency` 装配（`src/bff/server.ts` 6822–6823） | 全局 `auditOperation` fire-and-forget（`server.ts` 6838–6839）；带首条消息时编排器写领域审计 | `threadCreateSchema` 前置校验（183–185；zod 见 `types.ts` 194–197） | 无首条消息：`{ thread, messages: [] }`（209）；带首条消息：`{ thread, messages, draft? }`（220–226） | 173–231 |
| 前端服务 | POST | `/consult-agent/threads`（318） | —（401 / 403 由 BFF 权威拦截） | 不组装幂等键（键由中间件装配） | — | `CreateThreadInput`：`title?`、`patientId?`、`initialMessage?`（263–267） | `CreateThreadResult`：`thread`、`messages`、`draft?`（270–274） | 317–318、263–274 |

**结论**：方法、路径、权限码、幂等 / 审计标记、请求字段与响应必需字段三端一致；`draft` 可选字段两端口径一致。领域审计粒度差异见 §5.2 D2。

### 3.2 端点 2 · 会话列表

| 层 | 方法 | 路径 | 权限码 | 幂等 | 审计 | 请求体 | 响应体 | 证据行号 |
|---|---|---|---|---|---|---|---|---|
| OpenAPI | GET | `/threads` | `consult-agent:read` | `false` | `false` | 无 | `ThreadListData`：`{ threads: ConsultThread[] }`（660–664） | 105–125 |
| BFF | GET | `/api/v1/consult-agent/threads` | `READ`（239） | 否 | 否 | 无 | `{ threads }`（242）；按当前用户过滤（241） | 233–244 |
| 前端服务 | GET | `/consult-agent/threads`（323） | — | 否 | 否 | 无 | 解包 `data.threads`，空数组兜底（322–325） | 322–325 |

**结论**：一致。

### 3.3 端点 3 · 发送消息（非流式快照）

| 层 | 方法 | 路径 | 权限码 | 幂等 | 审计 | 请求体 | 响应体 | 证据行号 |
|---|---|---|---|---|---|---|---|---|
| OpenAPI | POST | `/threads/:threadId/messages` | `consult-agent:write` | `true` | `true` | `MessageSendRequest`：`content` 1–4000 字符（635–639） | `MessageSendData`：必需 `thread`、`message`；`draft?`、`events?`（665–672）；409 已声明（158） | 126–158；schema 635–639、665–672 |
| BFF | POST | `/api/v1/consult-agent/threads/:threadId/messages` | `WRITE`（252） | 全局幂等中间件装配 | 全局审计 + 编排器领域审计 | `messageSendSchema`（256–261；zod `types.ts` 201–203） | `{ thread, message, draft?, events }`（272–283）；终态 409 由 `mapConsultError` 99–100 映射；编排异常 500 由 284–285 捕获 | 246–288 |
| 前端服务 | POST | `/consult-agent/threads/${threadId}/messages`（329） | — | 否（POST 不自动重试，`request.ts` 129–136 仅 GET 重试） | — | `{ content }`（329） | `SendMessageResult`：`thread`、`message`、`draft?`、`events?`（277–282） | 328–330、277–282 |

**结论**：一致。400 / 409 判定路径说明见 §5.3 D6。

### 3.4 端点 4 · 历史消息

| 层 | 方法 | 路径 | 权限码 | 幂等 | 审计 | 请求体 | 响应体 | 证据行号 |
|---|---|---|---|---|---|---|---|---|
| OpenAPI | GET | `/threads/:threadId/messages` | `consult-agent:read` | `false` | `false` | `ThreadId` 参数（414–418） | `MessageListData`：`{ messages: ConsultMessage[] }`（673–677） | 159–181 |
| BFF | GET | `/api/v1/consult-agent/threads/:threadId/messages` | `READ`（296） | 否 | 否 | `c.params.threadId`；归属校验 `findOwnedThread`（299） | `{ messages }`（303），`createdAt` 升序由仓储保证 | 290–305、106–112 |
| 前端服务 | GET | `/consult-agent/threads/${threadId}/messages`（335） | — | 否 | 否 | 路径参数 | 解包 `data.messages`，空数组兜底（333–338） | 333–338 |

**结论**：一致。

### 3.5 端点 5 · 语音转写 DEMO

| 层 | 方法 | 路径 | 权限码 | 幂等 | 审计 | 请求体 | 响应体 | 证据行号 |
|---|---|---|---|---|---|---|---|---|
| OpenAPI | POST | `/threads/:threadId/transcribe` | `consult-agent:write` | `true` | `true` | `TranscribeRequest`：`transcript?`、`audioText?`，至少其一非空（640–645） | `TranscribeData`：必需 `text`；`message?`（678–683） | 182–214；schema 640–645、678–683 |
| BFF | POST | `/api/v1/consult-agent/threads/:threadId/transcribe` | `WRITE`（313） | 全局幂等中间件装配 | 全局审计；handler 不写领域审计条目（口径见 §5.2 D2） | 归属校验 316；`transcribeSchema` 至少其一非空（320–325；zod `types.ts` 206–218） | `{ text }`（329–330），归一化逻辑 327–329 | 307–332 |
| 前端服务 | POST | `/consult-agent/threads/${threadId}/transcribe`（345） | — | — | — | `TranscribeInput`：`transcript?`、`audioText?`（291–294） | `TranscribeResult`：`text`、`message?`（285–288） | 341–346、285–294 |

**结论**：一致。`message` 为可选字段，BFF 当前不返回，省略可选字段不构成偏差（§5.2 D3）。

### 3.6 端点 6 · 审计轨迹

| 层 | 方法 | 路径 | 权限码 | 幂等 | 审计 | 请求体 | 响应体 | 证据行号 |
|---|---|---|---|---|---|---|---|---|
| OpenAPI | GET | `/threads/:threadId/audit` | `consult-agent:audit` | `false` | `false` | `ThreadId` 参数 | `AuditListData`：`{ entries: ConsultAuditEntry[] }`（684–688）；`detail` 为脱敏结构化摘要，禁止原始入参（603–606） | 215–238；schema 589–607、684–688 |
| BFF | GET | `/api/v1/consult-agent/threads/:threadId/audit` | `AUDIT`（340） | 否 | 否 | 归属校验 343 | `{ entries }`（347） | 334–349 |
| 前端服务 | GET | `/consult-agent/threads/${threadId}/audit`（351） | — | 否 | 否 | 路径参数 | 解包 `data.entries`，空数组兜底（349–354） | 349–354 |

**结论**：一致。`audit` 码仅 admin 持有，角色映射见 [09-permission-matrix.md](./09-permission-matrix.md) §2。

### 3.7 端点 7 · 规则快照

| 层 | 方法 | 路径 | 权限码 | 幂等 | 审计 | 请求体 | 响应体 | 证据行号 |
|---|---|---|---|---|---|---|---|---|
| OpenAPI | GET | `/rules/snapshot` | `consult-agent:read` | `false` | `false` | 无 | `RulesSnapshotData`：必需 `version`、`disclaimer`、`acuteKeywords`、`tools`、`permissions`（689–706）；工具项 `{ name, description, aliases }`（699–705） | 239–262；schema 689–706 |
| BFF | GET | `/api/v1/consult-agent/rules/snapshot` | `READ`（357） | 否 | 否 | 无 | 五字段装配（361–371），种子来自 `demoSeed.ts` `buildRulesSnapshot` | 351–374、`demoSeed.ts` 118–125 |
| 前端服务 | GET | `/consult-agent/rules/snapshot`（358） | — | 否 | 否 | 无 | `RulesSnapshot` 五字段（304–310）；`RulesToolDescriptor` 三字段（297–301） | 357–359、297–310 |

**结论**：一致。

### 3.8 端点 8 · SSE 实时流式问诊

| 层 | 方法 | 路径 | 权限码 | 幂等 | 审计 | 请求体 | 响应 / SSE | 证据行号 |
|---|---|---|---|---|---|---|---|---|
| OpenAPI | POST | `/threads/:threadId/stream` | `consult-agent:write` | `false`（流路由不消费 `Idempotency-Key`，268、272） | `true`（273） | `StreamRequest`：`content` 1–4000（646–650） | `text/event-stream`；响应头四字段（284–292）；`SseStream`（295、792–797）；400 / 401 / 403 / 409（296–299） | 263–300；schema 646–650、724–797 |
| BFF | POST | `/api/v1/consult-agent/threads/:threadId/stream` | `WRITE`（382） | 注释明示不消费 `Idempotency-Key`（377） | 全局审计 + 编排器领域审计（急症旁路 148–153、哨兵 292–299 / 311–318 / 327–334、落库 391–393） | `messageSendSchema`（386–391） | 编排成功后 `openSseStream(buildSseFrames(result.events), c)`（407）；400 前置 387–391；编排异常 403–404 经 `mapConsultError` 转 404 / 409 / 500；响应头 `SSE_HEADERS`（48–53）；结束帧 `data: [DONE]\n\n`（127） | 376–409、48–53、115–129、132–166 |
| 前端服务 | POST | `${env.apiBaseUrl}/consult-agent/threads/${threadId}/stream`（543） | — | 不组装幂等键 | — | `{ content }`（544） | `consumeSseStream`（542–547）：`method: 'POST'`（544）；`signal` 透传（546）；事件分派见 §4 | 536–548、473–533 |

**结论**：一致。方法 POST、非幂等、审计留痕、SSE 八类事件与结束帧三端对齐；事件明细见 §4。

### 3.9 端点 9 · SSE 历史事件回放

| 层 | 方法 | 路径 | 权限码 | 幂等 | 审计 | 请求体 | 响应 / SSE | 证据行号 |
|---|---|---|---|---|---|---|---|---|
| OpenAPI | GET | `/threads/:threadId/stream/replay` | `consult-agent:read` | `false` | `false` | `ThreadId` 参数 | `text/event-stream`；响应头四字段（314–322）；`SseStream`（325） | 301–328 |
| BFF | GET | `/api/v1/consult-agent/threads/:threadId/stream/replay` | `READ`（417） | 否 | 否 | 归属校验 420 | 时间线四类记录合并排序（424–460）；回放 `tool` / `delta` / `disclaimer` / `draft` / 审计 `tool` 事件（462–499）；`meta` 固定 `medium` + `DISCLAIMER`（502）；`done` 携带末条消息 ID 或空串（503）；`openSseStream`（505） | 411–507 |
| 前端服务 | GET | `${env.apiBaseUrl}/consult-agent/threads/${threadId}/stream/replay`（557） | — | 否 | 否 | 无请求体 | `consumeSseStream`：`method: 'GET'`（558）；`signal` 透传（560）；事件分派同 §4 | 551–562、473–533 |

**结论**：一致。回放 `meta` 置信度为固定 `medium`，非原始意图置信度，属已知口径（`08-adr.md` ADR-013）。

### 3.10 端点 10 · 草稿查询

| 层 | 方法 | 路径 | 权限码 | 幂等 | 审计 | 请求体 | 响应体 | 证据行号 |
|---|---|---|---|---|---|---|---|---|
| OpenAPI | GET | `/threads/:threadId/drafts/:kind` | `consult-agent:read` | `false` | `false` | `kind ∈ diagnosis / prescription`（338–343；`DraftKind` 470–472） | `DraftGetData`：`{ draft: ConsultDraft \| null }`（707–711）；错误仅列 401 / 403（355–356） | 329–357；schema 562–587、707–711 |
| BFF | GET | `/api/v1/consult-agent/threads/:threadId/drafts/:kind` | `READ`（515） | 否 | 否 | `kind` 白名单校验，非法返回 400（518–523）；归属校验 526 | `{ draft: drafts[0] ?? null }`（530） | 509–532 |
| 前端服务 | GET | `/consult-agent/threads/${threadId}/drafts/${kind}`（364） | — | 否 | 否 | 路径参数 `kind: DraftKind` | 解包 `data.draft ?? null`（362–367） | 362–367 |

**结论**：方法、路径、权限码、响应结构一致；OpenAPI 未声明 400 响应段，残余偏差见 §5.1 D1。草稿卡片标签口径见 §5.3：「需执业医师复核」「非院外处方」「AI 辅助建议，待医师复核」由草稿三红线字段驱动。

### 3.11 端点 11 · 用户画像事实

| 层 | 方法 | 路径 | 权限码 | 幂等 | 审计 | 请求体 | 响应体 | 证据行号 |
|---|---|---|---|---|---|---|---|---|
| OpenAPI | GET | `/profile` | `consult-agent:read` | `false` | `false` | 无 | `ProfileData`：`{ facts: ProfileFact[] }`（712–716） | 358–379；schema 609–616、712–716 |
| BFF | GET | `/api/v1/consult-agent/profile` | `READ`（540） | 否 | 否 | 无 | `{ facts: profile.facts }`（543）；按当前 `c.user?.id` 读取（542） | 534–545 |
| 前端服务 | GET | `/consult-agent/profile`（371） | — | 否 | 否 | 无 | 解包 `data.facts`，空数组兜底（370–373） | 370–373 |

**结论**：一致。

### 3.12 端点 12 · 退出 / 关闭会话

| 层 | 方法 | 路径 | 权限码 | 幂等 | 审计 | 请求体 | 响应体 | 证据行号 |
|---|---|---|---|---|---|---|---|---|
| OpenAPI | POST | `/threads/:threadId/exit` | `consult-agent:write` | `true` | `true` | `ThreadId` + `Idempotency-Key`（389–390） | `ExitData`：`{ thread }`（717–721）；错误列 400 / 401 / 403（402–404） | 380–402；schema 717–721 |
| BFF | POST | `/api/v1/consult-agent/threads/:threadId/exit` | `WRITE`（553） | 全局幂等中间件装配 | 全局审计 + 领域审计 `thread_exit`（569–576） | 归属校验 556；终态 409（560–561） | 置 `closed`、`closedAt`、`updatedAt`（564–566）；`{ thread }`（578） | 547–580 |
| 前端服务 | POST | `/consult-agent/threads/${threadId}/exit`（377） | — | — | — | 无请求体 | 解包 `data.thread`（376–379） | 376–379 |

**结论**：一致。终态重复退出的 409 口径见 [09-permission-matrix.md](./09-permission-matrix.md) §5 错误码对照。

## 4. SSE 八类事件三端对照表

事件清单来源：OpenAPI `x-sse-events`（47–71）；后端联合类型 `types.ts` 261–277；前端联合类型 `consultAgent.ts` 193–209；分发器 `handleFrame` 406–467。

| 事件 `type` | OpenAPI schema（行号） | 后端类型定义（`types.ts`） | 发射侧证据（BFF / 编排器 / 回放路由） | 前端消费（`consultAgent.ts`） | 字段一致性 |
|---|---|---|---|---|---|
| `delta` | `SseEventDelta` 724–729：`type: 'delta'`、`text` | 262：`{ type: 'delta'; text: string }` | 编排器 264（supervisor 回复）、277（角色回复）；BFF `chunkText` 62–75 切分、`buildSseFrames` 119–122 逐块成帧 | 类型 194；`handleFrame` 423–425（`typeof text === 'string'` 后 `onDelta`） | 一致 |
| `tool` | `SseEventTool` 730–740：必需 `type`、`stage`、`callId`、`toolName`、`success`；可选 `summary`、`evidenceCount`；`stage ∈ start/end`（735） | 263–271：同形，`summary?`、`evidenceCount?` | `toolEventsFromAudit` 97–115 仅发 `stage: 'end'`（106）；调用点 265、278；回放路由 467–477、488–496 同样 `stage: 'end'` | 类型 195–203；`ConsultToolEvent` 212–219；`handleFrame` 426–436（`stage` 非 `end` 归一 `start` 428；`success` 非 `false` 归一 `true` 431；缺失值兜底 429–435） | 一致；`start` 为契约预留枚举，当前实现仅发 `end`（§5.2 D4） |
| `safety:acute` | `SseEventSafetyAcute` 741–747：`type`、`matched: string[]`、`guidance` | 272：`{ type: 'safety:acute'; matched: string[]; guidance: string }` | 急症旁路 170；旁路不进角色编排、不产草稿、不调工具（141–180 整段） | 类型 204；`ConsultAcutePayload` 222–225；`handleFrame` 437–442（`matched` 数组归一、`guidance` 空串兜底） | 一致 |
| `draft` | `SseEventDraft` 748–753：`type`、`draft: ConsultDraft` | 273：`{ type: 'draft'; draft: ConsultDraft }` | 哨兵通过 323（重复）、338（新批准）；回放路由 484 | 类型 205；`handleFrame` 443–445（`payload.draft` 存在才 `onDraft`） | 一致；草稿三红线字段三端同构（OpenAPI 562–587；`types.ts` 226–243；服务层 134–153） |
| `disclaimer` | `SseEventDisclaimer` 754–759：`type`、`text` | 274：`{ type: 'disclaimer'; text: string }` | 急症旁路 171；退出分支 223；常规问诊 381；回放路由 481 | 类型 206；`handleFrame` 446–448（`typeof text === 'string'` 后 `onDisclaimer`） | 一致；常量文案 `types.ts` 250–251 |
| `meta` | `SseEventMeta` 760–766：`type`、`confidence ∈ high/medium/low`、`disclaimer` | 275：`{ type: 'meta'; confidence: 'high' \| 'medium' \| 'low'; disclaimer: string }` | 常规问诊 382–386（`confidenceLevel(intent.confidence)`）；回放路由 502（固定 `medium`） | 类型 207；`ConsultMetaPayload` 228–231；`handleFrame` 449–457（非 `high` / `medium` 归一 `low` 451–454；`disclaimer` 空串兜底 455） | 一致；前端归一化口径为防御性收敛，不改变契约枚举 |
| `done` | `SseEventDone` 767–772：`type`、`messageId` | 276：`{ type: 'done'; messageId: string }` | 急症旁路 172；退出分支 224；常规问诊 387；回放路由 503（末条消息 ID 或空串） | 类型 208；`ConsultDonePayload` 234–235；`handleFrame` 458–460（缺失回退空串） | 一致；`messageId` 回填口径见 `08-adr.md` ADR-013 |
| `error` | `SseEventError` 773–779：`type`、`code`、`message` | 277：`{ type: 'error'; code: string; message: string }` | 哨兵驳回 302–306（`code: 'DRAFT_REJECTED'`）；非 2xx HTTP 错误由前端 `consumeSseStream` 501–507 转 `HTTP_ERROR` 回调，不属于 SSE `error` 帧 | 类型 209；`handleFrame` 461–463（`code` 缺失 `'ERROR'`、`message` 缺失兜底文案） | 一致 |

### 4.1 结束帧与响应头

| 项 | OpenAPI | BFF | 前端服务 | 结论 |
|---|---|---|---|---|
| 结束帧 `data: [DONE]\n\n` | 13 行注释、795 行 `SseStream` 描述 | `buildSseFrames` 127 行追加结束帧 | `handleFrame` 413 行识别 `[DONE]` 并跳过 | 一致 |
| `Content-Type: text/event-stream; charset=utf-8` | 286、316、796 | `SSE_HEADERS` 49 | `consumeSseStream` 488 `Accept: text/event-stream` | 一致 |
| `Cache-Control: no-cache, no-transform` | 287、317、796 | `SSE_HEADERS` 50 | —（请求层不设置，由响应头约束中间层） | 一致 |
| `Connection: keep-alive` | 289、318、796 | `SSE_HEADERS` 51 | — | 一致 |
| `X-Accel-Buffering: no` | 291、321、797 | `SSE_HEADERS` 52 | — | 一致 |

### 4.2 流路由与幂等键

- OpenAPI：端点 8 `x-idempotent: false`（272），参数清单不含 `Idempotency-Key`（274–275 仅 `ThreadId`）；13 行注释明示「流路由不消费 Idempotency-Key」。
- BFF：377 行注释「SSE 实时流式问诊（不消费 Idempotency-Key）」；handler 内未读取幂等头。
- 前端服务：`streamReply` 542–547 未组装 `Idempotency-Key` 头；`consumeSseStream` 486–491 仅注入 `Content-Type`、`Accept`、`Authorization`、`X-CSRF-Token`。
- 其余写端点（1、3、5、12）的 `Idempotency-Key` 由全局中间件 `withIdempotency`（`server.ts` 6822–6823）统一装配，handler 不直接消费；OpenAPI 参数 85、138、194、390 与之一致。

## 5. 已知口径与残余偏差清单

> 处置纪律：本节所列残余偏差仅作文档记录，**不修改源码、不修改测试与脚本**；需要闭环时归入后续契约修订与跨分片工单。

### 5.1 文档层残余偏差（实现与规范不一致，规范待补）

**D1 · 端点 10 非法 `kind` 的 400 响应未在 OpenAPI 声明**

- 现状：BFF 518–523 对 `kind` 非 `diagnosis` / `prescription` 返回 400 `BAD_REQUEST`；OpenAPI 329–357 响应段仅列 200、401、403（355–356），未列 400。
- 影响：规范文档遗漏 400 分支；实现行为符合参数白名单预期，不构成安全问题。
- 处置建议：后续 OpenAPI 修订时为该操作补 `400: { $ref: '#/components/responses/BadRequest' }`；本轮不改源码、不改规范文件。

### 5.2 口径说明项（非冲突，需在评审时知晓）

**D2 · `x-audit: true` 的两层含义**

- OpenAPI `x-audit: true`（端点 1 / 3 / 5 / 8 / 12）对应两层留痕：
  1. 全局 `auditOperation` fire-and-forget，覆盖 POST / PUT / DELETE（`server.ts` 6838–6839，归属共享基础设施分片）；
  2. 编排器 / handler 写入 consult 领域审计条目（`audit/index.ts` 61–76 `createAuditEntry`）。
- 领域审计粒度差异：
  - 端点 1 无初始消息分支（BFF 208–209）不写领域审计条目；带初始消息时由编排器写领域审计。
  - 端点 5 转写 handler（312–332）不写领域审计条目，仅经全局审计中间件留痕。
  - 端点 8 领域审计由编排器写入（急症旁路 148–153；哨兵驳回 292–299；重复 311–318；通过 327–334；落库循环 391–393）。
  - 端点 12 领域审计 `thread_exit` 由 handler 569–576 写入。
- 判定：三端点级审计标记一致；领域审计条目粒度如实记录，不视为契约冲突。

**D3 · `TranscribeData.message` 可选字段当前不返回**

- OpenAPI 678–683：`message` 可选；服务层 `TranscribeResult.message?`（287）可选；BFF 330 仅返回 `{ text }`。
- 判定：可选字段省略，三端类型口径一致，不构成偏差。

**D4 · `tool` 事件 `stage: 'start'` 为预留枚举值**

- OpenAPI 735、`types.ts` 265、服务层 197 / 213 均保留 `start | end` 枚举；当前发射侧仅产生 `end`（编排器 97 行注释、106 行；回放路由 470、490）。
- 判定：契约预留扩展位，前端 `handleFrame` 428 已对 `start` / `end` 做归一兼容；不构成偏差。

**D5 · 基线档案初版端点 8 方法误记 GET 的订正留痕**

- 三端源码实测均为 POST：OpenAPI 264、BFF 378、服务层 544；既有契约文档 `docs/consult-agent/03-contract.md` §3.2 第 199 行已是 POST，与实现一致。
- 基线档案 `reports/consult-deepen/baseline-round0.md` 第 74 行单元格现行已为 POST；该表初版曾误记 GET，档案第 82 行「口径订正（round 1 终态复核回填）」段已按上述三处源码证据回填更正并留痕；本轮不回改基线报告，仅在此复述证据链。

**D6 · 端点 3「409/400 由 BFF 判定」描述口径**

- OpenAPI 132 行描述「终态会话拒绝新消息（409/400 由 BFF 判定）」：400 由 zod `messageSendSchema`（BFF 256–261）前置判定；409 由编排器抛 `THREAD_CLOSED`，经 `mapConsultError` 99–100 映射。
- 判定：描述为 BFF 层泛指，实现路径与状态码一致，不构成偏差。

### 5.3 已复核一致、无需处置的维度

- 12 端点 HTTP 方法与路径三端一致（§2 汇总矩阵）。
- 三权限码在 OpenAPI、`permissions.ts`、BFF `requirePermissionCode` 调用点逐一对应（[09-permission-matrix.md](./09-permission-matrix.md) §1、§3）。
- 请求体必填字段、长度约束、zod schema 与 OpenAPI schema 逐项一致（`types.ts` 194–218；OpenAPI 629–650）。
- 草稿三红线字面量三端同构：`needsPhysicianReview: true`、`isOutOfHospitalPrescription: false`、`status: 'pending_review'`（OpenAPI 573–581；`types.ts` 234–236；服务层 143–146；哨兵 `sentinelGateway.ts` 43–53）。
- 草稿前端标签三端口径一致：`ConsultAgentChatPage.tsx` 254「需执业医师复核」、256「非院外处方」、296「AI 辅助建议，待医师复核」，标签由草稿字段驱动、不允许本地改写。
- 免责声明与 120 提示常驻口径一致：`DISCLAIMER` 常量 83–84；每条 assistant 回复下方 1110；页面底部常驻 1162–1173；急症 120 提醒常驻 973；`ACUTE_GUIDANCE` 引导常量 87–88。
- SSE 八类事件 `type` 字面量、必填字段与可选字段三端一致（§4）。
- 响应信封 `code / message / data / timestamp / traceId?` 三端一致（OpenAPI 800–808；BFF `ok` / `fail`；服务层解包 `data`）。

## 6. 复核结论

1. **方法 / 路径 / 权限码 / 幂等标记 / 审计标记 / 请求体必填与约束 / 响应必需字段 / SSE 八类事件类型**：12 个端点在 OpenAPI、BFF 路由、前端服务层三端一致；未发现该等维度上的实现与规范冲突。
2. **残余偏差仅 1 项文档层遗漏**：D1 端点 10 的 400 响应未在 OpenAPI 声明；本轮按纪律不改源码、不改规范文件，列入后续契约修订。
3. **口径说明 5 项**（D2 审计两层含义、D3 可选字段省略、D4 `start` 预留、D5 基线初版 GET 误记的订正留痕、D6 400/409 路径描述）已在 §5.2 逐条标注证据与判定，评审时以本文口径为准。
4. 本报告不覆盖前端页面条件渲染、状态机迁移与浏览器视觉联调；对应内容分别见 [09-permission-matrix.md](./09-permission-matrix.md) §4、[05-state-machine.md](./05-state-machine.md) §2.1、[12-runbook.md](./12-runbook.md) §9 环境硬约束清单。
