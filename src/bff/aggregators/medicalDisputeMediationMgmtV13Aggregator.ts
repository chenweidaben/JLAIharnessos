/**
 * 健澜科技 jlmedaios - 医疗纠纷调解管理 V13 纯函数（M451-C，医患关系与投诉管理组）
 *
 * computeMedicalDisputeMediationSuccessRateV13 / computeMedicalDisputeCompensationControlRateV13 / computeMedicalDisputeOccurrenceCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医疗纠纷调解管理记录 */
export interface MedicalDisputeMediationMgmtRecordV13 {
  success: number;
  totalDispute: number;
  actualCompensation: number;
  budgetCompensation: number;
  isDispute: boolean;
}

/**
 * 纠纷调解成功率（纯函数）：调解成功纠纷数/纠纷总数×100，保留 2 位小数。
 *
 * @param records 医疗纠纷调解管理记录列表
 * @returns 纠纷调解成功率百分比
 */
export function computeMedicalDisputeMediationSuccessRateV13(records: MedicalDisputeMediationMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.totalDispute, 0);
  if (total === 0) return 0;
  const success = records.reduce((acc, r) => acc + r.success, 0);
  return Math.round((success / total) * 10000) / 100;
}

/**
 * 赔偿金额控制率（纯函数，反向指标越低越好）：实际赔偿金额/预算赔偿金额×100，保留 2 位小数。
 *
 * @param records 医疗纠纷调解管理记录列表
 * @returns 赔偿金额控制率百分比
 */
export function computeMedicalDisputeCompensationControlRateV13(records: MedicalDisputeMediationMgmtRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.budgetCompensation, 0);
  if (total === 0) return 0;
  const actual = records.reduce((acc, r) => acc + r.actualCompensation, 0);
  return Math.round((actual / total) * 10000) / 100;
}

/**
 * 纠纷发生数（纯函数，计数指标，反向指标越低越好）：返回 records.filter(r => r.isDispute).length。
 *
 * @param records 医疗纠纷调解管理记录列表
 * @returns 纠纷发生数（整数）
 */
export function computeMedicalDisputeOccurrenceCountV13(records: MedicalDisputeMediationMgmtRecordV13[]): number {
  return records.filter((r) => r.isDispute).length;
}
