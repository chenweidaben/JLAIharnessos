/**
 * 健澜科技 jlmedaios - 输血质量管理 V13 纯函数（M430-D，M430 收官，-quality 后缀避让旧版 bloodTransfusionDetailV13（M421））
 *
 * computeBloodTransfusionIndicationAppropriateRateV13 / computeBloodTransfusionPreCheckCompleteRateV13 / computeBloodTransfusionReactionOccurrenceRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 输血质量管理记录 */
export interface BloodTransfusionQualityMgmtRecordV13 {
  indicationAppropriate: number;
  preCheckComplete: number;
  reactionOccurrence: number;
  transfusionTotal: number;
}

/**
 * 输血适应症合理率（纯函数）：合理输血例数/输血总数×100，保留 2 位小数。
 *
 * @param records 输血质量管理记录列表
 * @returns 输血适应症合理率百分比
 */
export function computeBloodTransfusionIndicationAppropriateRateV13(records: BloodTransfusionQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.transfusionTotal, 0);
  if (total === 0) return 0;
  const appropriate = records.reduce((acc, r) => acc + r.indicationAppropriate, 0);
  return Math.round((appropriate / total) * 10000) / 100;
}

/**
 * 输血前检查完整率（纯函数）：完整检查例数/输血总数×100，保留 2 位小数。
 *
 * @param records 输血质量管理记录列表
 * @returns 输血前检查完整率百分比
 */
export function computeBloodTransfusionPreCheckCompleteRateV13(records: BloodTransfusionQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.transfusionTotal, 0);
  if (total === 0) return 0;
  const complete = records.reduce((acc, r) => acc + r.preCheckComplete, 0);
  return Math.round((complete / total) * 10000) / 100;
}

/**
 * 输血反应发生率（纯函数，百分率%，反向指标，值越低越好）：发生反应例数/输血总数×100，保留 2 位小数。
 *
 * @param records 输血质量管理记录列表
 * @returns 输血反应发生率百分比
 */
export function computeBloodTransfusionReactionOccurrenceRateV13(records: BloodTransfusionQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.transfusionTotal, 0);
  if (total === 0) return 0;
  const reaction = records.reduce((acc, r) => acc + r.reactionOccurrence, 0);
  return Math.round((reaction / total) * 10000) / 100;
}
