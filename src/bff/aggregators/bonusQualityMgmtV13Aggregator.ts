/**
 * 健澜科技 jlmedaios - 奖金分配质量管理 V13 纯函数（M433-C，-quality 后缀避让旧版 bonusMgmtV13（M410））
 *
 * computeBonusAccountingAccuracyRateV13 / computeBonusPaymentTimelinessRateV13 / computeBonusAppealResolutionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 奖金分配质量管理记录 */
export interface BonusQualityMgmtRecordV13 {
  accurateCount: number;
  totalCount: number;
  timelyPayment: number;
  shouldPayment: number;
  resolvedAppeals: number;
  acceptedAppeals: number;
}

/**
 * 奖金核算准确率（纯函数）：准确核算次数/核算总次数×100，保留 2 位小数。
 *
 * @param records 奖金分配质量管理记录列表
 * @returns 奖金核算准确率百分比
 */
export function computeBonusAccountingAccuracyRateV13(records: BonusQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalCount, 0);
  if (total === 0) return 0;
  const accurate = records.reduce((acc, r) => acc + r.accurateCount, 0);
  return Math.round((accurate / total) * 10000) / 100;
}

/**
 * 奖金发放及时率（纯函数）：及时发放次数/应发放次数×100，保留 2 位小数。
 *
 * @param records 奖金分配质量管理记录列表
 * @returns 奖金发放及时率百分比
 */
export function computeBonusPaymentTimelinessRateV13(records: BonusQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.shouldPayment, 0);
  if (total === 0) return 0;
  const timely = records.reduce((acc, r) => acc + r.timelyPayment, 0);
  return Math.round((timely / total) * 10000) / 100;
}

/**
 * 奖金申诉处理率（纯函数）：已处理申诉数/受理申诉总数×100，保留 2 位小数。
 *
 * @param records 奖金分配质量管理记录列表
 * @returns 奖金申诉处理率百分比
 */
export function computeBonusAppealResolutionRateV13(records: BonusQualityMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.acceptedAppeals, 0);
  if (total === 0) return 0;
  const resolved = records.reduce((acc, r) => acc + r.resolvedAppeals, 0);
  return Math.round((resolved / total) * 10000) / 100;
}
