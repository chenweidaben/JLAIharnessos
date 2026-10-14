/**
 * 健澜科技 jlmedaios - 病历终末质控评分聚合（M90-B）
 *
 * 终末质控在病历归档前对整份住院病历做一次总评：
 *  - 病历要素完整性：主诉/现病史/查体/诊断/诊疗方案，缺一按权重扣分；
 *  - 病案首页完整性：首页缺失或主诊断空缺扣分；
 *  - 时效：首次病程 8h 内完成，逾期扣分；
 *  - 按总分判定甲级（≥90）/ 乙级（75-89）/ 丙级（<75），随记录落库。
 * 真实数据装载复用 M90-A（aiNoteQcAggregator）思路：visit/admissionNote/progressNote/首页，
 * 任一查询失败或无结果一律安全降级为空上下文，绝不抛错、不臆造数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import * as admissionNoteRepo from '@/db/repositories/admissionNoteRepo';
import * as frontPageRepo from '@/db/repositories/frontPageRepo';
import * as progressNoteRepo from '@/db/repositories/progressNoteRepo';
import * as repo from '@/db/repositories/terminalQcRepo';
import type { TerminalGrade, TerminalQcIssue } from '@/db/repositories/terminalQcRepo';
import * as visitRepo from '@/db/repositories/visitRepo';

import { hoursBetween, pickFirstProgressNote } from './aiNoteQcAggregator';
import type { AuthView } from '../view/userView.js';

export class TerminalQcError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/* ------------------------------- 分级纯函数 ------------------------------- */

/** 终末评级：≥90 甲级 / 75-89 乙级 / <75 丙级 */
export function gradeFromScore(score: number): TerminalGrade {
  if (score >= 90) return '甲级';
  if (score >= 75) return '乙级';
  return '丙级';
}

/* --------------------------- 规则引擎（纯函数） --------------------------- */

export interface TerminalInput {
  sections: {
    chiefComplaint: boolean;
    presentIllness: boolean;
    physicalExam: boolean;
    diagnosis: boolean;
    treatment: boolean;
  };
  /** 病案首页是否已建立 */
  frontPageExists: boolean;
  /** 病案首页主诊断是否已填写 */
  frontPageDiagnosis: boolean;
  /** 首次病程耗时（小时），8h 内合格 */
  firstProgressHours: number | null;
}

/** 病历要素权重（合计 60 分） */
const SECTION_RULES = [
  { key: 'chiefComplaint', label: '主诉', weight: 10 },
  { key: 'presentIllness', label: '现病史', weight: 15 },
  { key: 'physicalExam', label: '体格检查', weight: 10 },
  { key: 'diagnosis', label: '诊断', weight: 10 },
  { key: 'treatment', label: '诊疗方案', weight: 15 },
] as const;

const FIRST_PROGRESS_DEADLINE_H = 8;

/** 纯函数规则引擎：输出 0-100 分与问题清单 */
export function evaluateTerminal(input: TerminalInput): { score: number; issues: TerminalQcIssue[] } {
  let score = 100;
  const issues: TerminalQcIssue[] = [];

  // 病历要素完整性
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

  // 病案首页完整性
  if (!input.frontPageExists) {
    score -= 10;
    issues.push({
      rule: 'frontpage.missing',
      severity: 'error',
      message: '病案首页未建立，终末质控无法闭环',
    });
  } else if (!input.frontPageDiagnosis) {
    score -= 10;
    issues.push({
      rule: 'frontpage.primary_diagnosis_missing',
      severity: 'error',
      message: '病案首页主诊断未填写',
    });
  }

  // 首次病程时效
  if (input.firstProgressHours != null && input.firstProgressHours > FIRST_PROGRESS_DEADLINE_H) {
    score -= 10;
    issues.push({
      rule: 'timeliness.first_progress_overdue',
      severity: 'error',
      message: `首次病程耗时 ${input.firstProgressHours}h，超过 ${FIRST_PROGRESS_DEADLINE_H}h 规定时限`,
    });
  }

  score = Math.max(0, Math.min(100, score));
  return { score, issues };
}

