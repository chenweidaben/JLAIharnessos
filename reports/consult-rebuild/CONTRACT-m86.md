# consult-agent M86 冻结契约（Organizer 单一事实来源）

> 本文件由 Organizer 冻结，分片 A/B/C/D/E/F/G 一律以本契约为准，不得另起架构或漂移字段名/路径/状态枚举。
> 产品正式名称固定「**健澜AI原生医院操作系统OS**」；新增交付树内禁止出现：杠OS、健澜科技杠OS、Gang-OS、jianlan-gang-os、gang-os（大小写变体均禁止）。文件头版权统一：`Copyright (c) 2026 杭州健澜科技有限公司`。
> 仓库根：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`；分支 `consult-agent-m86`（基线 `3f019078`）。PowerShell 5.1；node v22.23.2；bun 绝对路径 `C:\Users\lenovo\.bun\bin\bun.exe`；`node_modules\.bin\tsc.cmd`、`eslint.cmd`、`prettier.cmd` 在位。

## 0. 模块定位与目录落点

核心包：`src/core/agent/consult/`；BFF：`src/bff/routes/consultAgentRoutes.ts` + `src/db/repositories/consultAgentRepo.ts`；迁移：`deploy/postgres/init/380..385`；前端：`web/src/services/api/consultAgent.ts`、`web/src/pages/consult-agent/ConsultAgentChatPage.tsx`；测试：`tests/unit/consult-agent/`、`tests/security/consult-agent/`、`tests/integration/consult-agent/`；文档：`docs/consult-agent/` + `docs/api/consult-agent-openapi.yaml`。

`src/core/agent/consult/` 文件树（不得增删顶层职责，可在职责内细分文件）：

```
types.ts            全部枚举/接口/zod schema 单一来源
ports.ts            角色/LLM/工具/仓储端口接口
stateMachine.ts     状态枚举 + 转移表 + canTransition/assertTransition
intentClassifier.ts 确定性意图分类（关键词规则 + 置信度）
draftHash.ts        稳定业务字段 SHA-256 草稿哈希
roleSupport.ts      角色共享工具：证据构造、免责声明、审计事件构造、常量
supervisor.ts       Supervisor 编排分诊实现
consultOrchestrator.ts 会话主流程编排（安全旁路 → 分诊 → 角色 → 哨兵 → 记忆 → 落库）
roles/index.ts      角色注册表 + 统一 RolePort 类型导出
roles/supervisorRole.ts
roles/examinerRole.ts
roles/doctorRole.ts
roles/pharmacistRole.ts
audit/index.ts      审计条目构造/脱敏/归属（actorRole + traceId 透传）
llm/safeLlm.ts      凭证仅取 process.env；无凭证确定性降级，不联网
memory/shortTermMemory.ts   近期消息 checkpoint（滑窗）
memory/profileMemory.ts     长期画像事实读写
runtime/sessionRuntime.ts    DEMO_MODE 进程内会话/消息/草稿/画像内存存储与 DEMO 短路
safety/acuteVocabulary.ts    急症词表 + 命中检测
safety/safetyGate.ts        安全等级评估与急症旁路判定
sentinel/sentinelGateway.ts 审批网关 + 草稿哈希去重
tools/toolRegistry.ts       工具注册表（规范驼峰名 + 下划线别名 + 参数归一化）
tools/evidenceExtractor.ts  证据抽取与分类
demo/demoSeed.ts            演示种子（DEMO 引导文案/示例工具返回/规则快照基线）
index.ts            包级聚合导出
```

## 1. 枚举与类型（types.ts，zod 4.3.6 强制）

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

## 2. 状态机（stateMachine.ts）

```ts
export const THREAD_TRANSITIONS: Record<ThreadStatus, ThreadStatus[]> = {
  idle:           ['collecting', 'escalated', 'closed'],
  collecting:     ['clarifying', 'drafting', 'escalated', 'closed', 'aborted'],
  clarifying:     ['collecting', 'drafting', 'escalated', 'closed', 'aborted'],
  drafting:        ['review_pending', 'escalated', 'closed', 'aborted'],
  review_pending: ['drafting', 'closed', 'aborted'],
  escalated:      ['closed', 'aborted'],
  closed:         [],
  aborted:        [],
};

