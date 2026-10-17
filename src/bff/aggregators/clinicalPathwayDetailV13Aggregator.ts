/**
 * 健澜科技 jlmedaios - 临床路径管理（细节）V13 纯函数（M414-B，detail 避让旧版 clinicalPathwayMgmtV13）
 *
 * computeClinicalPathwayEntryRateV13 / computeClinicalPathwayCompletionRateV13 / computeClinicalPathwayVariationRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 临床路径管理（细节）记录 */
export interface ClinicalPathwayDetailRecordV13 {
  entered: number;
  shouldEnterTotal: number;
  completed: number;
  enteredTotal: number;
  variation: number;
  pathwayTotal: number;
}

/**
 * 入径率（纯函数）：入径患者数/应入径患者总数×100，保留 2 位小数。
 *
 * @param records 临床路径管理（细节）记录列表
 * @returns 入径率百分比
 */
export function computeClinicalPathwayEntryRateV13(records: ClinicalPathwayDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldEnterTotal, 0);
  if (total === 0) return 0;
  const entered = records.reduce((acc, r) => acc + r.entered, 0);
  return Math.round((entered / total) * 10000) / 100;
}

/**
 * 路径完成率（纯函数）：完成路径患者数/入径患者总数×100，保留 2 位小数。
 *
 * @param records 临床路径管理（细节）记录列表
 * @returns 路径完成率百分比
 */
export function computeClinicalPathwayCompletionRateV13(records: ClinicalPathwayDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.enteredTotal, 0);
  if (total === 0) return 0;
  const completed = records.reduce((acc, r) => acc + r.completed, 0);
  return Math.round((completed / total) * 10000) / 100;
}

/**
 * 变异率（纯函数，反向指标，值越低越好）：发生变异例数/路径总例数×100，保留 2 位小数。
 *
 * @param records 临床路径管理（细节）记录列表
 * @returns 变异率百分比
 */
export function computeClinicalPathwayVariationRateV13(records: ClinicalPathwayDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.pathwayTotal, 0);
  if (total === 0) return 0;
  const variation = records.reduce((acc, r) => acc + r.variation, 0);
  return Math.round((variation / total) * 10000) / 100;
}
