/**
 * 健澜AI原生医院操作系统OS - bff/agents/inpatient/dischargeSchema.ts
 *
 * 住院草稿与出院记录 Schema 校验、装配与证据级别推导（4.3.4 出院记录 Schema）。
 * adjusted / new 诊断必须与入院诊断形成对照关系并留痕；exam / medication 建议必须挂引用编号；
 * 无依据结论追加「（待核实）」；证据级别口径复用 S-12 引用协议。
 *
 * 纯函数离线实现；门诊草稿 Schema 仍由 S-09 模块独立提供，两套类型不互相替代。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { buildNoEvidenceAnswer, type Citation } from '@/knowledge-platform/citation/citationProtocol.js';
import type { EvidenceLevel } from '@/security/ai/types.js';
import type {
  AdmissionDiagnosisEntry,
  ClinicalDiagnosisEntry,
  ConditionOnDischarge,
  DischargeDiagnosisEntry,
  DischargeRecord,
  DocumentSections,
  DocumentType,
  FollowUpEntry,
  InpatientDraft,
  SuggestionEntry,
  SuggestionKind,
  TimelineNode,
} from './types.js';

export interface InpatientDraftValidation {
  valid: boolean;
  draft?: InpatientDraft;
  errors: string[];
}

const DOCUMENT_TYPES: DocumentType[] = [
  'admission-record',
  'first-progress',
  'daily-progress',
  'senior-round',
  'stage-summary',
  'discharge-record',
  'comprehensive-analysis',
];
const CERTAINTIES = ['likely', 'possible', 'differential'] as const;
const SUGGESTION_KINDS: SuggestionKind[] = ['exam', 'medication', 'referral', 'follow-up', 'plan'];
const EVIDENCE_LEVELS: EvidenceLevel[] = ['supported', 'partial', 'none'];
const CONDITIONS: ConditionOnDischarge[] = ['cured', 'improved', 'unchanged', 'worsened', 'transferred', 'died'];
const RELATIONS = ['consistent', 'adjusted', 'new'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** 按引用与缺项清单推导证据级别（口径对齐 S-12） */
export function deriveInpatientEvidenceLevel(citations: Citation[], missingInfo: string[]): EvidenceLevel {
  if (citations.length === 0) return 'none';
  if (missingInfo.length > 0) return 'partial';
  return 'supported';
}

function validateCitation(entry: unknown, path: string, errors: string[]): Citation | null {
  if (!isRecord(entry)) {
    errors.push(`${path} 须为对象`);
    return null;
  }
  const fields: Array<keyof Pick<Citation, 'refId' | 'chunkId' | 'title' | 'sectionPath' | 'sourceName' | 'quotedExcerpt'>> = [
    'refId',
    'chunkId',
    'title',
    'sectionPath',
    'sourceName',
    'quotedExcerpt',
  ];
  for (const field of fields) {
    if (!isNonEmptyString(entry[field])) errors.push(`${path}.${field} 须为非空字符串`);
  }
  if (entry.pageRef !== undefined && typeof entry.pageRef !== 'string') errors.push(`${path}.pageRef 须为字符串`);
  if (entry.effectiveDate !== undefined && typeof entry.effectiveDate !== 'string') errors.push(`${path}.effectiveDate 须为字符串`);
  if (errors.some((e) => e.startsWith(path))) return null;
  return {
    refId: readString(entry.refId),
    chunkId: readString(entry.chunkId),
    title: readString(entry.title),
    sectionPath: readString(entry.sectionPath),
    pageRef: typeof entry.pageRef === 'string' ? entry.pageRef : undefined,
    sourceName: readString(entry.sourceName),
    effectiveDate: typeof entry.effectiveDate === 'string' ? entry.effectiveDate : undefined,
    quotedExcerpt: readString(entry.quotedExcerpt),
  };
}

function validateDiagnosis(entry: unknown, path: string, errors: string[]): ClinicalDiagnosisEntry | null {
  if (!isRecord(entry)) {
    errors.push(`${path} 须为对象`);
    return null;
  }
  const code = readString(entry.code);
  const name = readString(entry.name);
  const certainty = entry.certainty;
  if (!code) errors.push(`${path}.code 须为非空字符串`);
  if (!name) errors.push(`${path}.name 须为非空字符串`);
  if (!CERTAINTIES.includes(certainty as (typeof CERTAINTIES)[number])) {
    errors.push(`${path}.certainty 须为 likely | possible | differential`);
  }
  if (errors.some((e) => e.startsWith(path))) return null;
  return { code, name, certainty: certainty as ClinicalDiagnosisEntry['certainty'] };
}

