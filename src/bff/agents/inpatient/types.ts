/**
 * 健澜AI原生医院操作系统OS - bff/agents/inpatient/types.ts
 *
 * 住院病历智能体（S-10）场景类型契约：七类文书、时限规则、语音体征、一致性发现、
 * 出院记录 Schema、人工确认决策与运行结果。纯类型定义，不依赖数据库、网络与真实模型。
 *
 * 技术文档 4.3 住院病历智能体；差距矩阵 C-02 / S-10。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import type { EvidenceLevel, FactSnapshot, OutboundVerdict } from '@/security/ai/types.js';
import type { guardOutbound } from '@/security/ai/outputGuard.js';
import type { Citation } from '@/knowledge-platform/citation/citationProtocol.js';
import type {
  ClinicalInterpretationInput,
  ClinicalInterpretationResult,
} from '../shared/clinicalReportInterpretation.js';

// ============================================================================
// 文书类型与风险分级
// ============================================================================

/** 七类住院文书（4.3.1） */
export type DocumentType =
  | 'admission-record'
  | 'first-progress'
  | 'daily-progress'
  | 'senior-round'
  | 'stage-summary'
  | 'discharge-record'
  | 'comprehensive-analysis';

/** 病情分级（日常病程频次规则使用） */
export type SeverityLevel = 'critical' | 'serious' | 'stable';

/** 时限状态：按时 / 临期 / 逾期 / 缺少上下文 */
export type ScheduleStatus = 'onTime' | 'dueSoon' | 'overdue' | 'missing-context';

/** S-06 确认角色口径（运行时按风险分支选择） */
export type ConfirmRole = 'physician-confirm' | 'expert-review';

// ============================================================================
// 时间线与文书段落
// ============================================================================

/** 住院时间线节点：诊断变更、手术、危急值、过敏史、输血、抢救等关键节点强制保留 */
export interface TimelineNode {
  time: string;
  event: string;
  source: string;
}

/** 文书段落映射（段落名 → 段落文本） */
export type DocumentSections = Record<string, string>;

// ============================================================================
// 诊断与建议条目
// ============================================================================

/** 诊断确定性口径（不使用确定性结论表述） */
export type DiagnosisCertainty = 'likely' | 'possible' | 'differential';

/** 住院过程诊断条目 */
export interface ClinicalDiagnosisEntry {
  code: string;
  name: string;
  certainty: DiagnosisCertainty;
}

/** 建议类别：检查 / 用药 / 转诊 / 随访 / 诊疗方案 */
export type SuggestionKind = 'exam' | 'medication' | 'referral' | 'follow-up' | 'plan';

/** 建议条目；exam / medication 必须挂引用编号 */
export interface SuggestionEntry {
  kind: SuggestionKind;
  content: string;
  citations: string[];
  basisNote: string;
}

// ============================================================================
// 出院记录 Schema（4.3.4，870–883 行字段逐项对齐）
// ============================================================================

/** 入院诊断条目 */
export interface AdmissionDiagnosisEntry {
  code: string;
  name: string;
}

/** 出院诊断与入院诊断的对照关系 */
export type DischargeRelation = 'consistent' | 'adjusted' | 'new';

/** 出院诊断条目 */
export interface DischargeDiagnosisEntry {
  code: string;
  name: string;
  relation: DischargeRelation;
  /** adjusted 时关联的入院诊断编码；new 时记录新增依据说明 */
  relatedAdmissionCode?: string;
  basisNote?: string;
}

/** 出院随访条目 */
export interface FollowUpEntry {
  timing: string;
  advice: string;
}

/** 出院状态枚举（4.3.4） */
export type ConditionOnDischarge =
  | 'cured'
  | 'improved'
  | 'unchanged'
  | 'worsened'
  | 'transferred'
  | 'died';

/** 出院记录结构化载荷 */
export interface DischargeRecord {
  admissionDiagnosis: AdmissionDiagnosisEntry[];
  dischargeDiagnosis: DischargeDiagnosisEntry[];
  treatmentSummary: string;
  conditionOnDischarge: ConditionOnDischarge;
  followUp: FollowUpEntry[];
  dischargeInstructions: string;
  timelineNodes: TimelineNode[];
  citations: Citation[];
  missingInfo: string[];
}

// ============================================================================
// 语音体征解析（4.3.2 voice_to_vitals）
// ============================================================================

/** 体征标记：正常 / 异常 / 危急 / 无法判定 */
export type VitalFlag = 'normal' | 'abnormal' | 'critical' | 'unknown';

/** 结构化体征项（双值体征如血压使用 values[0] / values[1]） */
export interface ParsedVital {
  item: string;
  values: number[];
  rawUnit: string;
  normalizedUnit: string;
  flag: VitalFlag;
  critical: boolean;
  needsManualReview: boolean;
  sourceText: string;
  conversionNote?: string;
}

/** 体征解析结果：识别项、未识别片段与缺项清单 */
export interface VitalsParseResult {
  vitals: ParsedVital[];
  unrecognized: string[];
  missingInfo: string[];
}

// ============================================================================
// 时限规则
// ============================================================================

/** 时限规则上下文（真实院方制度参数校准列入未闭环项） */
export interface ScheduleContext {
  documentType: DocumentType;
  admissionTime?: string;
  currentTime?: string;
  dischargeTime?: string;
  severityLevel?: SeverityLevel;
  lastProgressTime?: string;
  keyEventTime?: string;
}

