/**
 * 健澜科技 jlmedaios - 处方点评与药师反馈 V7 纯函数（M289-B）
 *
 * reviewPrescriptionV7 / computeRationalRateV7 / rankDeptV7
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** CDS 审核结果 */
export interface CdsResultV7 {
  pass: boolean;
  criticalCount: number;
  warningCount: number;
}

/** 处方点评结果 */
export interface PrescriptionReview {
  prescriptionId: string;
  reviewer: string;
  result: "合理" | "不合理";
  comment: string;
}

/** 科室用药样本 */
export interface DrugUsage {
  drugCode: string;
  dept: string;
  rational: number;
  sampleCnt: number;
}

/**
 * 点评结论 V7（纯函数）：cdsResult.pass=true 即"合理"，否则"不合理"。
 *
 * @param cdsResult CDS 审核结果
 * @param reviewer 点评药师
 * @param comment 点评意见
 * @returns 点评结果
 */
export function reviewPrescriptionV7(cdsResult: CdsResultV7, reviewer: string, comment: string): PrescriptionReview {
  return {
    prescriptionId: `rx-${Date.now()}`,
    reviewer,
    result: cdsResult.pass ? "合理" : "不合理",
    comment,
  };
}

/**
 * 合理用药率 V7（纯函数）：sum(rational)/sum(sample_cnt)×100，保留一位小数。
 *
 * @param samples 科室样本列表
 * @returns 合理率%
 */
export function computeRationalRateV7(samples: DrugUsage[]): number {
  const totalRational = samples.reduce((s, x) => s + x.rational, 0);
  const total = samples.reduce((s, x) => s + x.sampleCnt, 0);
  if (total === 0) return 0;
  return Math.round((totalRational / total) * 1000) / 10;
}

/**
 * 科室排名 V7（纯函数）：按 rational_rate 降序。
 *
 * @param usages 用药列表
 * @returns 排名
 */
export function rankDeptV7(usages: DrugUsage[]): { dept: string; rationalRate: number; rank: number }[] {
  const byDept = new Map<string, { rational: number; sample: number }>();
  for (const u of usages) {
    const cur = byDept.get(u.dept) ?? { rational: 0, sample: 0 };
    cur.rational += u.rational;
    cur.sample += u.sampleCnt;
    byDept.set(u.dept, cur);
  }
  return Array.from(byDept.entries())
    .map(([dept, v]) => ({
      dept,
      rationalRate: v.sample > 0 ? Math.round((v.rational / v.sample) * 1000) / 10 : 0,
      rank: 0,
    }))
    .sort((a, b) => b.rationalRate - a.rationalRate)
    .map((d, idx) => ({ ...d, rank: idx + 1 }));
}
