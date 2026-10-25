# consult-agent M86 接口契约（API / 类型 / SSE / 前端视图）

> Copyright (c) 2026 杭州健澜科技有限公司
>
> 所属产品：**健澜AI原生医院操作系统OS**。
> 本文逐字抄录冻结契约 `reports/consult-rebuild/CONTRACT-m86.md` §1、§11、§12、§14；
> 枚举值、字段名、路径、权限码、事件类型以本文为准，契约未定义的字段不得自行发明。

## 1. 类型契约（对应契约 §1，`types.ts`，zod 4.3.6 强制）

### 1.1 枚举

```ts
export type RoleKind = 'supervisor' | 'examiner' | 'doctor' | 'pharmacist';

export type ThreadStatus =
  | 'idle' | 'collecting' | 'clarifying' | 'drafting'
  | 'review_pending' | 'escalated' | 'closed' | 'aborted';

export type IntentKind =
  | 'greeting' | 'symptom_report' | 'clarification_answer' | 'medication_question'
  | 'chronic_management' | 'acute_emergency' | 'document_upload' | 'exit' | 'unknown';

export type SafetyLevel = 'normal' | 'caution' | 'acute';

export type MessageRole = 'user' | 'assistant' | 'tool' | 'system';

export type DraftKind = 'diagnosis' | 'prescription';

export type DraftStatus = 'pending_review'; // AI 草稿恒为待医师复核，不产生 approved/rejected AI 态

export type ToolStatus = 'success' | 'error' | 'skipped';
```

### 1.2 实体接口

```ts
export interface EvidenceItem {
  kind: string;          // knowledge | drug | allergy | interaction | history | document
  label: string;
  source: string;
  snippet: string;
}

export interface ConsultThread {
  id: string;
  userId: string;
  patientId: string | null;
  title: string;
  status: ThreadStatus;
  intent: IntentKind;
  safetyLevel: SafetyLevel;
  currentRole: RoleKind | null;
  meta: Record<string, unknown>;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ToolCallRecord {
  callId: string;
  name: string;
  status: ToolStatus;
  durationMs: number;
  evidenceCount: number;
  errorClass: string | null;
  summary: string | null;
  // 禁止保存/回显原始入参明文
}

export interface ConsultMessage {
  id: string;
  threadId: string;
  role: MessageRole;
  content: string;
  intent: IntentKind | null;
  roleKind: RoleKind | null;
  toolCalls: ToolCallRecord[] | null;
  toolName: string | null;
  safetyLevel: SafetyLevel;
  disclaimer: string;
  traceId: string;
  createdAt: string;
}

export interface ConsultDocument {
  id: string;
  threadId: string;
  messageId: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number | null;
  evidenceSummary: string | null;
  extractedEvidence: EvidenceItem[];
  createdAt: string;
}

export interface ConsultDraft {
  id: string;
  threadId: string;
  kind: DraftKind;
  title: string;
  summary: string;
  content: string;
  evidence: EvidenceItem[];
  needsPhysicianReview: true;               // zod literal true 强制
  isOutOfHospitalPrescription: false;       // zod literal false 强制
  status: DraftStatus;
  draftHash: string;
  reviewerId: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultAuditEntry {
  id: string;
  threadId: string;
  actorRole: RoleKind | 'system' | 'user';
  action: string;
  toolName: string | null;
  toolStatus: ToolStatus | null;
  durationMs: number | null;
  evidenceCount: number | null;
  errorClass: string | null;
  traceId: string;
  detail: Record<string, unknown>;          // 脱敏后的结构化摘要，禁止原始入参
  createdAt: string;
}

export interface ProfileFact {
  key: string;
  value: string;
  source: string;
  updatedAt: string;
}

export interface ConsultProfileMemory {
  id: string;
  userId: string;
  threadId: string | null;
  facts: ProfileFact[];
  updatedAt: string;
}
```

### 1.3 zod schema（BFF 入参/草稿校验用，类型与接口一致）

- `threadCreateSchema`：`{ title: z.string().max(120).optional(), patientId: z.string().uuid().nullish(), initialMessage: z.string().max(2000).optional() }`
- `messageSendSchema`：`{ content: z.string().trim().min(1).max(4000) }`
- `transcribeSchema`：`{ transcript: z.string().max(4000).optional(), audioText: z.string().max(4000).optional() }`（至少其一非空）
- `draftSchema`：在 `ConsultDraft` 基础上对 `needsPhysicianReview: z.literal(true)`、`isOutOfHospitalPrescription: z.literal(false)`、`status: z.literal('pending_review')` 做强校验；evidence 为 `EvidenceItem[]`。
- 入参非法 → BFF 400 BAD_REQUEST。