export function canTransition(from: ThreadStatus, to: ThreadStatus): boolean;
export function assertTransition(from: ThreadStatus, to: ThreadStatus): void; // 非法转移抛 Error
```

规则：急症 `escalated` 旁路优先于任何角色编排；`closed`/`aborted` 为终态；非法转移必须显式抛错，不得静默跳转。

## 3. 意图分类（intentClassifier.ts）

```ts
export interface IntentResult { intent: IntentKind; confidence: number; matched: string[]; }
export function classifyIntent(text: string, history: ConsultMessage[]): IntentResult;
```

确定性关键词规则（不联网）：
- `greeting`：你好/您好/在吗/hi/hello；
- `exit`：结束/退出/再见/不用了/关闭会话；
- `document_upload`：上传/报告/化验单/影像/病历/检查结果（附件语境）；
- `medication_question`：药/用药/剂量/副作用/过敏/能否同服/处方；
- `chronic_management`：慢性病/随访/血压/血糖/长期管理/复查；
- `symptom_report`：症状/难受/疼/痛/咳嗽/发热/头晕/乏力等主诉；
- `clarification_answer`：上一轮 Examiner 追问后，history 最近一条为 assistant 追问且本次为补充回答；
- `acute_emergency`：safetyGate 命中急症时直接归此；
- 其余 `unknown`。置信度 0–1；规则可测、可枚举。

## 4. 安全（safety/）

### 4.1 急症词表 acuteVocabulary.ts

```ts
export const ACUTE_KEYWORDS: readonly string[]; // 见下，可按测试需要扩充但不得删除
export function detectAcute(text: string): { matched: string[]; isAcute: boolean };
```

词表（中文为主，小写归一化匹配）：
`胸痛`、`胸闷伴大汗`、`呼吸困难`、`喘憋`、`意识丧失`、`昏迷`、`意识不清`、`偏瘫`、`口角歪斜`、`言语不清`、`中风`、`脑出血`、`抽搐`、`惊厥`、`大出血`、`呕血`、`咯血`、`黑便`、`便血`、`严重外伤`、`头部外伤`、`窒息`、`喉头水肿`、`严重过敏`、`过敏性休克`、`自杀`、`轻生`、`自伤`、`孕妇腹痛`、`阴道出血`、`胎动消失`、`高热惊厥`、`心肌梗死`、`心跳骤停`、`面色青紫`、`休克`、`剧烈腹痛`、`中毒`、`误服药物`。

### 4.2 safetyGate.ts

```ts
export interface SafetyVerdict { level: SafetyLevel; matched: string[]; }
export function evaluateSafety(text: string): SafetyVerdict;
```
命中词表 → `acute`；含高危但非急危重表述（如长期慢性病急性加重表述）→ `caution`；其余 `normal`。

## 5. 角色（roles/，统一端口 ports.ts）

```ts
export interface RoleInput {
  thread: ConsultThread;
  history: ConsultMessage[];
  userText: string;
  intent: IntentKind;
  tools: ToolRegistry;
  profile: ConsultProfileMemory;
  traceId: string;
}

export interface RoleOutput {
  reply: string;
  nextRole: RoleKind | null;
  draft: ConsultDraft | null;
  evidence: EvidenceItem[];
  followUpQuestions: string[];
  memoryUpdates: ProfileFact[];
  audit: ConsultAuditEntry[];
  degradedLlm: boolean;
}

