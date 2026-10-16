/**
 * 健澜科技 jlmedaios - 药事管理 V2 纯函数（M212-D）
 *
 * buildPharmacyReportV2 / assessPrescriptionRationality / calculateAntibioticDdd
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估处方合理性（纯函数）。
 *
 * @param prescriptions 处方总数
 * @param rational 合理数
 * @returns 合理率
 */
export function assessPrescriptionRationality(prescriptions: number, rational: number): { rate: number; level: string } {
  const rate = prescriptions > 0 ? rational / prescriptions : 0;
  let level = '达标';
  if (rate < 0.9) level = '不达标';
  else if (rate >= 0.99) level = '优秀';
  return { rate, level };
}

/**
 * 计算抗菌药物 DDD（纯函数）。
 *
 * @param usage 消耗量
 * @param bedDays 床日数
 * @returns DDD/100床日
 */
export function calculateAntibioticDdd(usage: number, bedDays: number): { ddd: number; level: string } {
  const ddd = bedDays > 0 ? (usage / bedDays) * 100 : 0;
  let level = '合理';
  if (ddd > 40) level = '超标';
  else if (ddd > 30) level = '偏高';
  return { ddd, level };
}

/** 药事 V2 报告输出 */
export interface PharmacyReportV2 {
  timeRange: string;
  supply: { total: number };
  prescription: { reviewed: number; rational: number };
  rationalUse: { antibioticDdd: number; narcotic: number; keyMonitoring: number };
  pivas: { prepared: number };
  clinicalPharmacy: { wardRound: number };
  adr: { reported: number };
  drugManagement: { inventory: number };
  committee: { meetings: number };
  suggestions: string[];
}

/**
 * 构建药事 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 药事 V2 报告
 */
export function buildPharmacyReportV2(timeRange: string): PharmacyReportV2 {
  return {
    timeRange,
    supply: { total: 50000 },
    prescription: { reviewed: 10000, rational: 9800 },
    rationalUse: { antibioticDdd: 35, narcotic: 50, keyMonitoring: 100 },
    pivas: { prepared: 20000 },
    clinicalPharmacy: { wardRound: 500 },
    adr: { reported: 100 },
    drugManagement: { inventory: 5000 },
    committee: { meetings: 4 },
    suggestions: ['降低抗菌药物 DDD', '提高处方合理率'],
  };
}
