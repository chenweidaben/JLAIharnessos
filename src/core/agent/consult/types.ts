/**
 * consult-agent M86 核心类型与 zod 校验 schema（契约 §1 单一事实来源）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 本模块集中定义在线咨询智能体的全部枚举、实体接口、入参/草稿 zod 校验 schema、
 * 安全常量与 SSE 事件类型；核心包其余模块仅从本模块导入类型，不得另立字段名。
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// 1.1 枚举（联合字面量类型，禁止运行时反向枚举）
// ---------------------------------------------------------------------------

/** 角色标识：分诊主管 / 问诊追问 / 医师 / 药师 */
export type RoleKind = 'supervisor' | 'examiner' | 'doctor' | 'pharmacist';

/** 会话线程状态机状态（契约 §2） */
export type ThreadStatus =
  | 'idle'
  | 'collecting'
  | 'clarifying'
  | 'drafting'
  | 'review_pending'
  | 'escalated'
  | 'closed'
  | 'aborted';

/** 用户意图分类结果（契约 §3） */
export type IntentKind =
  | 'greeting'
  | 'symptom_report'
  | 'clarification_answer'
  | 'medication_question'
  | 'chronic_management'
  | 'acute_emergency'
  | 'document_upload'
  | 'exit'
  | 'unknown';

/** 安全等级：正常 / 需谨慎提示 / 急症旁路 */
export type SafetyLevel = 'normal' | 'caution' | 'acute';

/** 消息发言方 */
export type MessageRole = 'user' | 'assistant' | 'tool' | 'system';

/** AI 草稿类型：诊断建议草稿 / 用药建议草稿 */
export type DraftKind = 'diagnosis' | 'prescription';

/** AI 草稿恒为待医师复核，不产生 approved/rejected AI 态 */
export type DraftStatus = 'pending_review';

/** 工具调用状态 */
export type ToolStatus = 'success' | 'error' | 'skipped';

// ---------------------------------------------------------------------------
// 1.2 实体接口
// ---------------------------------------------------------------------------

/** 证据条目：知识 / 药品 / 过敏 / 相互作用 / 病史 / 文档 */
export interface EvidenceItem {
  kind: 'knowledge' | 'drug' | 'allergy' | 'interaction' | 'history' | 'document';
  label: string;
  source: string;
  snippet: string;
}

/** 咨询会话线程 */
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

/** 工具调用审计记录：仅留脱敏摘要，禁止保存原始入参明文（契约 §6 / §15-5） */
export interface ToolCallRecord {
  callId: string;
  name: string;
  status: ToolStatus;
  durationMs: number;
  evidenceCount: number;
  errorClass: string | null;
  summary: string | null;
}

/** 咨询消息 */
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

/** 用户上传文档及其抽取证据 */
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

/** AI 草稿：诊断建议 / 用药建议，红线字面量由 zod 强校验（契约 §15-3） */
export interface ConsultDraft {
  id: string;
  threadId: string;
  kind: DraftKind;
  title: string;
  summary: string;
  content: string;
  evidence: EvidenceItem[];
  /** 恒为 true：AI 草稿必须经执业医师复核 */
  needsPhysicianReview: true;
  /** 恒为 false：AI 不开具院外处方 */
  isOutOfHospitalPrescription: false;
  status: DraftStatus;
  draftHash: string;
  reviewerId: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 审计条目：actorRole + traceId 全程透传（契约 §15-6） */
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
  /** 脱敏后的结构化摘要，禁止原始入参明文 */
  detail: Record<string, unknown>;
  createdAt: string;
}

/** 画像事实条目 */
export interface ProfileFact {
  key: string;
  value: string;
  source: string;
  updatedAt: string;
}

/** 长期画像记忆 */
export interface ConsultProfileMemory {
  id: string;
  userId: string;
  threadId: string | null;
  facts: ProfileFact[];
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// 1.3 zod schema（BFF 入参 / 草稿校验用，类型与上方接口一致）
// ---------------------------------------------------------------------------

/** 证据条目 schema */
export const evidenceSchema = z.object({
  kind: z.enum(['knowledge', 'drug', 'allergy', 'interaction', 'history', 'document']),
  label: z.string().min(1).max(200),
  source: z.string().min(1).max(200),
  snippet: z.string().min(1).max(2000),
});

/** 创建会话入参 schema */
export const threadCreateSchema = z.object({
  title: z.string().max(120).optional(),
  patientId: z.string().uuid().nullish(),
  initialMessage: z.string().max(2000).optional(),
});

/** 发送消息入参 schema */
export const messageSendSchema = z.object({
  content: z.string().trim().min(1).max(4000),
});

/** 语音转写入参 schema：transcript 与 audioText 至少其一非空 */
export const transcribeSchema = z
  .object({
    transcript: z.string().max(4000).optional(),
    audioText: z.string().max(4000).optional(),
  })
  .refine(
    (value) => {
      const transcript = value.transcript?.trim();
      const audioText = value.audioText?.trim();
      return (transcript?.length ?? 0) > 0 || (audioText?.length ?? 0) > 0;
    },
    { message: 'transcript 与 audioText 至少其一非空' },
  );

/**
 * 草稿 schema：红线字面量强校验
 * - needsPhysicianReview 必须为 true；
 * - isOutOfHospitalPrescription 必须为 false；
 * - status 必须为 pending_review。
 */
export const draftSchema = z.object({
  id: z.string().min(1),
  threadId: z.string().min(1),
  kind: z.enum(['diagnosis', 'prescription']),
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(1000),
  content: z.string().min(1).max(8000),
  evidence: z.array(evidenceSchema),
  needsPhysicianReview: z.literal(true),
  isOutOfHospitalPrescription: z.literal(false),
  status: z.literal('pending_review'),
  draftHash: z.string().min(1),
  reviewerId: z.string().nullish(),
  reviewedAt: z.string().nullish(),
  reviewNote: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ---------------------------------------------------------------------------
// 1.4 安全常量（契约 §1.4，免责声明常驻回复载荷与页面底部）
// ---------------------------------------------------------------------------

/** 常驻免责声明：每条 assistant 回复与草稿均须附带 */
export const DISCLAIMER =
  '本回复由 AI 辅助生成，仅供健康科普与就诊参考，不能替代执业医师/药师的面对面诊断与处方决策；如有急症请立即拨打 120 或前往最近急诊。';

/** 急症旁路引导文案：仅用于向急救人员描述情况，不构成诊断 */
export const ACUTE_GUIDANCE =
  '检测到可能的急症信号：请立即停止自助问诊，前往最近医疗机构急诊或拨打 120；以下信息仅用于向急救人员描述情况，不构成诊断。';

// ---------------------------------------------------------------------------
// 11. SSE 事件契约（前后端一致，契约 §11）
// ---------------------------------------------------------------------------

export type SseEvent =
  | { type: 'delta'; text: string }
  | {
      type: 'tool';
      stage: 'start' | 'end';
      callId: string;
      toolName: string;
      success: boolean;
      summary?: string;
      evidenceCount?: number;
    }
  | { type: 'safety:acute'; matched: string[]; guidance: string }
  | { type: 'draft'; draft: ConsultDraft }
  | { type: 'disclaimer'; text: string }
  | { type: 'meta'; confidence: 'high' | 'medium' | 'low'; disclaimer: string }
  | { type: 'done'; messageId: string }
  | { type: 'error'; code: string; message: string };