function validateSuggestion(entry: unknown, path: string, errors: string[]): SuggestionEntry | null {
  if (!isRecord(entry)) {
    errors.push(`${path} 须为对象`);
    return null;
  }
  const kind = entry.kind as SuggestionKind;
  const content = readString(entry.content);
  const basisNote = readString(entry.basisNote);
  const citations = Array.isArray(entry.citations)
    ? entry.citations.filter((c): c is string => typeof c === 'string')
    : undefined;
  if (!SUGGESTION_KINDS.includes(kind)) errors.push(`${path}.kind 须为 exam | medication | referral | follow-up | plan`);
  if (!content) errors.push(`${path}.content 须为非空字符串`);
  if (entry.citations !== undefined && citations === undefined) errors.push(`${path}.citations 须为字符串数组`);
  if (!basisNote) errors.push(`${path}.basisNote 须为非空字符串`);
  if ((kind === 'exam' || kind === 'medication') && citations?.length === 0) {
    errors.push(`${path}.citations：${kind === 'exam' ? '检查' : '用药'}建议必须挂引用编号`);
  }
  if (errors.some((e) => e.startsWith(path))) return null;
  return { kind, content, citations: citations ?? [], basisNote };
}

function validateTimelineNode(entry: unknown, path: string, errors: string[]): TimelineNode | null {
  if (!isRecord(entry)) {
    errors.push(`${path} 须为对象`);
    return null;
  }
  const time = readString(entry.time);
  const event = readString(entry.event);
  const source = readString(entry.source);
  if (!time) errors.push(`${path}.time 须为非空字符串`);
  if (!event) errors.push(`${path}.event 须为非空字符串`);
  if (!source) errors.push(`${path}.source 须为非空字符串`);
  if (errors.some((e) => e.startsWith(path))) return null;
  return { time, event, source };
}

function validateAdmissionDiagnosis(entry: unknown, path: string, errors: string[]): AdmissionDiagnosisEntry | null {
  if (!isRecord(entry)) {
    errors.push(`${path} 须为对象`);
    return null;
  }
  const code = readString(entry.code);
  const name = readString(entry.name);
  if (!code) errors.push(`${path}.code 须为非空字符串`);
  if (!name) errors.push(`${path}.name 须为非空字符串`);
  if (errors.some((e) => e.startsWith(path))) return null;
  return { code, name };
}

