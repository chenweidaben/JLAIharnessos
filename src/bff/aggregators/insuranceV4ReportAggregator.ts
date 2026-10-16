/**
 * 健澜科技 jlmedaios - 医保 V4 纯函数（M252-C）
 *
 * buildInsuranceV4Report / assessDRGGroupingV4 / calculateInsuranceReimbursementV4
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估 DRG 分组 V4（纯函数）。
 *
 * @param diagnosis 诊断
 * @param procedures 手术
 * @returns 分组
 */
export function assessDRGGroupingV4(diagnosis: string, procedures: string[]): { drg: string; weight: number; grouper: boolean } {
  let drg = "内科组";
  let weight = 1.0;
  if (procedures.length > 0) {
    drg = "外科组";
    weight = 2.5;
  }
  if (diagnosis.includes("心梗")) weight = 3.0;
  return { drg, weight, grouper: weight >= 1 };
}

/**
 * 计算医保报销 V4（纯函数）。
 *
 * @param bill 账单
 * @param policy 政策
 * @returns 报销
 */
export function calculateInsuranceReimbursementV4(bill: { total: number; selfPay: number }, policy: { ratio: number; cap: number }): { total: number; reimbursement: number; patientPay: number } {
  const covered = bill.total - bill.selfPay;
  let reimbursement = covered * policy.ratio;
  if (reimbursement > policy.cap) reimbursement = policy.cap;
  const patientPay = bill.total - reimbursement;
  return { total: bill.total, reimbursement: Math.round(reimbursement), patientPay: Math.round(patientPay) };
}

/** 医保 V4 报告输出 */
export interface InsuranceV4Report {
  timeRange: string;
  policy: { employee: number; resident: number; catastrophic: number; relocation: number };
  drg: { grouping: number; weight: number; point: number; profitLoss: number };
  settlement: { realtime: number; yearend: number; smart: number };
  review: { preAlert: number; postReview: number; abnormal: number; appeal: number };
  payment: { prepaid: number; perCase: number; perDiem: number; perCapita: number };
  assessment: { score: number; ranking: number; penalty: number; credit: number };
  suggestions: string[];
}

/**
 * 构建医保 V4 报告。
 *
 * @param timeRange 时间范围
 * @returns 医保 V4 报告
 */
export function buildInsuranceV4Report(timeRange: string): InsuranceV4Report {
  return {
    timeRange,
    policy: { employee: 5000, resident: 3000, catastrophic: 200, relocation: 100 },
    drg: { grouping: 4000, weight: 1.2, point: 10000, profitLoss: 500 },
    settlement: { realtime: 8000, yearend: 500, smart: 95 },
    review: { preAlert: 10000, postReview: 5000, abnormal: 200, appeal: 50 },
    payment: { prepaid: 10000, perCase: 4000, perDiem: 500, perCapita: 100 },
    assessment: { score: 85, ranking: 10, penalty: 0, credit: 90 },
    suggestions: ["提升 DRG 入组率", "降低异常费用"],
  };
}
