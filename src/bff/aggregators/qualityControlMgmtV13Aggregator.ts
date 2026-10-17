/**
 * 健澜科技 jlmedaios - 质控管理 V13 纯函数（M419-D，M419 收官）
 *
 * computeQualityControlGroupActivityRateV13 / computeQualityIssueRectificationRateV13 / computeQualityIndicatorAchieveRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 质控管理记录 */
export interface QualityControlMgmtRecordV13 {
  groupActivityDone: number;
  groupActivityShould: number;
  issueRectified: number;
  issueTotal: number;
  indicatorAchieved: number;
  indicatorTotal: number;
}

/**
 * 质控小组活动完成率（纯函数）：已完成活动次数/应完成次数×100，保留 2 位小数。
 *
 * @param records 质控管理记录列表
 * @returns 质控小组活动完成率百分比
 */
export function computeQualityControlGroupActivityRateV13(records: QualityControlMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.groupActivityShould, 0);
  if (total === 0) return 0;
  const groupActivityDone = records.reduce((acc, r) => acc + r.groupActivityDone, 0);
  return Math.round((groupActivityDone / total) * 10000) / 100;
}

/**
 * 质控问题整改率（纯函数）：已整改问题数/问题总数×100，保留 2 位小数。
 *
 * @param records 质控管理记录列表
 * @returns 质控问题整改率百分比
 */
export function computeQualityIssueRectificationRateV13(records: QualityControlMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.issueTotal, 0);
  if (total === 0) return 0;
  const issueRectified = records.reduce((acc, r) => acc + r.issueRectified, 0);
  return Math.round((issueRectified / total) * 10000) / 100;
}

/**
 * 质控指标达标率（纯函数）：达标指标数/指标总数×100，保留 2 位小数。
 *
 * @param records 质控管理记录列表
 * @returns 质控指标达标率百分比
 */
export function computeQualityIndicatorAchieveRateV13(records: QualityControlMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.indicatorTotal, 0);
  if (total === 0) return 0;
  const indicatorAchieved = records.reduce((acc, r) => acc + r.indicatorAchieved, 0);
  return Math.round((indicatorAchieved / total) * 10000) / 100;
}
