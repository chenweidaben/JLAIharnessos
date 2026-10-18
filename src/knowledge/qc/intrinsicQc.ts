/**
 * 健澜科技 jlmedaios - AI 内涵逻辑一致性检查（M460 大三甲深度升级）
 *
 * 纯函数模拟 NLP 抽取结果做逻辑校验：
 *  - 主诉现病史呼应
 *  - 诊断用药匹配
 *  - 时间逻辑矛盾
 *  - 过敏史一致性
 *
 * 纯函数、无 I/O、可重复；仅给出问题与建议，质控结论必须由质控医师本人签名（AI 不产生结论）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { RecordLike } from './medicalRecordQc';

/** AI 内涵问题 */
export interface IntrinsicIssue {
  checkId: string;
  name: string;
  severity: 'block' | 'major' | 'minor';
  message: string;
  source: 'ai-intrinsic';
}

/** 内涵评估结果 */
export interface IntrinsicEvaluation {
  issues: IntrinsicIssue[];
  score: number;
  passed: boolean;
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function toTextList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(toText).filter(Boolean);
  const text = toText(value).trim();
  if (!text) return [];
  return text.split(/[,，;；、\s]+/).filter(Boolean);
}

/**
 * 主诉现病史呼应：主诉关键词应在现病史中出现。
 *
 * @param record 病历
 * @returns 问题；通过则返回 null
 */
export function checkChiefComplaintVsPresentIllness(record: RecordLike): IntrinsicIssue | null {
  const content = record.content ?? {};
  const chief = toText(content.chiefComplaint).trim();
  const present = toText(content.presentIllness).trim();
  if (!chief || !present) return null;
  const keyword = chief.slice(0, 4);
  if (!present.includes(keyword)) {
    return {
      checkId: 'INT-001', name: '主诉现病史呼应', severity: 'major',
      message: `主诉关键词「${keyword}」未在现病史中出现，主诉与现病史可能不呼应`,
      source: 'ai-intrinsic',
    };
  }
  return null;
}

/**
 * 诊断用药匹配：诊断含"肺炎"但无抗感染药 → issue。
 *
 * @param record 病历
 * @returns 问题；通过则返回 null
 */
export function checkDiagnosisVsMedication(record: RecordLike): IntrinsicIssue | null {
  const content = record.content ?? {};
  const diagnosis = toText(content.diagnosis);
  const meds = toTextList(content.medications).join(' ');
  if (!diagnosis) return null;
  const antiInfectiveKeywords = ['头孢', '阿莫西林', '阿奇', '左氧', '青霉素', '克林霉素', '莫西沙星'];
  const hasAntiInfective = antiInfectiveKeywords.some((k) => meds.includes(k));
  if (diagnosis.includes('肺炎') && !hasAntiInfective) {
    return {
      checkId: 'INT-002', name: '诊断用药匹配', severity: 'major',
      message: '诊断含「肺炎」但医嘱用药未见抗感染药物，诊断与用药可能不匹配',
      source: 'ai-intrinsic',
    };
  }
  return null;
}

/**
 * 时间逻辑矛盾：recordTime 早于 admissionTime → issue。
 *
 * @param record 病历
 * @returns 问题；通过则返回 null
 */
export function checkTimeLogic(record: RecordLike): IntrinsicIssue | null {
  const content = record.content ?? {};
  const admissionMs = new Date(toText(content.admissionTime)).getTime();
  const recordMs = new Date(toText(content.recordTime)).getTime();
  if (Number.isNaN(admissionMs) || Number.isNaN(recordMs)) return null;
  if (recordMs < admissionMs) {
    return {
      checkId: 'INT-003', name: '时间逻辑矛盾', severity: 'block',
      message: '病历记录时间早于入院时间，存在时间逻辑矛盾',
      source: 'ai-intrinsic',
    };
  }
  return null;
}

/**
 * 过敏史一致性：过敏史记录了某药但用药医嘱含该药 → issue（严重）。
 *
 * @param record 病历
 * @returns 问题；通过则返回 null
 */
export function checkAllergyConsistency(record: RecordLike): IntrinsicIssue | null {
  const content = record.content ?? {};
  const allergies = toTextList(content.allergies);
  const meds = toTextList(content.medications).join(' ');
  if (allergies.length === 0 || !meds) return null;
  for (const allergy of allergies) {
    if (meds.includes(allergy)) {
      return {
        checkId: 'INT-004', name: '过敏史一致性', severity: 'block',
        message: `过敏史记录「${allergy}」但医嘱用药含该药，存在严重用药安全风险`,
        source: 'ai-intrinsic',
      };
    }
  }
  return null;
}

/**
 * AI 内涵逻辑一致性总评估。
 *
 * @param record 病历
 * @returns 问题列表、得分、是否通过
 */
export function evaluateIntrinsicQc(record: RecordLike): IntrinsicEvaluation {
  const issues: IntrinsicIssue[] = [];
  const checks = [
    checkChiefComplaintVsPresentIllness(record),
    checkDiagnosisVsMedication(record),
    checkTimeLogic(record),
    checkAllergyConsistency(record),
  ];
  for (const issue of checks) {
    if (issue) issues.push(issue);
  }
  let blockCount = 0;
  let majorCount = 0;
  let minorCount = 0;
  for (const i of issues) {
    if (i.severity === 'block') blockCount += 1;
    else if (i.severity === 'major') majorCount += 1;
    else minorCount += 1;
  }
  const rawScore = 100 - blockCount * 15 - majorCount * 8 - minorCount * 3;
  const score = Math.max(0, Math.min(100, rawScore));
  return {
    issues,
    score,
    passed: blockCount === 0,
  };
}
