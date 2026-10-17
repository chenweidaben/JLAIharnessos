/**
 * 健澜科技 jlmedaios - 导医服务 V13 纯函数（M378-B）
 *
 * computeGuideServiceCountV13 / computeTriageAccuracyRateV13 / computeAccessibilityServiceCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 导医服务记录 */
export interface GuideServiceRecordV13 {
  guideServiceCount: number;
  triageTotalCount: number;
  triageAccurateCount: number;
  accessibilityServiceCount: number;
}

/**
 * 导医服务人次（纯函数）：求和。
 *
 * @param records 导医服务记录列表
 * @returns 导医服务人次
 */
export function computeGuideServiceCountV13(records: GuideServiceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.guideServiceCount, 0);
}

/**
 * 分诊准确率（纯函数）：准确数/分诊总数×100，保留 2 位小数。
 *
 * @param records 导医服务记录列表
 * @returns 分诊准确率百分比
 */
export function computeTriageAccuracyRateV13(records: GuideServiceRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.triageTotalCount, 0);
  if (total === 0) return 0;
  const accurate = records.reduce((acc, r) => acc + r.triageAccurateCount, 0);
  return Math.round((accurate / total) * 10000) / 100;
}

/**
 * 无障碍服务人次（纯函数）：求和。
 *
 * @param records 导医服务记录列表
 * @returns 无障碍服务人次
 */
export function computeAccessibilityServiceCountV13(records: GuideServiceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.accessibilityServiceCount, 0);
}