/* ------------------------- 真实数据 → 规则引擎输入 ------------------------- */

/** 终末质控原始上下文（数据获取在 aggregator 层完成，缺失一律 null/false 降级） */
export interface TerminalDataSource {
  admitAt: string | null;
  visitChiefComplaint: string | null;
  admissionNote: {
    chiefComplaint: string | null;
    presentIllness: string | null;
    physicalExam: string | null;
    preliminaryDiagnosis: string | null;
    treatmentPlan: string | null;
  } | null;
  firstProgressNoteAt: string | null;
  frontPage: { primaryDiagnosis: string | null } | null;
}

const hasText = (v: string | null | undefined): boolean =>
  typeof v === 'string' && v.trim().length > 0;

/** 纯函数：把真实就诊/文书/首页上下文映射为规则引擎输入 */
export function buildTerminalInput(src: TerminalDataSource): TerminalInput {
  const a = src.admissionNote;
  return {
    sections: {
      chiefComplaint: hasText(a?.chiefComplaint) || hasText(src.visitChiefComplaint),
      presentIllness: hasText(a?.presentIllness),
      physicalExam: hasText(a?.physicalExam),
      diagnosis: hasText(a?.preliminaryDiagnosis),
      treatment: hasText(a?.treatmentPlan),
    },
    frontPageExists: src.frontPage != null,
    frontPageDiagnosis: hasText(src.frontPage?.primaryDiagnosis),
    firstProgressHours: hoursBetween(src.admitAt, src.firstProgressNoteAt),
  };
}

/**
 * 按 visitId 装载真实就诊/入院记录/病程/病案首页。
 * 任一 repo 查询失败或无结果均安全降级，绝不抛出。
 */
async function loadTerminalSource(visitId: string): Promise<TerminalDataSource> {
  const src: TerminalDataSource = {
    admitAt: null, visitChiefComplaint: null, admissionNote: null,
    firstProgressNoteAt: null, frontPage: null,
  };
  try {
    const visit = await visitRepo.getVisitById(visitId);
    if (visit) {
      src.admitAt = visit.admitAt;
      src.visitChiefComplaint = visit.chiefComplaint;
    }
  } catch { /* 就诊信息缺失：按无就诊降级 */ }
  try {
    src.admissionNote = await admissionNoteRepo.getByVisit(visitId);
  } catch { /* 入院记录查询失败：按缺失处理 */ }
  try {
    const notes = await progressNoteRepo.listByVisit(visitId);
    src.firstProgressNoteAt = pickFirstProgressNote(notes)?.noteDate ?? null;
  } catch { /* 病程查询失败：首次病程时效不扣分 */ }
  try {
    src.frontPage = await frontPageRepo.getFrontPageByVisit(visitId);
  } catch { /* 首页查询失败：首页项不扣分 */ }
  return src;
}

/** 触发一次终末质控评分：权限校验 → 真实数据装载 → 规则引擎 → 评级落库 */
export async function scanView(view: AuthView, visitId: string) {
  if (!view.permissions.includes('terminal_qc:view')) throw new TerminalQcError(403, '无权限');
  if (!visitId) throw new TerminalQcError(400, 'visitId 必填');
  const src = await loadTerminalSource(visitId);
  const { score, issues } = evaluateTerminal(buildTerminalInput(src));
  return repo.create({ visitId, grade: gradeFromScore(score), score, issues });
}

/** 查询该就诊历史终末质控记录（按时间倒序） */
export async function listView(view: AuthView, visitId: string) {
  if (!view.permissions.includes('terminal_qc:view')) throw new TerminalQcError(403, '无权限');
  if (!visitId) throw new TerminalQcError(400, 'visitId 必填');
  return repo.listLatestByVisit(visitId, 10);
}
