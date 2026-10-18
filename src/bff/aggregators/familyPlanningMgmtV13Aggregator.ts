/**
 * 健澜科技 jlmedaios - 计划生育技术服务 V13 纯函数（M442-D，M442 收官，妇幼健康与计划生育管理组）
 *
 * computeFamilyPlanningCounselingRateV13 / computeFamilyPlanningComplicationRateV13 / computeFamilyPlanningFollowUpRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 计划生育技术服务记录 */
export interface FamilyPlanningMgmtRecordV13 {
  counseled: number;
  shouldCounsel: number;
  complicationCount: number;
  totalSurgery: number;
  followedUp: number;
  shouldFollowUp: number;
}

/**
 * 避孕节育咨询率（纯函数）：已咨询避孕节育人数/应咨询人数×100，保留 2 位小数。
 *
 * @param records 计划生育技术服务记录列表
 * @returns 避孕节育咨询率百分比
 */
export function computeFamilyPlanningCounselingRateV13(records: FamilyPlanningMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldCounsel, 0);
  if (total === 0) return 0;
  const counseled = records.reduce((acc, r) => acc + r.counseled, 0);
  return Math.round((counseled / total) * 10000) / 100;
}

/**
 * 手术并发症发生率（纯函数，反向指标，越低越好）：手术并发症例数/计划生育手术总例数×100，保留 2 位小数。
 *
 * @param records 计划生育技术服务记录列表
 * @returns 手术并发症发生率百分比
 */
export function computeFamilyPlanningComplicationRateV13(records: FamilyPlanningMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalSurgery, 0);
  if (total === 0) return 0;
  const complication = records.reduce((acc, r) => acc + r.complicationCount, 0);
  return Math.round((complication / total) * 10000) / 100;
}

/**
 * 随访率（纯函数）：已随访人数/应随访人数×100，保留 2 位小数。
 *
 * @param records 计划生育技术服务记录列表
 * @returns 随访率百分比
 */
export function computeFamilyPlanningFollowUpRateV13(records: FamilyPlanningMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldFollowUp, 0);
  if (total === 0) return 0;
  const followed = records.reduce((acc, r) => acc + r.followedUp, 0);
  return Math.round((followed / total) * 10000) / 100;
}
