/**
 * 健澜科技 jlmedaios - 应急演练管理 V13 纯函数（M447-A，应急管理与安全生产管理组）
 *
 * computeEmergencyDrillPlanCompletionRateV13 / computeEmergencyDrillSubjectCoverageRateV13 / computeEmergencyDrillAssessmentQualifiedRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 应急演练管理记录 */
export interface EmergencyDrillMgmtRecordV13 {
  completedDrill: number;
  plannedDrill: number;
  coveredSubject: number;
  totalSubject: number;
  qualifiedDrill: number;
  totalDrill: number;
}

/**
 * 年度演练计划完成率（纯函数）：已完成演练次数/年度演练计划次数×100，保留 2 位小数。
 *
 * @param records 应急演练管理记录列表
 * @returns 年度演练计划完成率百分比
 */
export function computeEmergencyDrillPlanCompletionRateV13(records: EmergencyDrillMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.plannedDrill, 0);
  if (total === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completedDrill, 0);
  return Math.round((completed / total) * 10000) / 100;
}

/**
 * 演练科目覆盖率（纯函数）：已开展演练科目数/应开展演练科目总数×100，保留 2 位小数。
 *
 * @param records 应急演练管理记录列表
 * @returns 演练科目覆盖率百分比
 */
export function computeEmergencyDrillSubjectCoverageRateV13(records: EmergencyDrillMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalSubject, 0);
  if (total === 0) return 0;
  const covered = records.reduce((acc, r) => acc + r.coveredSubject, 0);
  return Math.round((covered / total) * 10000) / 100;
}

/**
 * 演练评估合格率（纯函数）：评估合格演练次数/演练总次数×100，保留 2 位小数。
 *
 * @param records 应急演练管理记录列表
 * @returns 演练评估合格率百分比
 */
export function computeEmergencyDrillAssessmentQualifiedRateV13(records: EmergencyDrillMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalDrill, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualifiedDrill, 0);
  return Math.round((qualified / total) * 10000) / 100;
}
