/**
 * consult-agent M86 核心包聚合导出（契约 §0 index.ts）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * BFF 仓储分片、路由分片与前端服务层仅从本聚合入口导入公共符号；
 * 核心包不引用 BFF 路由、前端或迁移，保持自包含、可单测。
 */

// ---- 类型 / zod schema / 常量 / SSE 事件（契约 §1 / §11）----
export * from './types';

// ---- 端口契约（契约 §5 / §6 / §7 / §10）----
export type { ConsultAgentPort, RoleInput, RoleOutput, RolePort } from './ports';

// ---- 状态机（契约 §2）----
export {
  assertTransition,
  canTransition,
  isTerminalStatus,
  THREAD_TRANSITIONS,
} from './stateMachine';

// ---- 意图分类（契约 §3）----
export { classifyIntent, type IntentResult } from './intentClassifier';

// ---- 草稿哈希（契约 §8）----
export { computeDraftHash, extractStableFields, type StableDraftFields } from './draftHash';

// ---- 角色共享支撑工具 ----
export {
  appendDisclaimer,
  confidenceLevel,
  makeEvidence,
  newId,
  normalizeText,
  nowIso,
  roleDisplayName,
} from './roleSupport';

// ---- Supervisor 分诊（契约 §0 supervisor.ts）----
export { isSufficientForDoctor, routeNextRole, type TriageContext } from './supervisor';

// ---- 编排器（契约 §10）----
export {
  handleConsultMessage,
  type OrchestratorContext,
  type OrchestratorResult,
} from './consultOrchestrator';

// ---- 角色注册表与四角色实现（契约 §5）----
export {
  buildRoleRegistry,
  DoctorRole,
  ExaminerRole,
  getRolePort,
  PharmacistRole,
  type RoleRegistry,
  SupervisorRole,
} from './roles';

// ---- 审计（契约 §0 audit/index.ts）----
export {
  type AuditEntryParams,
  createAuditEntry,
  createToolCallRecord,
  redactRawArgs,
} from './audit';

// ---- 安全降级 LLM（契约 §9）----
export { createSafeLlm, type SafeLlmPort } from './llm/safeLlm';

// ---- 双层记忆（契约 §7）----
export {
  createProfileMemory,
  extractFactsFromText,
  listFacts,
  mergeFacts,
  upsertFact,
} from './memory/profileMemory';
export { checkpoint, type MemoryCheckpoint, recentMessages } from './memory/shortTermMemory';

// ---- DEMO 进程内运行时（契约 §0 runtime/sessionRuntime.ts）----
export {
  createDemoRuntime,
  type CreateThreadParams,
  isDemoMode,
  SessionRuntime,
} from './runtime/sessionRuntime';

// ---- 安全词表与安全门（契约 §4）----
export { ACUTE_KEYWORDS, type AcuteDetectionResult, detectAcute } from './safety/acuteVocabulary';
export { evaluateSafety, type SafetyVerdict } from './safety/safetyGate';

// ---- Sentinel 审批网关（契约 §8）----
export {
  approveDraft,
  type SentinelApproveOptions,
  type SentinelDecision,
} from './sentinel/sentinelGateway';

// ---- 工具注册表与证据抽取（契约 §6）----
export { classifyKind, extractEvidence, type RawEvidenceEntry } from './tools/evidenceExtractor';
export {
  createDefaultToolRegistry,
  type ToolContext,
  type ToolDescriptor,
  type ToolListing,
  ToolRegistry,
  type ToolResult,
} from './tools/toolRegistry';

// ---- DEMO 种子与规则快照（契约 §0 demo/demoSeed.ts）----
export {
  buildRulesSnapshot,
  BUILTIN_TOOL_META,
  CONSULT_PERMISSIONS,
  DEMO_GREETING,
  ROLE_GUIDANCE,
  type RulesSnapshot,
  SAMPLE_DRUG_FACTS,
  SAMPLE_KNOWLEDGE,
} from './demo/demoSeed';
