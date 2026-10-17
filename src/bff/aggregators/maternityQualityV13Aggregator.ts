/**
 * 健澜科技 jlmedaios - 产科质量 V13 纯函数（M349-A）
 *
 * computeCesareanRateV13 / computeEpisiotomyRateV13 / computePostpartumHemorrhageRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 产科质量记录 */
export interface MaternityQualityRecordV13 {
  cesareanCount: number;
  totalDeliveryCount: number;
  episiotomyCount: number;
  vaginalDeliveryCount: number;
  postpartumHemorrhageCount: number;
}

/**
 * 剖宫产率（纯函数）：剖宫产数/总分娩数×100，保留 2 位小数。
 *
 * @param records 产科质量记录列表
 * @returns 剖宫产率百分比
 */
export function computeCesareanRateV13(records: MaternityQualityRecordV13[]): number {
  const cesarean = records.reduce((acc, r) => acc + r.cesareanCount, 0);
  const total = records.reduce((acc, r) => acc + r.totalDeliveryCount, 0);
  if (total === 0) return 0;
  return Math.round((cesarean / total) * 10000) / 100;
}

/**
 * 会阴侧切率（纯函数）：侧切数/顺产数×100，保留 2 位小数。
 *
 * @param records 产科质量记录列表
 * @returns 会阴侧切率百分比
 */
export function computeEpisiotomyRateV13(records: MaternityQualityRecordV13[]): number {
  const episiotomy = records.reduce((acc, r) => acc + r.episiotomyCount, 0);
  const vaginal = records.reduce((acc, r) => acc + r.vaginalDeliveryCount, 0);
  if (vaginal === 0) return 0;
  return Math.round((episiotomy / vaginal) * 10000) / 100;
}

/**
 * 产后出血率（纯函数）：出血数/总分娩数×100，保留 2 位小数。
 *
 * @param records 产科质量记录列表
 * @returns 产后出血率百分比
 */
export function computePostpartumHemorrhageRateV13(records: MaternityQualityRecordV13[]): number {
  const hemorrhage = records.reduce((acc, r) => acc + r.postpartumHemorrhageCount, 0);
  const total = records.reduce((acc, r) => acc + r.totalDeliveryCount, 0);
  if (total === 0) return 0;
  return Math.round((hemorrhage / total) * 10000) / 100;
}
