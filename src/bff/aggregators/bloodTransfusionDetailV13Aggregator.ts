/**
 * 健澜科技 jlmedaios - 输血管理（细节）V13 纯函数（M421-C，detail 避让旧版 bloodTransfusionMgmtV13）
 *
 * computeTransfusionIndicationReasonableRateV13 / computePreTransfusionCheckCompleteRateV13 / computeTransfusionReactionOccurrenceRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 输血管理（细节）记录 */
export interface BloodTransfusionDetailRecordV13 {
  reasonableIndication: number;
  preCheckComplete: number;
  reactionOccurred: number;
  transfusionTotal: number;
}

/**
 * 输血适应症合理率（纯函数）：合理输血例数/输血总例数×100，保留 2 位小数。
 *
 * @param records 输血管理（细节）记录列表
 * @returns 输血适应症合理率百分比
 */
export function computeTransfusionIndicationReasonableRateV13(records: BloodTransfusionDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.transfusionTotal, 0);
  if (total === 0) return 0;
  const reasonableIndication = records.reduce((acc, r) => acc + r.reasonableIndication, 0);
  return Math.round((reasonableIndication / total) * 10000) / 100;
}

/**
 * 输血前检查完整率（纯函数）：完整检查例数/输血总例数×100，保留 2 位小数。
 *
 * @param records 输血管理（细节）记录列表
 * @returns 输血前检查完整率百分比
 */
export function computePreTransfusionCheckCompleteRateV13(records: BloodTransfusionDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.transfusionTotal, 0);
  if (total === 0) return 0;
  const preCheckComplete = records.reduce((acc, r) => acc + r.preCheckComplete, 0);
  return Math.round((preCheckComplete / total) * 10000) / 100;
}

/**
 * 输血反应发生率（纯函数，反向指标，值越低越好）：发生反应例数/输血总例数×100，保留 2 位小数。
 *
 * @param records 输血管理（细节）记录列表
 * @returns 输血反应发生率百分比
 */
export function computeTransfusionReactionOccurrenceRateV13(records: BloodTransfusionDetailRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.transfusionTotal, 0);
  if (total === 0) return 0;
  const reactionOccurred = records.reduce((acc, r) => acc + r.reactionOccurred, 0);
  return Math.round((reactionOccurred / total) * 10000) / 100;
}
