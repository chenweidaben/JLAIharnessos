/**
 * 健澜科技 jlmedaios - 器官移植与血液净化纯函数（M203-C）
 *
 * buildTransplantReport / assessTransplantCompatibility / calculateDialysisAdequacy
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 供体 */
export interface Donor {
  bloodType: string;
  hlaMatch: number;
}

/** 受体 */
export interface Recipient {
  bloodType: string;
  hlaMatch: number;
}

/**
 * 评估移植相容性（纯函数）。
 *
 * @param donor 供体
 * @param recipient 受体
 * @returns 相容性
 */
export function assessTransplantCompatibility(donor: Donor, recipient: Recipient): { compatible: boolean; score: number; level: string } {
  let score = 0;
  if (donor.bloodType === recipient.bloodType) score += 4;
  else if (donor.bloodType === 'O' || recipient.bloodType === 'AB') score += 2;
  score += Math.min(6, donor.hlaMatch * 2);

  let level = '不相容';
  if (score >= 8) level = '优良';
  else if (score >= 5) level = '可接受';

  return { compatible: score >= 5, score, level };
}

/**
 * 计算透析充分性（纯函数）。
 *
 * @param ktv Kt/V 值
 * @param urr URR 值（百分比）
 * @returns 充分性
 */
export function calculateDialysisAdequacy(ktv: number, urr: number): { adequate: boolean; level: string } {
  let level = '不充分';
  if (ktv >= 1.4 && urr >= 70) level = '充分';
  else if (ktv >= 1.2 && urr >= 65) level = '基本充分';
  return { adequate: ktv >= 1.2 && urr >= 65, level };
}

/** 移植报告输出 */
export interface TransplantReport {
  timeRange: string;
  waiting: { list: number; avgWaitMonths: number; deceasedDonor: number; livingDonor: number };
  kidney: { transplants: number; oneYearSurvival: number };
  liver: { transplants: number; oneYearSurvival: number };
  hsct: { transplants: number; engraftment: number; gvhdRate: number };
  dialysis: { patients: number; hd: number; hdf: number; crrt: number; ktvAvg: number };
  followup: { graftSurvivalRate: number };
  ethics: { approved: number };
  suggestions: string[];
}

/**
 * 构建移植报告。
 *
 * @param timeRange 时间范围
 * @returns 移植报告
 */
export function buildTransplantReport(timeRange: string): TransplantReport {
  return {
    timeRange,
    waiting: { list: 150, avgWaitMonths: 12, deceasedDonor: 30, livingDonor: 20 },
    kidney: { transplants: 40, oneYearSurvival: 0.95 },
    liver: { transplants: 15, oneYearSurvival: 0.85 },
    hsct: { transplants: 10, engraftment: 0.9, gvhdRate: 0.3 },
    dialysis: { patients: 300, hd: 250, hdf: 40, crrt: 10, ktvAvg: 1.4 },
    followup: { graftSurvivalRate: 0.9 },
    ethics: { approved: 20 },
    suggestions: ['扩大供体来源', '提高透析充分性达标率'],
  };
}
