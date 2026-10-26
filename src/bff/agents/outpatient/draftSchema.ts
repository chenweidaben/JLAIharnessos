/**
 * 健澜AI原生医院操作系统OS - bff/agents/outpatient/draftSchema.ts
 *
 * 门诊草稿 Schema 校验与装配（4.2.5 输出 Schema 落地）：
 * 字段类型、枚举值、诊断确定性、建议类别、exam/medication 引用编号强制、
 * evidenceLevel 与引用一致性；无依据结论追加「（待核实）」标记。
 *
 * 纯函数离线实现；证据级别推导口径与 S-12 引用协议保持一致。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { buildNoEvidenceAnswer, type Citation } from '@/knowledge-platform/citation/citationProtocol.js';
import type { EvidenceLevel } from '@/security/ai/types.js';
import type {
  DiagnosisEntry,
  EncounterKind,
  OutpatientRecordDraft,
  SuggestionEntry,
  SuggestionKind,
} from './types.js';

/** 草稿校验结果 */
export interface DraftValidation {
  valid: boolean;
  draft?: OutpatientRecordDraft;
  errors: string[];
}

const ENCOUNTER_KINDS: EncounterKind[] = ['initial', 'follow-up'];
const CERTAINTIES = ['likely', 'possible', 'differential'] as const;
const SUGGESTION_KINDS: SuggestionKind[] = ['exam', 'medication', 'referral', 'follow-up'];
const EVIDENCE_LEVELS: EvidenceLevel[] = ['supported', 'partial', 'none'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** 按引用与缺项清单推导证据级别（口径对齐 S-12：无命中 none；有缺口 partial；其余 supported） */
export function deriveDraftEvidenceLevel(citations: Citation[], missingInfo: string[]): EvidenceLevel {
  if (citations.length === 0) return 'none';
  if (missingInfo.length > 0) return 'partial';
  return 'supported';
}

/** 校验单条诊断条目 */
function validateDiagnosis(entry: unknown, path: string, errors: string[]): DiagnosisEntry | null {
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
  return { code, name, certainty: certainty as DiagnosisEntry['certainty'] };
}

/** 校验单条建议条目；exam / medication 必须挂引用编号 */
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
  if (!SUGGESTION_KINDS.includes(kind)) {
    errors.push(`${path}.kind 须为 exam | medication | referral | follow-up`);
  }
  if (!content) errors.push(`${path}.content 须为非空字符串`);
  if (entry.citations !== undefined && citations === undefined) {
    errors.push(`${path}.citations 须为字符串数组`);
  }
  if (!basisNote) errors.push(`${path}.basisNote 须为非空字符串`);
  if ((kind === 'exam' || kind === 'medication') && citations?.length === 0) {
    errors.push(`${path}.citations：${kind === 'exam' ? '检查' : '用药'}建议必须挂引用编号`);
  }
  if (errors.some((e) => e.startsWith(path))) return null;
  return { kind, content, citations: citations ?? [], basisNote };
}

/** 校验单条引用条目（字段口径对齐 S-12 Citation） */
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
  if (entry.pageRef !== undefined && typeof entry.pageRef !== 'string') {
    errors.push(`${path}.pageRef 须为字符串`);
  }
  if (entry.effectiveDate !== undefined && typeof entry.effectiveDate !== 'string') {
    errors.push(`${path}.effectiveDate 须为字符串`);
  }
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

/**
 * 校验模型 / 规则装配产出的草稿；不合法时返回全部字段错误，不抛异常。
 */