### 1.4 常量

```ts
export const DISCLAIMER = '本回复由 AI 辅助生成，仅供健康科普与就诊参考，不能替代执业医师/药师的面对面诊断与处方决策；如有急症请立即拨打 120 或前往最近急诊。';
export const ACUTE_GUIDANCE = '检测到可能的急症信号：请立即停止自助问诊，前往最近医疗机构急诊或拨打 120；以下信息仅用于向急救人员描述情况，不构成诊断。';
```

## 2. SSE 事件契约（对应契约 §11，前后端一致）

```ts
export type SseEvent =
  | { type: 'delta'; text: string }
  | { type: 'tool'; stage: 'start' | 'end'; callId: string; toolName: string; success: boolean; summary?: string; evidenceCount?: number }
  | { type: 'safety:acute'; matched: string[]; guidance: string }
  | { type: 'draft'; draft: ConsultDraft }
  | { type: 'disclaimer'; text: string }
  | { type: 'meta'; confidence: 'high' | 'medium' | 'low'; disclaimer: string }
  | { type: 'done'; messageId: string }
  | { type: 'error'; code: string; message: string };
```

- SSE 帧格式：`data: {json}\n\n`，结束帧 `data: [DONE]\n\n`。
- 响应头复用 `SSE_HEADERS` 范式：`Content-Type: text/event-stream; charset=utf-8`、`Cache-Control: no-cache, no-transform`、`Connection: keep-alive`、`X-Accel-Buffering: no`。
- 流路由不消费 `Idempotency-Key`。

## 3. BFF 端点契约（对应契约 §12，前缀 `/api/v1/consult-agent`，共 12 个 handler 覆盖 11 项能力）

### 3.1 响应封装与写操作三件套

- 响应封装：`import { type Ctx, json, ok, fail, ErrorCode, type RouteDef } from '../types.js'`；成功 `json(ok(payload, 'ok', c.traceId))`；失败 `json(fail(ErrorCode.X, 'msg', c.traceId), status)`。
- 写操作三件套：`requirePermissionCode(c, code)` + `auditOperation(c)`（fire-and-forget）+ `withIdempotency`（`Idempotency-Key` 头，8–200 字符；无头不改变行为）。

### 3.2 端点表

| # | Method | Path | 权限码 | 幂等 | 审计 | 请求 / 响应 |
|---|---|---|---|---|---|---|
| 1 | POST | `/threads` | `consult-agent:write` | 是 | 是 | 请求体 `threadCreateSchema`；返回 `{ thread, messages, draft? }` |
| 2 | GET | `/threads` | `consult-agent:read` | – | – | 返回 `{ threads: ConsultThread[] }` |
| 3 | POST | `/threads/:threadId/messages` | `consult-agent:write` | 是 | 是 | 请求体 `messageSendSchema`；返回 `{ thread, message, draft?, events? }` |
| 4 | GET | `/threads/:threadId/messages` | `consult-agent:read` | – | – | 返回 `{ messages: ConsultMessage[] }` |
| 5 | POST | `/threads/:threadId/transcribe` | `consult-agent:write` | 是 | 是 | 请求体 `transcribeSchema`（`transcript` / `audioText` 至少其一非空）；返回 `{ text, message? }` |
| 6 | GET | `/threads/:threadId/audit` | `consult-agent:audit` | – | – | 返回 `{ entries: ConsultAuditEntry[] }` |
| 7 | GET | `/rules/snapshot` | `consult-agent:read` | – | – | 返回 `{ version, disclaimer, acuteKeywords, tools, permissions }` |
| 8 | POST | `/threads/:threadId/stream` | `consult-agent:write` | 否 | 是 | body `{ content }`；SSE 实时流式，逐帧 `delta` / `tool` / `safety:acute` / `draft` / `disclaimer` / `meta` / `done` |
| 9 | GET | `/threads/:threadId/stream/replay` | `consult-agent:read` | – | – | SSE 回放历史事件（按时间顺序重放持久化事件） |
| 10 | GET | `/threads/:threadId/drafts/:kind` | `consult-agent:read` | – | – | 返回 `{ draft: ConsultDraft \| null }`，`kind ∈ diagnosis/prescription` |
| 11 | GET | `/profile` | `consult-agent:read` | – | – | 返回 `{ facts: ProfileFact[] }` |
| 12 | POST | `/threads/:threadId/exit` | `consult-agent:write` | 是 | 是 | 退出/关闭会话；返回 `{ thread }` |