function validateDischargeRecord(raw: unknown, errors: string[]): DischargeRecord | null {
  if (!isRecord(raw)) {
    errors.push('discharge 须为对象');
    return null;
  }
  const dischargePath = 'discharge';

  const admissionDiagnosis: AdmissionDiagnosisEntry[] = [];
  if (!Array.isArray(raw.admissionDiagnosis) || raw.admissionDiagnosis.length === 0) {
    errors.push(`${dischargePath}.admissionDiagnosis 须为非空数组`);
  } else {
    raw.admissionDiagnosis.forEach((entry, index) => {
      const validated = validateAdmissionDiagnosis(entry, `${dischargePath}.admissionDiagnosis[${index}]`, errors);
      if (validated) admissionDiagnosis.push(validated);
    });
  }

  const dischargeDiagnosis: DischargeDiagnosisEntry[] = [];
  if (!Array.isArray(raw.dischargeDiagnosis) || raw.dischargeDiagnosis.length === 0) {
    errors.push(`${dischargePath}.dischargeDiagnosis 须为非空数组`);
  } else {
    raw.dischargeDiagnosis.forEach((entry, index) => {
      const path = `${dischargePath}.dischargeDiagnosis[${index}]`;
      if (!isRecord(entry)) {
        errors.push(`${path} 须为对象`);
        return;
      }
      const code = readString(entry.code);
      const name = readString(entry.name);
      const relation = entry.relation;
      const relatedAdmissionCode = typeof entry.relatedAdmissionCode === 'string' ? entry.relatedAdmissionCode : undefined;
      const basisNote = readString(entry.basisNote);
      if (!code) errors.push(`${path}.code 须为非空字符串`);
      if (!name) errors.push(`${path}.name 须为非空字符串`);
      if (!RELATIONS.includes(relation as (typeof RELATIONS)[number])) {
        errors.push(`${path}.relation 须为 consistent | adjusted | new`);
        return;
      }
      if (relation === 'consistent') {
        const matched = admissionDiagnosis.find((admission) => admission.code === code || admission.name === name);
        if (!matched) errors.push(`${path}.relation=consistent 须与入院诊断按编码或名称对应`);
      }
      if (relation === 'adjusted') {
        const matched = admissionDiagnosis.find(
          (admission) => admission.code === (relatedAdmissionCode ?? code) || admission.name === name,
        );
        if (!matched) errors.push(`${path}.relation=adjusted 须关联入院诊断编码或名称并留痕`);
        if (!basisNote) errors.push(`${path}.basisNote 须记录诊断调整依据`);
      }
      if (relation === 'new' && !basisNote) errors.push(`${path}.basisNote 须记录新增诊断依据`);
      if (!errors.some((e) => e.startsWith(path))) {
        dischargeDiagnosis.push({
          code,
          name,
          relation: relation as DischargeDiagnosisEntry['relation'],
          relatedAdmissionCode,
          basisNote: basisNote || undefined,
        });
      }
    });
  }

  if (!isNonEmptyString(raw.treatmentSummary)) errors.push(`${dischargePath}.treatmentSummary 须为非空字符串`);
  if (!CONDITIONS.includes(raw.conditionOnDischarge as ConditionOnDischarge)) {
    errors.push(`${dischargePath}.conditionOnDischarge 须为合法出院状态枚举`);
  }
  if (!Array.isArray(raw.followUp)) {
    errors.push(`${dischargePath}.followUp 须为数组`);
  } else {
    raw.followUp.forEach((entry, index) => {
      const path = `${dischargePath}.followUp[${index}]`;
      if (!isRecord(entry)) {
        errors.push(`${path} 须为对象`);
        return;
      }
      if (!isNonEmptyString(entry.timing)) errors.push(`${path}.timing 须为非空字符串`);
      if (!isNonEmptyString(entry.advice)) errors.push(`${path}.advice 须为非空字符串`);
    });
  }
  if (!isNonEmptyString(raw.dischargeInstructions)) errors.push(`${dischargePath}.dischargeInstructions 须为非空字符串`);

  const timelineNodes: TimelineNode[] = [];
  if (Array.isArray(raw.timelineNodes)) {
    raw.timelineNodes.forEach((entry, index) => {
      const validated = validateTimelineNode(entry, `${dischargePath}.timelineNodes[${index}]`, errors);
      if (validated) timelineNodes.push(validated);
    });
  } else {
    errors.push(`${dischargePath}.timelineNodes 须为数组`);
  }

  const citations: Citation[] = [];
  if (!Array.isArray(raw.citations)) {
    errors.push(`${dischargePath}.citations 须为数组`);
  } else {
    raw.citations.forEach((entry, index) => {
      const validated = validateCitation(entry, `${dischargePath}.citations[${index}]`, errors);
      if (validated) citations.push(validated);
    });
  }
  if (dischargeDiagnosis.length > 0 && citations.length === 0) {
    errors.push(`${dischargePath}.citations：出院诊断方向必须挂引用编号`);
  }

  const missingInfo = Array.isArray(raw.missingInfo)
    ? raw.missingInfo.filter((item): item is string => typeof item === 'string')
    : [];

  if (errors.some((e) => e.startsWith(dischargePath))) return null;

  return {
    admissionDiagnosis,
    dischargeDiagnosis,
    treatmentSummary: readString(raw.treatmentSummary),
    conditionOnDischarge: raw.conditionOnDischarge as ConditionOnDischarge,
    followUp: (raw.followUp as unknown[]).map((entry) => entry as FollowUpEntry),
    dischargeInstructions: readString(raw.dischargeInstructions),
    timelineNodes,
    citations,
    missingInfo,
  };
}