export function validateOutpatientDraft(raw: unknown): DraftValidation {
  const errors: string[] = [];
  if (!isRecord(raw)) {
    return { valid: false, errors: ['草稿须为对象载荷'] };
  }

  if (!ENCOUNTER_KINDS.includes(raw.encounterKind as EncounterKind)) {
    errors.push('encounterKind 须为 initial | follow-up');
  }
  for (const field of ['chiefComplaint', 'presentIllness', 'historyIllness', 'physicalExam', 'auxiliaryExams'] as const) {
    if (raw[field] !== undefined && typeof raw[field] !== 'string') {
      errors.push(`${field} 须为字符串`);
    }
  }
  if (raw.diagnosis !== undefined && !Array.isArray(raw.diagnosis)) {
    errors.push('diagnosis 须为数组');
  }
  if (raw.suggestions !== undefined && !Array.isArray(raw.suggestions)) {
    errors.push('suggestions 须为数组');
  }
  if (raw.citations !== undefined && !Array.isArray(raw.citations)) {
    errors.push('citations 须为数组');
  }
  if (raw.missingInfo !== undefined && !Array.isArray(raw.missingInfo)) {
    errors.push('missingInfo 须为字符串数组');
  }
  if (!EVIDENCE_LEVELS.includes(raw.evidenceLevel as EvidenceLevel)) {
    errors.push('evidenceLevel 须为 supported | partial | none');
  }

  const diagnosis: DiagnosisEntry[] = [];
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
  const citations: Citation[] = [];
  if (Array.isArray(raw.citations)) {
    raw.citations.forEach((entry, index) => {
      const validated = validateCitation(entry, `citations[${index}]`, errors);
      if (validated) citations.push(validated);
    });
  }
  const missingInfo = Array.isArray(raw.missingInfo)
    ? raw.missingInfo.filter((m): m is string => typeof m === 'string')
    : [];

  // 证据级别与引用 / 缺项一致性（口径对齐 S-12）
  if (errors.length === 0) {
    const expected = deriveDraftEvidenceLevel(citations, missingInfo);
    if (expected !== raw.evidenceLevel) {
      errors.push(`evidenceLevel 与引用 / 缺项不一致：期望 ${expected}，实际 ${raw.evidenceLevel}`);
    }
    if (raw.evidenceLevel === 'supported' && citations.length === 0) {
      errors.push('evidenceLevel=supported 时 citations 不得为空');
    }
    if (raw.evidenceLevel === 'none' && citations.length > 0) {
      errors.push('evidenceLevel=none 时 citations 应为空');
    }
  }

  if (errors.length > 0) return { valid: false, errors };

  return {
    valid: true,
    draft: {
      encounterKind: raw.encounterKind as EncounterKind,
      chiefComplaint: readString(raw.chiefComplaint),
      presentIllness: readString(raw.presentIllness),
      historyIllness: readString(raw.historyIllness),
      physicalExam: readString(raw.physicalExam),
      auxiliaryExams: readString(raw.auxiliaryExams),
      diagnosis,
      suggestions,
      missingInfo,
      citations,
      evidenceLevel: raw.evidenceLevel as EvidenceLevel,
    },
    errors: [],
  };
}

/** 草稿装配入参 */
export interface DraftParts {
  encounterKind: EncounterKind;
  chiefComplaint?: string;
  presentIllness?: string;
  historyIllness?: string;
  physicalExam?: string;
  auxiliaryExams?: string;
  diagnosis?: DiagnosisEntry[];
  suggestions?: SuggestionEntry[];
  missingInfo?: string[];
  citations?: Citation[];
}

/** 装配草稿；evidenceLevel 按引用与缺项清单自动推导，不手工指定 */
export function buildOutpatientDraft(parts: DraftParts): OutpatientRecordDraft {
  const citations = parts.citations ?? [];
  const missingInfo = parts.missingInfo ?? [];
  return {
    encounterKind: parts.encounterKind,
    chiefComplaint: parts.chiefComplaint ?? '',
    presentIllness: parts.presentIllness ?? '',
    historyIllness: parts.historyIllness ?? '',
    physicalExam: parts.physicalExam ?? '',
    auxiliaryExams: parts.auxiliaryExams ?? '',
    diagnosis: parts.diagnosis ?? [],
    suggestions: parts.suggestions ?? [],
    missingInfo,
    citations,
    evidenceLevel: deriveDraftEvidenceLevel(citations, missingInfo),
  };
}

/** 无依据结论段：复用 S-12 拒答模板口径，追加「（待核实）」标记 */
export function buildNoEvidenceSections(query: string, missingInfo: string[]): {
  content: string;
  missingInfo: string[];
} {
  const answer = buildNoEvidenceAnswer(query, missingInfo);
  return { content: answer.content, missingInfo: answer.missingInfo };
}

/** 文本追加「（待核实）」前缀标记 */
export function appendPendingMarker(text: string): string {
  if (!text) return '（待核实）';
  return text.startsWith('（待核实）') ? text : `（待核实）${text}`;
}
