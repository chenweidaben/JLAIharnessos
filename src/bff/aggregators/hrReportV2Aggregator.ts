/**
 * 健澜科技 jlmedaios - 人力资源与薪酬管理 V2 纯函数（M211-C）
 *
 * buildHRReportV2 / calculateTurnoverRate / assessStaffingRatio
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 计算离职率（纯函数）。
 *
 * @param staff 期初人数
 * @param left 离职人数
 * @returns 离职率
 */
export function calculateTurnoverRate(staff: number, left: number): { rate: number; level: string } {
  const rate = staff > 0 ? left / staff : 0;
  let level = '正常';
  if (rate > 0.1) level = '偏高';
  else if (rate < 0.03) level = '稳定';
  return { rate, level };
}

/**
 * 评估医护比（纯函数）。
 *
 * @param doctors 医生数
 * @param nurses 护士数
 * @param beds 床位数
 * @returns 床护比与医护比
 */
export function assessStaffingRatio(doctors: number, nurses: number, beds: number): { nurseBedRatio: number; doctorNurseRatio: number; adequate: boolean } {
  const nurseBedRatio = beds > 0 ? nurses / beds : 0;
  const doctorNurseRatio = doctors > 0 ? nurses / doctors : 0;
  const adequate = nurseBedRatio >= 0.4 && doctorNurseRatio >= 2;
  return { nurseBedRatio, doctorNurseRatio, adequate };
}

/** 人力资源 V2 报告输出 */
export interface HRReportV2 {
  timeRange: string;
  personnel: { total: number; onBoard: number; offBoard: number };
  schedule: { shifts: number };
  attendance: { rate: number };
  compensation: { avgSalary: number; socialInsurance: number };
  training: { hours: number };
  talent: { pipeline: number };
  relations: { satisfaction: number };
  establishment: { approved: number; actual: number };
  suggestions: string[];
}

/**
 * 构建人力资源 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 人力资源 V2 报告
 */
export function buildHRReportV2(timeRange: string): HRReportV2 {
  return {
    timeRange,
    personnel: { total: 2000, onBoard: 50, offBoard: 30 },
    schedule: { shifts: 100 },
    attendance: { rate: 0.98 },
    compensation: { avgSalary: 15000, socialInsurance: 0.3 },
    training: { hours: 40 },
    talent: { pipeline: 200 },
    relations: { satisfaction: 0.85 },
    establishment: { approved: 2200, actual: 2000 },
    suggestions: ['降低离职率', '提高床护比'],
  };
}
