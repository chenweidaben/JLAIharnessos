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
import type { AuthView } from '../view/userView.js';
import * as repo from '@/db/repositories/aiNoteQcRepo';
import type { AiNoteQcIssue } from '@/db/repositories/aiNoteQcRepo';

export class AiNoteQcError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** 规则引擎输入（生产环境应由文书索引读取填充） */
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

/**
 * 本地启发式构造扫描输入。
 * TODO: 生产环境替换为真实文书索引（入院记录/病程/诊断/治疗记录）读取。
 */
function heuristicInput(visitId: string): QcInput {
  let h = 0;
  for (const ch of visitId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const bit = (i: number) => ((h >>> i) & 1) === 1;
  return {
    sections: {
      chiefComplaint: true,
      presentIllness: bit(0),
      physicalExam: bit(1),
      diagnosis: bit(2),
      treatment: bit(3),
    },
    admissionHours: bit(4) ? ADMISSION_DEADLINE_H + (h % 12) : 8 + (h % 10),
    firstProgressHours: bit(5) ? FIRST_PROGRESS_DEADLINE_H + (h % 8) : 2 + (h % 5),
    noteText: bit(6) ? '患者一般情况挺好，没什么事。' : '患者神志清楚，双肺呼吸音清，诊断明确，治疗方案合理。',
  };
}

/** 触发一次质控扫描：权限校验 → 规则引擎 → 落库 pending 记录并返回 */
export async function scanView(view: AuthView, visitId: string) {
  if (!view.permissions.includes('ai_note_qc:view')) throw new AiNoteQcError(403, '无权限');
  if (!visitId) throw new AiNoteQcError(400, 'visitId 必填');
  const { score, issues } = evaluateQc(heuristicInput(visitId));
  return repo.create({ visitId, noteType: 'emr_qc', issues, score, status: 'pending' });
}

/** 查询该就诊最新 N 条质控记录 */
export async function listView(view: AuthView, visitId: string) {
  if (!view.permissions.includes('ai_note_qc:view')) throw new AiNoteQcError(403, '无权限');
  if (!visitId) throw new AiNoteQcError(400, 'visitId 必填');
  return repo.listLatestByVisit(visitId, 10);
}