/** 校验住院草稿；返回错误清单，不抛异常 */
export function validateInpatientDraft(raw: unknown): InpatientDraftValidation {
  const errors: string[] = [];
  if (!isRecord(raw)) return { valid: false, errors: ['草稿须为对象载荷'] };

  if (!DOCUMENT_TYPES.includes(raw.documentType as DocumentType)) {
    errors.push('documentType 须为七类住院文书之一');
  }
  for (const field of ['title', 'chiefComplaint', 'presentIllness', 'historyIllness', 'physicalExam', 'auxiliaryExams', 'orders', 'nursingNotes'] as const) {
    if (raw[field] !== undefined && typeof raw[field] !== 'string') errors.push(`${field} 须为字符串`);
  }
  if (raw.sections !== undefined && !isRecord(raw.sections)) errors.push('sections 须为对象映射');
  if (raw.diagnosis !== undefined && !Array.isArray(raw.diagnosis)) errors.push('diagnosis 须为数组');
  if (raw.suggestions !== undefined && !Array.isArray(raw.suggestions)) errors.push('suggestions 须为数组');
  if (raw.keyNodes !== undefined && !Array.isArray(raw.keyNodes)) errors.push('keyNodes 须为数组');
  if (raw.vitals !== undefined && !Array.isArray(raw.vitals)) errors.push('vitals 须为数组');
  if (raw.citations !== undefined && !Array.isArray(raw.citations)) errors.push('citations 须为数组');
  if (raw.missingInfo !== undefined && !Array.isArray(raw.missingInfo)) errors.push('missingInfo 须为字符串数组');
  if (!EVIDENCE_LEVELS.includes(raw.evidenceLevel as EvidenceLevel)) errors.push('evidenceLevel 须为 supported | partial | none');
  if (raw.treatmentPlanAdjustment !== undefined && typeof raw.treatmentPlanAdjustment !== 'boolean') {
    errors.push('treatmentPlanAdjustment 须为布尔值');
  }

  const diagnosis: ClinicalDiagnosisEntry[] = [];
  if (Array.isArray(raw.diagnosis)) {
    raw.diagnosis.forEach((entry, index) => {
      const validated = validateDiagnosis(entry, `diagnosis[${index}]`, errors);
      if (validated) diagnosis.push(validated);
    });
  }
  const suggestions: SuggestionEntry[] = [];
  if (Array.isArray(raw.suggestions)) {
    raw.suggestions.forEach((entry, index) => {
      const validated = validateSuggestion(entry, `suggestions[${index}]`, errors);
      if (validated) suggestions.push(validated);
    });
  }
  const keyNodes: TimelineNode[] = [];
  if (Array.isArray(raw.keyNodes)) {
    raw.keyNodes.forEach((entry, index) => {
      const validated = validateTimelineNode(entry, `keyNodes[${index}]`, errors);
      if (validated) keyNodes.push(validated);
    });
  }
  const citations: Citation[] = [];
  if (Array.isArray(raw.citations)) {
    raw.citations.forEach((entry, index) => {
      const validated = validateCitation(entry, `citations[${index}]`, errors);
      if (validated) citations.push(validated);
    });
  }
  const missingInfo = Array.isArray(raw.missingInfo)
    ? raw.missingInfo.filter((item): item is string => typeof item === 'string')
    : [];

  let discharge: DischargeRecord | undefined;
  if (raw.discharge !== undefined) {
    discharge = validateDischargeRecord(raw.discharge, errors) ?? undefined;
  }

  if (errors.length === 0) {
    const expected = deriveInpatientEvidenceLevel(citations, missingInfo);
    if (expected !== raw.evidenceLevel) errors.push(`evidenceLevel 与引用 / 缺项不一致：期望 ${expected}，实际 ${raw.evidenceLevel}`);
    if (raw.evidenceLevel === 'supported' && citations.length === 0) errors.push('evidenceLevel=supported 时 citations 不得为空');
    if (raw.evidenceLevel === 'none' && citations.length > 0) errors.push('evidenceLevel=none 时 citations 应为空');
  }

  if (errors.length > 0) return { valid: false, errors };

  const sections = isRecord(raw.sections)
    ? Object.fromEntries(Object.entries(raw.sections).map(([key, value]) => [key, typeof value === 'string' ? value : '']))
    : {};

  return {
    valid: true,
    draft: {
      documentType: raw.documentType as DocumentType,
      title: readString(raw.title),
      chiefComplaint: readString(raw.chiefComplaint),
      presentIllness: readString(raw.presentIllness),
      historyIllness: readString(raw.historyIllness),
      physicalExam: readString(raw.physicalExam),
      auxiliaryExams: readString(raw.auxiliaryExams),
      orders: readString(raw.orders),
      nursingNotes: readString(raw.nursingNotes),
      sections,
      diagnosis,
      suggestions,
      discharge,
      keyNodes,
      vitals: [],
      treatmentPlanAdjustment: raw.treatmentPlanAdjustment === true,
      missingInfo,
      citations,
      evidenceLevel: raw.evidenceLevel as EvidenceLevel,
    },
    errors: [],
  };
}

