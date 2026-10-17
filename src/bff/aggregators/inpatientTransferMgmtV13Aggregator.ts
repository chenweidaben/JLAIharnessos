/**
 * 健澜科技 jlmedaios - 转科转院管理 V13 纯函数（M411-C）
 *
 * computeTransferRecordCompletenessRateV13 / computeTransferAssessmentCompletionRateV13 / computeTransferHandoverPassRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 转科转院管理记录 */
export interface InpatientTransferMgmtRecordV13 {
  complete: number;
  recordTotal: number;
  assessed: number;
  transferTotal: number;
  qualified: number;
  handoverTotal: number;
}

/**
 * 转科记录完整率（纯函数）：完整记录数/转科记录总数×100，保留 2 位小数。
 *
 * @param records 转科转院管理记录列表
 * @returns 转科记录完整率百分比
 */
export function computeTransferRecordCompletenessRateV13(records: InpatientTransferMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.recordTotal, 0);
  if (total === 0) return 0;
  const complete = records.reduce((acc, r) => acc + r.complete, 0);
  return Math.round((complete / total) * 10000) / 100;
}

/**
 * 转院评估完成率（纯函数）：已完成评估数/转院总数×100，保留 2 位小数。
 *
 * @param records 转科转院管理记录列表
 * @returns 转院评估完成率百分比
 */
export function computeTransferAssessmentCompletionRateV13(records: InpatientTransferMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.transferTotal, 0);
  if (total === 0) return 0;
  const assessed = records.reduce((acc, r) => acc + r.assessed, 0);
  return Math.round((assessed / total) * 10000) / 100;
}

/**
 * 转科交接合格率（纯函数）：合格交接次数/交接总次数×100，保留 2 位小数。
 *
 * @param records 转科转院管理记录列表
 * @returns 转科交接合格率百分比
 */
export function computeTransferHandoverPassRateV13(records: InpatientTransferMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.handoverTotal, 0);
  if (total === 0) return 0;
  const qualified = records.reduce((acc, r) => acc + r.qualified, 0);
  return Math.round((qualified / total) * 10000) / 100;
}
