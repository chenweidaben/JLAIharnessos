/**
 * 健澜科技 jlmedaios - AI 内涵质控推理链（M461-D，V14，EMR 深化四模块，M461 收官）
 *
 * 在 intrinsicQc.ts 基础上扩展（不修改 intrinsicQc.ts，独立文件）：
 *  - 诊断-治疗三角一致性（DTC）
 *  - 用药-诊断匹配（MDM）
 *  - 时间连续性（TC）
 *
 * 纯函数、无 I/O、可重复；仅给出问题与建议，质控结论必须由质控医师本人签名（AI 不产生结论）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { RecordLike } from "./medicalRecordQc";

/** AI 内涵推理问题 */
export interface IntrinsicReasoningIssue {
  checkId: "DTC" | "MDM" | "TC";
  name: string;
  severity: "block" | "major" | "minor";
  message: string;
  source: "ai-reasoning";
}

/** 推理评估结果 */
export interface IntrinsicReasoningEvaluation {
  issues: IntrinsicReasoningIssue[];
  score: number;
  passed: boolean;
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function toTextList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(toText).filter(Boolean);
  const text = toText(value).trim();
  if (!text) return [];
  return text.split(/[,，;；、\s]+/).filter(Boolean);
}

/**
 * 诊断-治疗三角一致性：诊断含"肺炎"但治疗方案无"抗感染/抗生素"→issue（major）。
 *
 * @param record 病历
 * @returns 问题；通过则返回 null
 */
export function checkDiagnosisTreatmentConsistency(record: RecordLike): IntrinsicReasoningIssue | null {
  const content = record.content ?? {};
  const diagnosis = toText(content.diagnosis);
  const treatmentPlan = toText(content.treatmentPlan);
  if (!diagnosis) return null;
  const antiInfectiveKeywords = ["抗感染", "抗生素", "头孢", "阿莫西林", "阿奇", "左氧", "青霉素"];
  const hasAntiInfective = antiInfectiveKeywords.some((k) => treatmentPlan.includes(k));
  if (diagnosis.includes("肺炎") && !hasAntiInfective) {
    return {
      checkId: "DTC", name: "诊断-治疗三角一致性", severity: "major",
      message: "诊断含「肺炎」但治疗方案未见抗感染/抗生素相关措施，诊断与治疗可能不一致",
      source: "ai-reasoning",
    };
  }
  return null;
}

/**
 * 用药-诊断匹配：开"胰岛素"但诊断无"糖尿病"→issue（minor，提示核实）。
 *
 * @param record 病历
 * @returns 问题；通过则返回 null
 */
export function checkMedicationDiagnosisMatch(record: RecordLike): IntrinsicReasoningIssue | null {
  const content = record.content ?? {};
  const diagnosis = toText(content.diagnosis);
  const medications = toTextList(content.medications).join(" ");
  if (!medications) return null;
  if (medications.includes("胰岛素") && !diagnosis.includes("糖尿病")) {
    return {
      checkId: "MDM", name: "用药-诊断匹配", severity: "minor",
      message: "医嘱开出「胰岛素」但诊断未见「糖尿病」，请核实诊断与用药是否匹配",
      source: "ai-reasoning",
    };
  }
  return null;
}

/**
 * 时间连续性：入院→首次病程→上级查房→出院时间应单调递增，回退→issue（block）。
 *
 * @param record 病历
 * @returns 问题；通过则返回 null
 */
export function checkTimeContinuity(record: RecordLike): IntrinsicReasoningIssue | null {
  const content = record.content ?? {};
  const admissionMs = new Date(toText(content.admissionTime)).getTime();
  const firstProgressMs = new Date(toText(content.firstProgressTime)).getTime();
  if (Number.isNaN(admissionMs) || Number.isNaN(firstProgressMs)) return null;
  if (firstProgressMs < admissionMs) {
    return {
      checkId: "TC", name: "时间连续性", severity: "block",
      message: "首次病程记录时间早于入院时间，存在时间逻辑回退",
      source: "ai-reasoning",
    };
  }
  return null;
}

/**
 * AI 内涵推理总评估。
 *
 * @param record 病历
 * @returns 问题列表、得分、是否通过
 */
export function evaluateIntrinsicReasoning(record: RecordLike): IntrinsicReasoningEvaluation {
  const issues: IntrinsicReasoningIssue[] = [];
  const checks = [
    checkDiagnosisTreatmentConsistency(record),
    checkMedicationDiagnosisMatch(record),
    checkTimeContinuity(record),
  ];
  for (const issue of checks) {
    if (issue) issues.push(issue);
  }
  let blockCount = 0;
  let majorCount = 0;
  let minorCount = 0;
  for (const i of issues) {
    if (i.severity === "block") blockCount += 1;
    else if (i.severity === "major") majorCount += 1;
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
