/**
 * 健澜科技 jlmedaios - AI病历质控聚合（M90-A）
 *
 * 纯函数规则引擎三维粗评：
 *  - 完整性：主诉/现病史/查体/诊断/治疗，缺一要素按权重扣分；
 *  - 时效：入院记录 24h、首次病程 8h，逾期扣分；
 *  - 术语规范：口语化用词粗评。
 * 输出 0-100 分与 issues 数组 [{rule, severity, message}]。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import * as admissionNoteRepo from '@/db/repositories/admissionNoteRepo';
import type { AiNoteQcIssue } from '@/db/repositories/aiNoteQcRepo';
import * as repo from '@/db/repositories/aiNoteQcRepo';
import * as progressNoteRepo from '@/db/repositories/progressNoteRepo';
import * as visitRepo from '@/db/repositories/visitRepo';

import type { AuthView } from '../view/userView.js';

export class AiNoteQcError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** 规则引擎输入（由 buildQcInput 从真实就诊/入院记录/病程映射填充） */
export interface QcInput {
  /** 已完成的病历要素 */
  sections: {
    chiefComplaint: boolean;   // 主诉
    presentIllness: boolean;   // 现病史
    physicalExam: boolean;     // 查体
    diagnosis: boolean;       // 诊断
    treatment: boolean;        // 治疗
  };
  /** 入院记录完成耗时（小时），规定 24h 内 */
  admissionHours: number | null;
  /** 首次病程完成耗时（小时），规定 8h 内 */
  firstProgressHours: number | null;
  /** 文书正文（术语粗评） */
  noteText: string;
}

/** 完整性要素权重（合计 60 分） */
const SECTION_RULES = [
  { key: 'chiefComplaint', label: '主诉', weight: 10 },
  { key: 'presentIllness', label: '现病史', weight: 15 },
  { key: 'physicalExam', label: '体格检查', weight: 10 },
  { key: 'diagnosis', label: '诊断', weight: 10 },
  { key: 'treatment', label: '治疗方案', weight: 15 },
] as const;

const ADMISSION_DEADLINE_H = 24;
const FIRST_PROGRESS_DEADLINE_H = 8;

/** 口语化 / 不规范用词粗评词表 */
const COLLOQUIAL_TERMS = ['挺好', '没事', '差不多', '应该可以', '大概'];

/** 纯函数规则引擎：输出 0-100 分与问题清单 */
export function evaluateQc(input: QcInput): { score: number; issues: AiNoteQcIssue[] } {
  let score = 100;
  const issues: AiNoteQcIssue[] = [];

  // 完整性：缺一要素按权重扣分
  for (const rule of SECTION_RULES) {
    if (!input.sections[rule.key]) {
      score -= rule.weight;
      issues.push({
        rule: `completeness.${rule.key}_missing`,
        severity: 'error',
        message: `病历要素缺失：${rule.label}`,
      });
    }
  }

  // 时效：入院记录 24h、首次病程 8h
  if (input.admissionHours != null && input.admissionHours > ADMISSION_DEADLINE_H) {
    score -= 15;
    issues.push({
      rule: 'timeliness.admission_overdue',
      severity: 'error',
      message: `入院记录耗时 ${input.admissionHours}h，超过 ${ADMISSION_DEADLINE_H}h 规定时限`,
    });
  }
  if (input.firstProgressHours != null && input.firstProgressHours > FIRST_PROGRESS_DEADLINE_H) {
    score -= 10;
    issues.push({
      rule: 'timeliness.first_progress_overdue',
      severity: 'error',
      message: `首次病程耗时 ${input.firstProgressHours}h，超过 ${FIRST_PROGRESS_DEADLINE_H}h 规定时限`,
    });
  }

  // 术语规范：粗评口语化用词（命中即记一条 warning）
  for (const term of COLLOQUIAL_TERMS) {
    if (input.noteText.includes(term)) {
      score -= 5;
      issues.push({
        rule: 'terminology.colloquial',
        severity: 'warning',
        message: `文书含口语化用词「${term}」，建议改为规范医学表述`,
      });
      break;
    }
  }

  score = Math.max(0, Math.min(100, score));
  return { score, issues };
}

/* ----------------------------- 真实数据 → 规则引擎输入（纯函数） ----------------------------- */

/** 从真实就诊/文书取出的质控原始上下文（数据获取在 aggregator 层完成） */
export interface QcDataSource {
  /** 入院时间（ISO），首次病程 8h 时效的基准事件时间 */
  admitAt: string | null;
  /** 就诊主表上的主诉（admissionNote 缺失时兜底） */
  visitChiefComplaint: string | null;
  /** 入院记录（clinical.admission_notes），查不到为 null */
  admissionNote: {
    chiefComplaint: string | null;
    presentIllness: string | null;
    physicalExam: string | null;
    preliminaryDiagnosis: string | null;
    treatmentPlan: string | null;
  } | null;
  /** 首次病程记录的 noteDate（ISO），查不到为 null */
  firstProgressNoteAt: string | null;
}

