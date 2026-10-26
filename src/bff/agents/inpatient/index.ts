/**
 * 健澜AI原生医院操作系统OS - bff/agents/inpatient/index.ts
 *
 * 住院病历智能体（S-10）统一出口。与 S-09 门诊包同名的人工确认 / 建议条目类型
 * 以 Inpatient 前缀别名导出，避免桶文件跨包符号歧义；门诊、住院两套 Schema 各自独立。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

// 类型契约（与门诊同名类型以 Inpatient 前缀别名暴露）
export type {
  ClinicalDiagnosisEntry,
  ConfirmRole,
  ConditionOnDischarge,
  ConsistencyFinding,
  ConsistencyRuleId,
  ConsistencySeverity,
  DischargeDiagnosisEntry,
  DischargeRecord,
  DischargeRelation,
  DocumentSections,
  DocumentType,
  FollowUpEntry,
  InpatientActor,
  InpatientAuditEntry,
  InpatientDraft,
  InpatientModelAdapter,
  InpatientRunResult,
  InpatientRunStatus,
  InpatientToolAdapter,
  InpatientWorkflowDeps,
  InpatientWorkflowInput,
  ParsedVital,
  ScheduleContext,
  ScheduleReminder,
  ScheduleStatus,
  SeverityLevel,
  TimelineNode,
  VitalFlag,
  VitalsParseResult,
  AdmissionDiagnosisEntry,
} from './types.js';
export type {
  DiagnosisCertainty as InpatientDiagnosisCertainty,
  HumanReviewDecision as InpatientHumanReviewDecision,
  HumanReviewResult as InpatientHumanReviewResult,
  SuggestionEntry as InpatientSuggestionEntry,
  SuggestionKind as InpatientSuggestionKind,
} from './types.js';

// 文书模板、时限规则与时间线折叠
export {
  collapseTimelineForSummary,
  DOCUMENT_TEMPLATES,
  DISCHARGE_DEADLINE_HOURS,
  DUE_SOON_HOURS,
  evaluateSchedule,
  getDocumentTemplate,
  missingDocumentSections,
  reviewRoleFor,
} from './documentTemplates.js';
export type { DocumentTemplate } from './documentTemplates.js';

// 语音体征解析
export { parseVitalsText } from './vitalsParser.js';

// 一致性校验
export { runConsistencyCheck } from './consistencyCheck.js';
export type { ConsistencyContext } from './consistencyCheck.js';

// 出院记录 / 住院草稿 Schema
export {
  buildDischargeRecord,
  buildInpatientDraft,
  deriveInpatientEvidenceLevel,
  validateInpatientDraft,
} from './dischargeSchema.js';
export type {
  DischargeParts,
  InpatientDraftParts,
  InpatientDraftValidation,
} from './dischargeSchema.js';

// 离线工作流运行器
export { runInpatientWorkflow, MAX_REVISIONS as INPATIENT_MAX_REVISIONS } from './inpatientWorkflow.js';