export interface RolePort {
  kind: RoleKind;
  handle(input: RoleInput): Promise<RoleOutput>;
}
```

- **supervisorRole**：分诊；先交 safetyGate（acute 由编排层旁路，不进角色）；按 intent 选下一个角色（用药问题→pharmacist；症状主诉信息充分→doctor；信息不足→examiner；问候→简短引导并维持 collecting）。产出编排级回复与 `nextRole`。
- **examinerRole**：信息不足时输出 2–4 个结构化追问（`followUpQuestions`），状态导向 `clarifying`；不产草稿。
- **doctorRole**：生成**诊断建议草稿**（kind=`diagnosis`）；证据来自工具结果；措辞为「建议排查/待复核」，禁止确诊结论；`needsPhysicianReview=true`；附 evidence 与免责声明。
- **pharmacistRole**：生成**用药审方/处方草稿**（kind=`prescription`）；核对过敏、相互作用；`isOutOfHospitalPrescription=false`；`needsPhysicianReview=true`；禁止直接开具在院医嘱；附风险提示与免责声明。
- 四角色审计透传 `traceId` 与自身 `actorRole`；`safeLlm` 降级时审计归属正确（记录 `degradedLlm: true`）。

## 6. 工具注册表（tools/）

```ts
export interface ToolDescriptor {
  name: string;                 // 规范驼峰名
  aliases: string[];            // 旧下划线别名兼容
  description: string;
  run(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult>;
}
export interface ToolResult {
  success: boolean;
  evidence: EvidenceItem[];
  summary: string;
  errorClass: string | null;
}
export interface ToolContext { traceId: string; memory: ConsultProfileMemory; }

export class ToolRegistry {
  register(descriptor: ToolDescriptor): void;
  resolve(name: string): ToolDescriptor | null;   // 驼峰名与下划线别名均可解析
  normalizeArgs(raw: Record<string, unknown>): Record<string, unknown>; // 下划线键转驼峰、剔未知键
  async invoke(name: string, rawArgs: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult>;
  list(): Array<{ name: string; description: string; aliases: string[] }>;
}
```

内置工具（确定性 DEMO 返回，不联网）：

| 规范名 | 别名 | 职责 |
|---|---|---|
| `searchKnowledgeBase` | `search_knowledge_base` | 知识库检索（demo 命中健康科普条目） |
| `lookupDrug` | `lookup_drug` | 药品说明书/适应证/禁忌 demo 摘要 |
| `checkAllergy` | `check_allergy` | 过敏史核对（读画像） |
| `checkInteraction` | `check_interaction` | 相互作用提示 demo 规则 |
| `retrievePatientHistory` | `retrieve_patient_history` | 既往病史 demo 读取 |

`evidenceExtractor.ts`：从工具返回抽取 `EvidenceItem[]`，按 kind 分类；空结果给空数组。工具审计只留 `name/status/durationMs/evidenceCount/errorClass/summary`，**不记录原始入参明文**。

## 7. 记忆（memory/）

- `shortTermMemory`：`recentMessages(history, n=20)` 滑窗；`checkpoint(threadId, messages)` 供 DEMO 运行时使用。
- `profileMemory`：`upsertFact(userId, fact)`、`listFacts(userId)`、`mergeFacts(existing, updates)`；DEMO_MODE 走 `sessionRuntime` 进程内 Map；非 DEMO 由 `consultAgentRepo` 落 `consult.profile_memory`。事实键例：`allergy`、`chronic_condition`、`drug_intolerance`、`preferred_language`。

## 8. Sentinel 审批网关（sentinel/）

```ts
export interface SentinelDecision {
  decision: 'approved' | 'duplicate' | 'rejected';
  draftHash: string;
  reason?: string;
  existingDraftId?: string;
}
export function approveDraft(
  draft: ConsultDraft,
  approvedHashes: Map<string, string>, // draftHash -> draftId
): SentinelDecision;
```
- `draftHash.ts`：对**稳定业务字段**（`kind/title/summary/content/evidence/needsPhysicianReview/isOutOfHospitalPrescription`）做规范化序列化（键排序、evidence 排序、去除空白差异）后 SHA-256 十六进制；**剔除** `id/status/reviewerId/reviewedAt/reviewNote/createdAt/updatedAt/draftHash`。
- 同线程同哈希已审批 → `duplicate`，返回既有草稿，不重复审批、不重复落库。
- 缺证据、安全等级 `acute`、违背红线 → `rejected`。
- 其余 `approved`。

## 9. LLM 端口（llm/safeLlm.ts）

```ts
export interface SafeLlmPort {
  isAvailable(): boolean;
  complete(prompt: string, role: RoleKind): Promise<{ text: string; degraded: boolean }>;
}
export function createSafeLlm(): SafeLlmPort;
```
- 凭证仅来自 `process.env`：`ANTHROPIC_API_KEY`、`OPENAI_API_KEY`、`DEEPSEEK_API_KEY` 任一非空视为可用；当前实现**不发起网络请求**，直接走角色确定性模板（保持不联网、不产生临床结论），`degraded: true`。
- 无凭证 → 同样确定性引导文案，`degraded: true`。所有降级文案带免责声明。

## 10. 编排器（consultOrchestrator.ts）

```ts
export interface OrchestratorResult {
  thread: ConsultThread;
  message: ConsultMessage;
  draft: ConsultDraft | null;
  audit: ConsultAuditEntry[];
  events: SseEvent[];
}
export async function handleConsultMessage(
  threadId: string,
  userText: string,
  ctx: OrchestratorContext,
): Promise<OrchestratorResult>;
```

`OrchestratorContext`：`{ userId: string; traceId: string; repo: ConsultAgentPort; llm: SafeLlmPort; tools: ToolRegistry; profile: ConsultProfileMemory }`。

流程（顺序固定，禁止跳过安全旁路）：
1. 装载线程与历史；线程终态拒绝新消息（409/400 由 BFF 判定）。
2. `evaluateSafety(userText)`：`acute` → 状态转 `escalated`，发急症引导系统/assistant 消息，审计 `acute_bypass`，事件 `safety:acute`，**不进入角色编排、不产草稿**，直接返回。
3. `classifyIntent`；`exit` → 关闭线程，返回退出确认。
4. Supervisor 分诊选角色；Examiner 追问 → `clarifying`；Doctor/Pharmacist 产出草稿 → Sentinel 审批 → `drafting` → `review_pending`。
5. 工具调用在角色内完成；审计记录工具摘要。
6. 记忆事实合并；持久化消息/草稿/审计（DEMO_MODE 落进程内存）。
7. 组装 `events`（delta/tool/safety:acute/draft/disclaimer/meta/done）。

## 11. SSE 事件契约（前后端一致）

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

SSE 帧格式：`data: {json}\n\n`，结束帧 `data: [DONE]\n\n`；响应头复用 `SSE_HEADERS` 范式（`Content-Type: text/event-stream; charset=utf-8`、`Cache-Control: no-cache, no-transform`、`Connection: keep-alive`、`X-Accel-Buffering: no`）。流路由不消费 `Idempotency-Key`。

## 12. BFF 端点（前缀 `/api/v1/consult-agent`，共 12 个 handler 覆盖 11 项能力）

响应封装：`import { type Ctx, json, ok, fail, ErrorCode, type RouteDef } from '../types.js'`；成功 `json(ok(payload, 'ok', c.traceId))`；失败 `json(fail(ErrorCode.X, 'msg', c.traceId), status)`。
写操作三件套：`requirePermissionCode(c, code)` + `auditOperation(c)`（fire-and-forget）+ `withIdempotency`（`Idempotency-Key` 头，8–200 字符；无头不改变行为）。

| # | Method | Path | 权限码 | 幂等 | 审计 | 说明 |
|---|---|---|---|---|---|---|
| 1 | POST | `/threads` | `consult-agent:write` | 是 | 是 | 创建会话（可带首条消息）；返回 `{ thread, messages, draft? }` |
| 2 | GET | `/threads` | `consult-agent:read` | – | – | 会话列表 `{ threads: ConsultThread[] }` |
| 3 | POST | `/threads/:threadId/messages` | `consult-agent:write` | 是 | 是 | 发送消息（非流式快照）；返回 `{ thread, message, draft?, events? }` |
| 4 | GET | `/threads/:threadId/messages` | `consult-agent:read` | – | – | 历史消息 `{ messages: ConsultMessage[] }` |
| 5 | POST | `/threads/:threadId/transcribe` | `consult-agent:write` | 是 | 是 | 语音转写 DEMO：归一化文本；返回 `{ text, message? }` |
| 6 | GET | `/threads/:threadId/audit` | `consult-agent:audit` | – | – | 审计轨迹 `{ entries: ConsultAuditEntry[] }` |
| 7 | GET | `/rules/snapshot` | `consult-agent:read` | – | – | 规则快照 `{ version, disclaimer, acuteKeywords, tools, permissions }` |
| 8 | POST | `/threads/:threadId/stream` | `consult-agent:write` | 否 | 是 | SSE 实时流式（body `{ content }`）；逐帧 delta/tool/safety:acute/draft/disclaimer/meta/done |
| 9 | GET | `/threads/:threadId/stream/replay` | `consult-agent:read` | – | – | SSE 回放历史事件（按时间顺序重放持久化事件） |
| 10 | GET | `/threads/:threadId/drafts/:kind` | `consult-agent:read` | – | – | 草稿查询 `{ draft: ConsultDraft \| null }`，kind ∈ diagnosis/prescription |
| 11 | GET | `/profile` | `consult-agent:read` | – | – | 画像 `{ facts: ProfileFact[] }` |
| 12 | POST | `/threads/:threadId/exit` | `consult-agent:write` | 是 | 是 | 退出/关闭会话；返回 `{ thread }` |

权限登记（`src/bff/permissions.ts` 末尾追加，不改既有段）：

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

路由挂载（`src/bff/server.ts`）：顶部 `import { consultAgentRoutes } from './routes/consultAgentRoutes.js';`，在 `allRoutes` 数组末尾 `...consultAgentRoutes,`。

仓储 `src/db/repositories/consultAgentRepo.ts`：提供线程/消息/文档/草稿/审计/画像的 `create/list/get/update`；`DEMO_MODE=1` 时短路到 `runtime/sessionRuntime` 进程内存，不连库；字段驼峰、`mapRow` 蛇形转驼峰；签名风格对齐 `consultRequestRepo.ts`。

## 13. 迁移 DDL（`deploy/postgres/init/`，编号 **380–385**，schema `consult`）

> 实测更正：本地主干迁移真实最大编号为 **371**（基线档案 §4.7「止于 99」系误记）；100–105 前缀已被既有跟踪文件占用，旧沙箱 372–377 按禁令不复用。故 consult 六表落于空闲段 **380–385**（loader `src/db/migrate.ts` 按数字前缀排序）。

- `380-consult-threads.sql`：`consult.threads`（列对齐 §1.2；`status/intent/safety_level` CHECK；`meta jsonb`；`set_updated_at()` 触发器；索引 `(user_id, updated_at DESC)`；`closed_at`；`user_id uuid REFERENCES iam.users(id)`；`patient_id uuid REFERENCES clinical.patients(id)` 可空）。
- `381-consult-messages.sql`：`consult.messages`（`thread_id` FK CASCADE；`role/intent/role_kind/tool_calls/tool_name/safety_level/disclaimer/trace_id`；索引 `(thread_id, created_at ASC)`）。
- `382-consult-documents.sql`：`consult.documents`（`thread_id` FK；`message_id` 可空 FK messages；`extracted_evidence jsonb`；`size_bytes bigint`）。
- `383-consult-drafts.sql`：`consult.diagnosis_prescription_drafts`（`kind CHECK ('diagnosis','prescription')`；`needs_physician_review boolean NOT NULL DEFAULT true CHECK (needs_physician_review = true)`；`is_out_of_hospital_prescription boolean NOT NULL DEFAULT false CHECK (is_out_of_hospital_prescription = false)`；`status CHECK ('pending_review')`；`evidence jsonb`；`draft_hash text NOT NULL`；索引 `(thread_id, kind)`；唯一 `(thread_id, kind, draft_hash)`；`reviewer_id uuid REFERENCES iam.users(id)` 可空）。
- `384-consult-audit-trail.sql`：`consult.audit_trail`（`thread_id` FK；`actor_role/action/tool_name/tool_status/duration_ms/evidence_count/error_class/trace_id/detail jsonb`；索引 `(thread_id, created_at ASC)`、`(trace_id)`）。
- `385-consult-profile-memory.sql`：`consult.profile_memory`（`user_id text`；`thread_id` 可空 FK SET NULL；`facts jsonb`；`UNIQUE(user_id)`；`updated_at`）。

DDL 规范对齐 `99-nursing-risk-warning.sql`：`CREATE TABLE IF NOT EXISTS`、`uuid PRIMARY KEY DEFAULT gen_random_uuid()`、`jsonb`、`created_at/updated_at timestamptz DEFAULT now()`、`DROP TRIGGER IF EXISTS` + `CREATE TRIGGER ... public.set_updated_at()`、头部注释含医疗安全红线/权限码/幂等说明/Copyright。末段幂等写入 `iam.permissions` 三条权限码与角色授权（admin 全量；doctor read+write；nurse read；audit 仅 admin），`ON CONFLICT (code) DO NOTHING` / `WHERE NOT EXISTS`。

## 14. 前端契约

### 14.1 服务层 `web/src/services/api/consultAgent.ts`

- `import { get, post } from '../request'`；SSE 用原生 `fetch(env.apiBaseUrl + ...)`，携带 `Authorization: Bearer token` 与 `X-CSRF-Token`。
- 视图类型与 §1 对齐（可省略非展示字段但不得改名）；SSE handler：`onDelta / onTool / onAcute / onDraft / onDisclaimer / onMeta / onDone / onError`。
- 函数：`createThread(input)`、`listThreads()`、`sendMessage(threadId, content)`、`listMessages(threadId)`、`transcribe(threadId, payload)`、`listAudit(threadId)`、`getRulesSnapshot()`、`streamReply(threadId, content, handlers, signal?)`、`replayEvents(threadId, handlers, signal?)`、`getDraft(threadId, kind)`、`getProfile()`、`exitThread(threadId)`。
- 请求路径：baseURL 已含 `/api/v1`，服务层相对路径如 `/consult-agent/threads`；SSE fetch 拼接 `${env.apiBaseUrl}/consult-agent/...`。错误经 `onError` 上报，禁止本地编造回复。

### 14.2 页面 `web/src/pages/consult-agent/ConsultAgentChatPage.tsx`

- `PageContainer` + `usePageTitle`；antd 组件（Card/Input/List/Tag/Spin/Button/Alert/Collapse 等）；深海蓝 `#0B3D6B`、辅助背景 `#E8F0F8`。
- 左侧会话列表（新建/切换）；右侧消息流：用户右对齐深蓝、角色回复左对齐白底；工具消息折叠卡片（仅工具名+摘要，不展示原始入参）；急症 `safety:acute` 红色 Alert 常驻提示；草稿面板展示诊断/处方草稿，徽章「需执业医师复核」「非院外处方」；**免责声明常驻页面底部与每条 assistant 回复下方**。
- 顶部状态/角色标签；退出会话按钮调 `exitThread`。

### 14.3 路由注册 `web/src/router/index.tsx`

- `const ConsultAgentChatPage = lazy(() => import('@/pages/consult-agent/ConsultAgentChatPage'));`
- 在 `AuthGuard` 包裹的路由组内注册：
  `<Route path="consult-agent/chat" element={<RequirePermission permission="consult-agent:read"><ConsultAgentChatPage /></RequirePermission>} />`

## 15. 合规红线（逐条落码并自检）

1. 新增交付树内旧称（`杠OS`、`健澜科技杠OS`、`Gang-OS`、`jianlan-gang-os`、`gang-os`，含大小写/连字符变体）**零命中**；产品名仅用「健澜AI原生医院操作系统OS」。
2. 急症 `ESCALATED` 旁路优先于角色编排；SSE 可下发 `safety:acute` 帧；免责声明常驻前端与回复载荷。
3. 诊断/处方草稿 `needsPhysicianReview: true`；处方 `isOutOfHospitalPrescription: false`（zod 字面量强制）；AI 不自主开医嘱、不直接产出在院事务。
4. 写操作三件套：权限码 + 审计留痕 + `Idempotency-Key` 幂等校验。
5. 工具调用审计只留工具名/状态/耗时/证据数/错误分类，**不回显原始入参明文**。
6. 角色 `safeLlm` 降级时审计归属正确；四角色审计透传 `traceId`。
7. LLM 凭证仅取 `process.env`；无凭证确定性降级；不联网、不产生临床结论。
8. 不改动主干历史文件旧称（`package.json`/README 历史遗留），仅保证 consult 新增代码零旧称；遗留旧称清单写入交付报告。

## 16. 静态门禁（PowerShell，每个分片自测，F 分片全量收口）

```powershell
# 根类型检查（含 src + tests，strict）
node_modules\.bin\tsc.cmd --noEmit            # exit 0
# 新增改动 ESLint（import 排序、T[] 而非 Array<T>、消除 await-thenable 等）
node_modules\.bin\eslint.cmd <新增文件...> --max-warnings 0
# Prettier 新增文件
node_modules\.bin\prettier.cmd --check <新增文件...>
# 测试（bun 绝对路径）
& "C:\Users\lenovo\.bun\bin\bun.exe" test tests/unit/consult-agent tests/security/consult-agent tests/integration/consult-agent
```

- 测试范式：`import { describe, expect, it } from 'bun:test'`；相对路径 `../../src/...`；纯函数直接断言；路由用最小 fake Ctx（参考 `tests/integration/inpatient-routes.test.ts` 的 `makeCtx`）。
- `DEMO_MODE=1` 跳过真实 DB；无 LLM 凭证走确定性引导文案。
- 不得用估算覆盖率充数；本机环境跑不通的项在报告如实标注缺口，禁止伪造通过。

## 17. 提交与推送（仅 G 分片执行，其余分片不得提交/推送）

- 工作区既有改动 `probe_m416.txt`、`web/src/store/cdrQueryV2M636Store.ts` 保持原样、**不纳入提交**；约 730 个未跟踪过程日志/探针 txt 一律不 `git add`。
- 提交身份固定 `chenweidaben <chenweidaben@users.noreply.github.com>`。
- conventional commit 分组：`feat(consult-agent):` 源码、`test(consult-agent):` 测试、`docs(consult-agent):` 文档/里程碑、`chore(consult-agent):` 过程脚本；只显式 add consult 新增文件与目录。
- 推送范围：**仅 GitCode 两仓**——`gitcode`（JLMEDAIOS，master，普通 fast-forward，不用 force）；`heagentos`（HEAGENTOS，main，force-main 覆盖占位 README）。**GitHub `mirror` 本次一律不推；`origin` 内嵌 token 禁止沿用/回显/写入新配置。**
- 推送前 `--dry-run` 预检；推送后 `git ls-remote` 把本地 HEAD SHA 与两个远端 SHA **逐位比对**；不一致即停止、报告，不重复 force。