/** 判断某个病程记录是否为「首次病程」（noteType 为自由文本，兼容中文/英文标识） */
export function isFirstProgressNote(noteType: string | null | undefined): boolean {
  if (!noteType) return false;
  if (noteType.includes('首次')) return true;
  const t = noteType.toLowerCase();
  return t.includes('first') && t.includes('progress');
}

/** 从病程列表中挑出首次病程记录（取其中最早的一条），没有返回 null */
export function pickFirstProgressNote<T extends { noteType: string; noteDate: string }>(
  notes: T[],
): T | null {
  const matched = notes.filter((n) => isFirstProgressNote(n.noteType));
  if (matched.length === 0) return null;
  return matched.reduce((earliest, n) =>
    new Date(n.noteDate).getTime() < new Date(earliest.noteDate).getTime() ? n : earliest,
  );
}

const hasText = (v: string | null | undefined): boolean =>
  typeof v === 'string' && v.trim().length > 0;

/** 计算两个 ISO 时间点之间相差的小时数；任一缺失或非法返回 null（不臆造） */
export function hoursBetween(fromIso: string | null, toIso: string | null): number | null {
  if (!fromIso || !toIso) return null;
  const a = new Date(fromIso).getTime();
  const b = new Date(toIso).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return (b - a) / 3_600_000;
}

/**
 * 纯函数：把真实就诊/文书上下文映射为规则引擎输入。
 * - 完整性：入院记录各段落非空即视为「已具备」；整份入院记录缺失时全部为 false，
 *   由 evaluateQc 统一产出「病历要素缺失」issue（而非随机种子）。
 * - 时效：首次病程耗时 = 首次病程 noteDate − 入院时间；
 *   入院记录完成时间戳当前 admissionNoteRepo 未导出（AdmissionNote 无时间字段），
 *   故 admissionHours 安全降级为 null，不编造扣分。
 */
export function buildQcInput(src: QcDataSource): QcInput {
  const a = src.admissionNote;
  const noteText = [
    a?.chiefComplaint, a?.presentIllness, a?.physicalExam,
    a?.preliminaryDiagnosis, a?.treatmentPlan,
  ].filter((v): v is string => hasText(v)).join(' ');
  return {
    sections: {
      chiefComplaint: hasText(a?.chiefComplaint) || hasText(src.visitChiefComplaint),
      presentIllness: hasText(a?.presentIllness),
      physicalExam: hasText(a?.physicalExam),
      diagnosis: hasText(a?.preliminaryDiagnosis),
      treatment: hasText(a?.treatmentPlan),
    },
    admissionHours: null,
    firstProgressHours: hoursBetween(src.admitAt, src.firstProgressNoteAt),
    noteText,
  };
}

/**
 * aggregator 层数据获取：按 visitId 查真实就诊/入院记录/病程。
 * 任一 repo 查询失败或无结果时安全降级为空结果集，绝不抛出、不引入会崩的依赖。
 */
async function loadQcSource(visitId: string): Promise<QcDataSource> {
  const src: QcDataSource = {
    admitAt: null, visitChiefComplaint: null, admissionNote: null, firstProgressNoteAt: null,
  };
  try {
    const visit = await visitRepo.getVisitById(visitId);
    if (visit) {
      src.admitAt = visit.admitAt;
      src.visitChiefComplaint = visit.chiefComplaint;
    }
  } catch { /* 就诊信息缺失：按无就诊继续降级 */ }
  try {
    src.admissionNote = await admissionNoteRepo.getByVisit(visitId);
  } catch { /* 入院记录查询失败：按缺失处理 */ }
  try {
    const notes = await progressNoteRepo.listByVisit(visitId);
    src.firstProgressNoteAt = pickFirstProgressNote(notes)?.noteDate ?? null;
  } catch { /* 病程查询失败：首次病程时效不扣分 */ }
  return src;
}

/** 触发一次质控扫描：权限校验 → 真实数据装载 → 规则引擎 → 落库 pending 记录并返回 */
export async function scanView(view: AuthView, visitId: string) {
  if (!view.permissions.includes('ai_note_qc:view')) throw new AiNoteQcError(403, '无权限');
  if (!visitId) throw new AiNoteQcError(400, 'visitId 必填');
  const src = await loadQcSource(visitId);
  const { score, issues } = evaluateQc(buildQcInput(src));
  return repo.create({ visitId, noteType: 'emr_qc', issues, score, status: 'pending' });
}

/** 查询该就诊最新 N 条质控记录 */
export async function listView(view: AuthView, visitId: string) {
  if (!view.permissions.includes('ai_note_qc:view')) throw new AiNoteQcError(403, '无权限');
  if (!visitId) throw new AiNoteQcError(400, 'visitId 必填');
  return repo.listLatestByVisit(visitId, 10);
}