/** 住院草稿装配入参 */
export interface InpatientDraftParts {
  documentType: DocumentType;
  title?: string;
  chiefComplaint?: string;
  presentIllness?: string;
  historyIllness?: string;
  physicalExam?: string;
  auxiliaryExams?: string;
  orders?: string;
  nursingNotes?: string;
  sections?: DocumentSections;
  diagnosis?: ClinicalDiagnosisEntry[];
  suggestions?: SuggestionEntry[];
  discharge?: DischargeRecord;
  keyNodes?: TimelineNode[];
  vitals?: InpatientDraft['vitals'];
  treatmentPlanAdjustment?: boolean;
  missingInfo?: string[];
  citations?: Citation[];
}

/** 装配住院草稿；evidenceLevel 自动推导 */
export function buildInpatientDraft(parts: InpatientDraftParts): InpatientDraft {
  const citations = parts.citations ?? [];
  const missingInfo = parts.missingInfo ?? [];
  return {
    documentType: parts.documentType,
    title: parts.title ?? '',
    chiefComplaint: parts.chiefComplaint ?? '',
    presentIllness: parts.presentIllness ?? '',
    historyIllness: parts.historyIllness ?? '',
    physicalExam: parts.physicalExam ?? '',
    auxiliaryExams: parts.auxiliaryExams ?? '',
    orders: parts.orders ?? '',
    nursingNotes: parts.nursingNotes ?? '',
    sections: parts.sections ?? {},
    diagnosis: parts.diagnosis ?? [],
    suggestions: parts.suggestions ?? [],
    discharge: parts.discharge,
    keyNodes: parts.keyNodes ?? [],
    vitals: parts.vitals ?? [],
    treatmentPlanAdjustment: parts.treatmentPlanAdjustment ?? false,
    missingInfo,
    citations,
    evidenceLevel: deriveInpatientEvidenceLevel(citations, missingInfo),
  };
}

/** 出院记录装配入参 */
export interface DischargeParts {
  admissionDiagnosis: AdmissionDiagnosisEntry[];
  dischargeDiagnosis: DischargeDiagnosisEntry[];
  treatmentSummary: string;
  conditionOnDischarge: ConditionOnDischarge;
  followUp: FollowUpEntry[];
  dischargeInstructions: string;
  timelineNodes: TimelineNode[];
  citations: Citation[];
  missingInfo?: string[];
}

/** 装配出院记录 */
export function buildDischargeRecord(parts: DischargeParts): DischargeRecord {
  return {
    admissionDiagnosis: parts.admissionDiagnosis,
    dischargeDiagnosis: parts.dischargeDiagnosis,
    treatmentSummary: parts.treatmentSummary,
    conditionOnDischarge: parts.conditionOnDischarge,
    followUp: parts.followUp,
    dischargeInstructions: parts.dischargeInstructions,
    timelineNodes: parts.timelineNodes,
    citations: parts.citations,
    missingInfo: parts.missingInfo ?? [],
  };
}

/** 无依据结论段：复用 S-12 拒答模板口径，追加「（待核实）」标记 */
export function buildNoEvidenceSections(query: string, missingInfo: string[]): { content: string; missingInfo: string[] } {
  const answer = buildNoEvidenceAnswer(query, missingInfo);
  return { content: answer.content, missingInfo: answer.missingInfo };
}

/** 文本追加「（待核实）」前缀标记 */
export function appendPendingMarker(text: string): string {
  if (!text) return '（待核实）';
  return text.startsWith('（待核实）') ? text : `（待核实）${text}`;
}