/** 单条时限提醒 */
export interface ScheduleReminder {
  documentType: DocumentType;
  status: ScheduleStatus;
  rule: string;
  message: string;
  deadline?: string;
}

// ============================================================================
// 一致性校验发现
// ============================================================================

/** 一致性规则编号（4.3.2 consistency-check） */
export type ConsistencyRuleId =
  | 'complaint-diagnosis'
  | 'physical-exam-diagnosis'
  | 'orders-diagnosis'
  | 'exam-result-citation'
  | 'timeline-consistency';

/** 发现严重度（与 S-01 口径子集对齐） */
export type ConsistencySeverity = 'info' | 'caution' | 'block';

/** 单条一致性发现 */
export interface ConsistencyFinding {
  rule: ConsistencyRuleId;
  severity: ConsistencySeverity;
  message: string;
  excerpt?: string;
  suggestion?: string;
}

// ============================================================================
// 住院草稿与运行结果
// ============================================================================

/** 住院病历草稿（覆盖七类文书；出院记录嵌入 discharge 字段） */
export interface InpatientDraft {
  documentType: DocumentType;
  title: string;
  chiefComplaint: string;
  presentIllness: string;
  historyIllness: string;
  physicalExam: string;
  auxiliaryExams: string;
  orders: string;
  nursingNotes: string;
  sections: DocumentSections;
  diagnosis: ClinicalDiagnosisEntry[];
  suggestions: SuggestionEntry[];
  discharge?: DischargeRecord;
  keyNodes: TimelineNode[];
  vitals: ParsedVital[];
  /** 上级查房中是否存在诊疗方案调整建议（high 分支判定依据） */
  treatmentPlanAdjustment: boolean;
  missingInfo: string[];
  citations: Citation[];
  evidenceLevel: EvidenceLevel;
}

/** 人工确认决策四态（与 S-09 口径一致） */
export type HumanReviewDecision = 'adopted' | 'modified' | 'rejected' | 'returned-for-revision';

/** 人工确认结果（注入式，离线运行器不挂接真实工作台） */
export interface HumanReviewResult {
  decision: HumanReviewDecision;
  reviewerRole: ConfirmRole | string;
  comment?: string;
  modifiedDraft?: InpatientDraft;
}

/** 审计条目（四维留痕字段口径对齐 S-08；不接 DB，仅进程内存台账） */
export interface InpatientAuditEntry {
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
export type InpatientRunStatus = 'completed' | 'revised-twice-and-held' | 'blocked' | 'rejected';

/** 住院智能体运行结果 */
export interface InpatientRunResult {
  status: InpatientRunStatus;
  draft?: InpatientDraft;
  consistencyFindings: ConsistencyFinding[];
  scheduleReminders: ScheduleReminder[];
  guardVerdict?: OutboundVerdict;
  review?: HumanReviewResult;
  auditTrail: InpatientAuditEntry[];
  events: string[];
  interpretations: ClinicalInterpretationResult[];
}

// ============================================================================
// 工作流入参与适配器口径
// ============================================================================

/** 调用者身份（RBAC 会话真实解析归 BFF 鉴权后续批次；本切片由入参传入） */
export interface InpatientActor {
  userId: string;
  role: string;
  department: string;
}

/** 工作流输入（离线合成夹具；患者标识使用 patient-demo-xxx 占位） */
export interface InpatientWorkflowInput {
  traceId: string;
  agentId: string;
  agentVersion: string;
  actor: InpatientActor;
  patientId?: string;
  visitId?: string;
  department: string;
  documentType: DocumentType;
  admissionTime?: string;
  currentTime?: string;
  dischargeTime?: string;
  severityLevel?: SeverityLevel;
  lastProgressTime?: string;
  keyEventTime?: string;
  chiefComplaint?: string;
  presentIllness?: string;
  queryText?: string;
  vitalsText?: string;
  facts: FactSnapshot;
  ragEvidence?: Citation[];
  clinicalReports?: ClinicalInterpretationInput[];
  review?: HumanReviewResult;
  consentConfirmed?: boolean;
  /** 预装入参的住院时间线节点（模型 / 工具解析结果由适配器提供，离线夹具可直接传入） */
  timelineNodes?: TimelineNode[];
  orders?: string[];
  examResults?: string[];
  /** 模型 / 规则装配覆盖项（测试与离线骨架使用，不接外部系统） */
  draftOverrides?: Partial<InpatientDraft>;
}

/** 工具适配器接口（真实工具注册表接线归后续批次；未注入时返回空合成占位） */
export interface InpatientToolAdapter {
  call(toolId: string, args: Record<string, unknown>): Promise<Record<string, unknown>>;
}

/** 模型适配器接口（真实 LLM 接线归后续批次；未注入时由规则骨架装配草稿） */
export interface InpatientModelAdapter {
  generateDraft(input: Record<string, unknown>): Promise<unknown>;
}

/** 运行器依赖注入项 */
export interface InpatientWorkflowDeps {
  toolAdapter?: InpatientToolAdapter;
  modelAdapter?: InpatientModelAdapter;
  guard?: typeof guardOutbound;
  auditSink?: (entry: InpatientAuditEntry) => void;
}
