/**
 * 健澜AI原生医院操作系统OS - bff/agents/outpatient/types.ts
 *
 * 门诊病历智能体（S-09）场景类型契约：意图分流、对话归一、质控发现、草稿 Schema、
 * 人工确认决策与运行结果。纯类型定义，不依赖数据库、网络与真实模型。
 *
 * 技术文档 4.2 门诊病历智能体；差距矩阵 C-01 / S-09。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import type { EvidenceLevel, FactSnapshot, OutboundVerdict } from '@/security/ai/types.js';
import type { guardOutbound } from '@/security/ai/outputGuard.js';
import type { Citation } from '@/knowledge-platform/citation/citationProtocol.js';

// ============================================================================
// 意图与就诊类型
// ============================================================================

/** 就诊类型：初诊 / 复诊 */
export type EncounterKind = 'initial' | 'follow-up';

/** 对话意图：初诊 / 复诊 / 复诊续方 / 检验解读 */
export type IntentClass = 'initial' | 'follow-up' | 'renewal' | 'lab-review';

/** 说话人（ASR 说话人分离占位；供应商对接归后续批次） */
export type Speaker = 'patient' | 'doctor' | 'system';

/** 原始对话分段（语音转写文本 + 说话人标记） */
export interface DialogueSegment {
  speaker: Speaker;
  text: string;
  order: number;
  timestamp?: string;
}

// ============================================================================
// 对话归一结果
// ============================================================================

/** 归一后的单段文本（去口语化、术语展示归一） */
export interface NormalizedSegment {
  speaker: Speaker;
  text: string;
  order: number;
  normalizedText: string;
  sourceSegment: number;
}

/** 时间线事件（相对时间词解析为日期后挂入时间线） */
export interface TimelineEvent {
  date: string;
  summary: string;
  sourceSegment: number;
}

/** 归一结果：分段、时间线、缺失要素清单 */
export interface NormalizedDialogue {
  segments: NormalizedSegment[];
  timeline: TimelineEvent[];
  missingElements: string[];
}

// ============================================================================
// 草稿 Schema（对齐技术文档 4.2.5 输出 Schema）
// ============================================================================

/** 诊断方向确定性口径（不使用确定性结论表述） */
export type DiagnosisCertainty = 'likely' | 'possible' | 'differential';

/** 诊断条目 */
export interface DiagnosisEntry {
  code: string;
  name: string;
  certainty: DiagnosisCertainty;
}

/** 建议类别：检查 / 用药 / 转诊 / 随访 */
export type SuggestionKind = 'exam' | 'medication' | 'referral' | 'follow-up';

/** 建议条目；exam / medication 必须挂引用编号 */
export interface SuggestionEntry {
  kind: SuggestionKind;
  content: string;
  citations: string[];
  basisNote: string;
}

/** 门诊病历草稿（结构化输出载荷） */
export interface OutpatientRecordDraft {
  encounterKind: EncounterKind;
  chiefComplaint: string;
  presentIllness: string;
  historyIllness: string;
  physicalExam: string;
  auxiliaryExams: string;
  diagnosis: DiagnosisEntry[];
  suggestions: SuggestionEntry[];
  missingInfo: string[];
  citations: Citation[];
  evidenceLevel: EvidenceLevel;
}

// ============================================================================
// 实时质控发现
// ============================================================================

/** 质控规则编号（4.2.3 qc-realtime 五条规则） */
export type QcRuleId =
  | 'chief-complaint-correspondence'
  | 'timeline-consistency'
  | 'icd-diagnosis-medication-match'
  | 'copy-paste-detection'
  | 'element-completeness';

/** 质控严重度（与 S-01 发现严重度口径对齐） */
export type QcSeverity = 'info' | 'caution' | 'block';

/** 单条质控发现 */
export interface QcFinding {
  rule: QcRuleId;
  severity: QcSeverity;
  message: string;
  excerpt?: string;
  suggestion?: string;
}

// ============================================================================
// 人工确认与运行结果
// ============================================================================

/** 人工确认决策：采纳 / 修改 / 拒绝 / 多轮退回 */
export type HumanReviewDecision = 'adopted' | 'modified' | 'rejected' | 'returned-for-revision';

/** 人工确认结果（注入式，离线运行器不挂接真实工作台） */
export interface HumanReviewResult {
  decision: HumanReviewDecision;
  reviewerRole: string;
  comment?: string;
  modifiedDraft?: OutpatientRecordDraft;
}

/** 审计条目（四维留痕字段口径对齐 S-08；不接 DB，仅进程内存台账） */
export interface OutpatientAuditEntry {
  timestamp: string;
  agentId: string;
  agentVersion: string;
  patientId?: string;
  visitId?: string;
  action: string;
  detail: string;
  toolCalls?: string[];
}

/** 运行终态：完成 / 两次修订后挂起 / 阻断 / 拒绝 */
export type OutpatientRunStatus = 'completed' | 'revised-twice-and-held' | 'blocked' | 'rejected';

/** 门诊智能体运行结果 */
export interface OutpatientRunResult {
  status: OutpatientRunStatus;
  draft?: OutpatientRecordDraft;
  qcFindings: QcFinding[];
  guardVerdict?: OutboundVerdict;
  review?: HumanReviewResult;
  auditTrail: OutpatientAuditEntry[];
  events: string[];
}

// ============================================================================
// 工作流入参与适配器口径
// ============================================================================

/** 调用者身份（RBAC 会话真实解析归 BFF 鉴权后续批次；本切片由入参传入） */
export interface OutpatientActor {
  userId: string;
  role: string;
  department: string;
}

/** 工作流输入（离线合成夹具；患者标识使用 patient-demo-xxx 占位） */
export interface OutpatientWorkflowInput {
  traceId: string;
  agentId: string;
  agentVersion: string;
  actor: OutpatientActor;
  patientId?: string;
  visitId?: string;
  encounterDate?: string;
  department: string;
  dialogue: DialogueSegment[];
  facts: FactSnapshot;
  ragEvidence?: Citation[];
  patientProfile?: Record<string, unknown>;
  /** 预注入人工决策（离线运行器；真实工作台归后续批次） */
  review?: HumanReviewResult;
  /** 医师知情同意确认；写路径工具校验口径 */
  consentConfirmed?: boolean;
  queryText?: string;
}

/** 工具适配器接口（真实工具注册表接线归后续批次；未注入时返回空合成占位） */
export interface OutpatientToolAdapter {
  call(toolId: string, args: Record<string, unknown>): Promise<Record<string, unknown>>;
}

/** 模型适配器接口（真实 LLM 接线归后续批次；未注入时由规则骨架装配草稿） */
export interface OutpatientModelAdapter {
  generateDraft(input: Record<string, unknown>): Promise<unknown>;
}

/** 运行器依赖注入项 */
export interface OutpatientWorkflowDeps {
  toolAdapter?: OutpatientToolAdapter;
  modelAdapter?: OutpatientModelAdapter;
  guard?: typeof guardOutbound;
  auditSink?: (entry: OutpatientAuditEntry) => void;
}
