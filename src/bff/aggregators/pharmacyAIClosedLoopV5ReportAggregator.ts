/**
 * 健澜科技 jlmedaios - AI 药事全流程闭环 V5 纯函数（M258-D）
 *
 * buildPharmacyAIClosedLoopV5Report / reviewPrescriptionV5 / predictAdherenceV5
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 审核处方 V5（纯函数）。
 *
 * @param rx 处方
 * @param patient 患者
 * @returns 审核
 */
export function reviewPrescriptionV5(rx: { drug: string; dose: number; frequency: string }, patient: { age: number; renal: string }): { pass: boolean; issues: string[]; suggestion: string } {
  const issues: string[] = [];
  if (patient.age >= 65 && rx.dose > 100) issues.push("老年人剂量偏高");
  if (patient.renal === "poor" && rx.drug === "氨基糖苷") issues.push("肾功能不全禁用");
  if (rx.frequency === "qid" && rx.dose > 200) issues.push("剂量超限");
  return { pass: issues.length === 0, issues, suggestion: issues.length === 0 ? "通过" : "需调整" };
}

/**
 * 预测依从性 V5（纯函数）。
 *
 * @param patient 患者
 * @param regimen 方案
 * @returns 依从性
 */
export function predictAdherenceV5(patient: { education: string; income: string }, regimen: { frequency: number; duration: number; cost: number }): { probability: number; risk: string; intervention: string } {
  let probability = 80;
  if (patient.education === "小学") probability -= 10;
  if (patient.income === "低") probability -= 10;
  if (regimen.frequency > 3) probability -= 15;
  if (regimen.duration > 30) probability -= 10;
  if (regimen.cost > 1000) probability -= 10;
  probability = Math.max(probability, 20);
  return { probability, risk: probability < 60 ? "高风险" : "低风险", intervention: probability < 60 ? "智能提醒+药师随访" : "常规" };
}

/** AI 药事全流程闭环 V5 报告输出 */
export interface PharmacyAIClosedLoopV5Report {
  timeRange: string;
  preReview: { aiReview: number; interaction: number; dose: number; specialPop: number; rationalUse: number };
  pivas: { smartDispense: number; check: number; handover: number; counseling: number };
  medication: { medReminder: number; adherence: number; adrMonitor: number; tdm: number; efficacyTrack: number };
  stop: { discontinue: number; adjust: number; tdmFollow: number; courseEnd: number; medReconciliation: number; stopEval: number };
  quality: { rxPass: number; adrReport: number; antibioticDdd: number; unreasonableIntercept: number };
  aiMetrics: { reviewAccuracy: number; adherenceImprove: number; adrEarly: number; loopRate: number };
  suggestions: string[];
}

/**
 * 构建 AI 药事全流程闭环 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns AI 药事全流程闭环 V5 报告
 */
export function buildPharmacyAIClosedLoopV5Report(timeRange: string): PharmacyAIClosedLoopV5Report {
  return {
    timeRange,
    preReview: { aiReview: 95, interaction: 90, dose: 92, specialPop: 85, rationalUse: 93 },
    pivas: { smartDispense: 80, check: 99, handover: 95, counseling: 90 },
    medication: { medReminder: 85, adherence: 75, adrMonitor: 80, tdm: 60, efficacyTrack: 70 },
    stop: { discontinue: 85, adjust: 70, tdmFollow: 55, courseEnd: 90, medReconciliation: 80, stopEval: 75 },
    quality: { rxPass: 98, adrReport: 60, antibioticDdd: 40, unreasonableIntercept: 95 },
    aiMetrics: { reviewAccuracy: 92, adherenceImprove: 20, adrEarly: 70, loopRate: 80 },
    suggestions: ["提升 ADR 上报率", "加强 TDM 随访"],
  };
}