### 3.3 权限登记（`src/bff/permissions.ts` 末尾追加，不改既有段）

```ts
export const CONSULT_AGENT_PERMISSIONS = {
  READ: 'consult-agent:read',
  WRITE: 'consult-agent:write',
  AUDIT: 'consult-agent:audit',
} as const;
export type ConsultAgentPermissionCode =
  (typeof CONSULT_AGENT_PERMISSIONS)[keyof typeof CONSULT_AGENT_PERMISSIONS];
export const ALL_CONSULT_AGENT_PERMISSION_CODES: readonly string[] =
  Object.values(CONSULT_AGENT_PERMISSIONS);
```

### 3.4 路由挂载（`src/bff/server.ts`）

- 顶部 `import { consultAgentRoutes } from './routes/consultAgentRoutes.js';`。
- 在 `allRoutes` 数组末尾 `...consultAgentRoutes,`。

### 3.5 仓储说明

`src/db/repositories/consultAgentRepo.ts`：提供线程/消息/文档/草稿/审计/画像的 `create/list/get/update`；`DEMO_MODE=1` 时短路到 `runtime/sessionRuntime` 进程内存，不连库；字段驼峰、`mapRow` 蛇形转驼峰；签名风格对齐 `consultRequestRepo.ts`。

## 4. 前端视图契约（对应契约 §14）

### 4.1 服务层 `web/src/services/api/consultAgent.ts`

- `import { get, post } from '../request'`；SSE 用原生 `fetch(env.apiBaseUrl + ...)`，携带 `Authorization: Bearer token` 与 `X-CSRF-Token`。
- 视图类型与 §1 对齐（可省略非展示字段但不得改名）；SSE handler：`onDelta / onTool / onAcute / onDraft / onDisclaimer / onMeta / onDone / onError`。
- 函数清单：
  - `createThread(input)`
  - `listThreads()`
  - `sendMessage(threadId, content)`
  - `listMessages(threadId)`
  - `transcribe(threadId, payload)`
  - `listAudit(threadId)`
  - `getRulesSnapshot()`
  - `streamReply(threadId, content, handlers, signal?)`
  - `replayEvents(threadId, handlers, signal?)`
  - `getDraft(threadId, kind)`
  - `getProfile()`
  - `exitThread(threadId)`
- 请求路径：baseURL 已含 `/api/v1`，服务层相对路径如 `/consult-agent/threads`；SSE fetch 拼接 `${env.apiBaseUrl}/consult-agent/...`。错误经 `onError` 上报，禁止本地编造回复。

### 4.2 页面 `web/src/pages/consult-agent/ConsultAgentChatPage.tsx`

- `PageContainer` + `usePageTitle`；antd 组件（Card/Input/List/Tag/Spin/Button/Alert/Collapse 等）；深海蓝 `#0B3D6B`、辅助背景 `#E8F0F8`。
- 左侧会话列表（新建/切换）；右侧消息流：用户右对齐深蓝、角色回复左对齐白底；工具消息折叠卡片（仅工具名+摘要，不展示原始入参）；急症 `safety:acute` 红色 Alert 常驻提示；草稿面板展示诊断/处方草稿，徽章「需执业医师复核」「非院外处方」；**免责声明常驻页面底部与每条 assistant 回复下方**。
- 顶部状态/角色标签；退出会话按钮调 `exitThread`。

### 4.3 路由注册 `web/src/router/index.tsx`

- `const ConsultAgentChatPage = lazy(() => import('@/pages/consult-agent/ConsultAgentChatPage'));`
- 在 `AuthGuard` 包裹的路由组内注册：

```tsx
<Route
  path="consult-agent/chat"
  element={
    <RequirePermission permission="consult-agent:read">
      <ConsultAgentChatPage />
    </RequirePermission>
  }
/>
```

## 5. 错误信封

- 成功：`{ code: 0, message: 'ok', data: <payload>, timestamp: string, traceId?: string }`。
- 失败：`{ code: ErrorCode.X, message: string, data: null, timestamp: string, traceId?: string }`；入参非法 400 BAD_REQUEST；未登录 401；权限不足 403；终态会话新消息由 BFF 返回 409/400。
- 错误码沿用 `src/bff/types.ts` `ErrorCode` 枚举（`BAD_REQUEST = 40000`、`UNAUTHORIZED = 40100`、`FORBIDDEN = 40300`、`NOT_FOUND = 40400`、`CONFLICT = 40900`、`INTERNAL_ERROR = 50000` 等），不另立错误码体系。
