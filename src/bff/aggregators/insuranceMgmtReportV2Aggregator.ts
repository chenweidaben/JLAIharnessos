/**
 * 健澜科技 jlmedaios - 医保管理 V2 纯函数（M226-A）
 *
 * buildInsuranceMgmtReportV2 / assessDRGGrouping / calculateInsuranceReimbursement
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估 DRG 分组（纯函数）。
 *
 * @param diagnosis 主诊断数
 * @param procedures 手术操作数
 * @returns 分组结果
 */
export function assessDRGGrouping(diagnosis: number, procedures: number): { group: string; weight: number } {
  let group = '内科组';
  let weight = 1.0;
  if (procedures > 0) {
    group = '外科组';
    weight = 2.5;
  }
  if (diagnosis >= 3) weight += 0.5;
  return { group, weight };
}

/**
 * 计算医保报销（纯函数）。
 *
 * @param bill 总费用
 * @param policy 报销比例
 * @returns 报销金额
 */
export function calculateInsuranceReimbursement(bill: number, policy: number): { reimbursement: number; patientPay: number } {
  const reimbursement = Math.round(bill * policy * 100) / 100;
  return { reimbursement, patientPay: bill - reimbursement };
}

/** 医保管理 V2 报告输出 */
export interface InsuranceMgmtReportV2 {
  timeRange: string;
  policy: { employee: number; resident: number; catastrophic: number; relief: number; crossRegion: number };
  settlement: { outpatient: number; inpatient: number; realtime: boolean };
  audit: { reviewed: number; flagged: number };
  monitoring: { cases: number };
  drg: { groups: number; points: number; profit: number };
  payment: { received: number };
  assessment: { score: number };
  service: { satisfaction: number };
  suggestions: string[];
}

/**
 * 构建医保管理 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 医保管理 V2 报告
 */
export function buildInsuranceMgmtReportV2(timeRange: string): InsuranceMgmtReportV2 {
  return {
    timeRange,
    policy: { employee: 30000, resident: 20000, catastrophic: 5000, relief: 2000, crossRegion: 8000 },
    settlement: { outpatient: 80000, inpatient: 6000, realtime: true },
    audit: { reviewed: 8000, flagged: 200 },
    monitoring: { cases: 150 },
    drg: { groups: 500, points: 50000, profit: 1000000 },
    payment: { received: 50000000 },
    assessment: { score: 90 },
    service: { satisfaction: 88 },
    suggestions: ['优化 DRG 分组', '降低智能监控违规率'],
  };
}
