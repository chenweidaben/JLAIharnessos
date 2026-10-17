/**
 * 健澜科技 jlmedaios - 临床路径管理 V13 纯函数（M421-D，M421 收官，换名避让旧版 clinicalPathwayDetailV13）
 *
 * computeClinicalPathwayEnrollmentRateV13 / computeClinicalPathwayCompletionRateV13 / computeClinicalPathwayVariationRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 临床路径管理记录 */
export interface ClinicalPathwayMgmtRecordV13 {
  enrolled: number;
  shouldEnroll: number;
  completed: number;
  variation: number;
}

/**
 * 临床路径入径率（纯函数）：入径例数/应入径例数×100，保留 2 位小数。
 *
 * @param records 临床路径管理记录列表
 * @returns 临床路径入径率百分比
 */
export function computeClinicalPathwayEnrollmentRateV13(records: ClinicalPathwayMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldEnroll, 0);
  if (total === 0) return 0;
  const enrolled = records.reduce((acc, r) => acc + r.enrolled, 0);
  return Math.round((enrolled / total) * 10000) / 100;
}

/**
 * 临床路径完成率（纯函数）：完成例数/入径例数×100，保留 2 位小数。
 *
 * @param records 临床路径管理记录列表
 * @returns 临床路径完成率百分比
 */
export function computeClinicalPathwayCompletionRateV13(records: ClinicalPathwayMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.enrolled, 0);
  if (total === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completed, 0);
  return Math.round((completed / total) * 10000) / 100;
}

/**
 * 临床路径变异率（纯函数，反向指标，值越低越好）：变异例数/入径例数×100，保留 2 位小数。
 *
 * @param records 临床路径管理记录列表
 * @returns 临床路径变异率百分比
 */
export function computeClinicalPathwayVariationRateV13(records: ClinicalPathwayMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.enrolled, 0);
  if (total === 0) return 0;
  const variation = records.reduce((acc, r) => acc + r.variation, 0);
  return Math.round((variation / total) * 10000) / 100;
}
