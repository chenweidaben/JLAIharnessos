/**
 * 健澜科技 jlmedaios - 输血管理 V13 纯函数（M414-A）
 *
 * computeBloodTransfusionIndicationPassRateV13 / computeBloodTransfusionReactionRateV13 / computeBloodTransfusionRecordCompletenessRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 输血管理记录 */
export interface BloodTransfusionMgmtRecordV13 {
  indicationQualified: number;
  transfusionTotal: number;
  reaction: number;
  caseTotal: number;
  complete: number;
  recordTotal: number;
}

/**
 * 输血适应证合格率（纯函数）：适应证合格数/输血总数×100，保留 2 位小数。
 *
 * @param records 输血管理记录列表
 * @returns 输血适应证合格率百分比
 */
export function computeBloodTransfusionIndicationPassRateV13(records: BloodTransfusionMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.transfusionTotal, 0);
  if (total === 0) return 0;
  const indicationQualified = records.reduce((acc, r) => acc + r.indicationQualified, 0);
  return Math.round((indicationQualified / total) * 10000) / 100;
}

/**
 * 输血反应发生率（纯函数，反向指标，值越低越好）：反应例数/输血总例数×100，保留 2 位小数。
 *
 * @param records 输血管理记录列表
 * @returns 输血反应发生率百分比
 */
export function computeBloodTransfusionReactionRateV13(records: BloodTransfusionMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.caseTotal, 0);
  if (total === 0) return 0;
  const reaction = records.reduce((acc, r) => acc + r.reaction, 0);
  return Math.round((reaction / total) * 10000) / 100;
}

/**
 * 输血记录完整率（纯函数）：完整记录数/输血记录总数×100，保留 2 位小数。
 *
 * @param records 输血管理记录列表
 * @returns 输血记录完整率百分比
 */
export function computeBloodTransfusionRecordCompletenessRateV13(records: BloodTransfusionMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.recordTotal, 0);
  if (total === 0) return 0;
  const complete = records.reduce((acc, r) => acc + r.complete, 0);
  return Math.round((complete / total) * 10000) / 100;
}
