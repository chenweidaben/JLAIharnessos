/**
 * 健澜科技 jlmedaios - 医疗纠纷 V13 纯函数（M398-B）
 *
 * computeMedicalDisputeCountV13 / computeMedicalDisputeCompensationAmountV13 / computeMedicalDisputeResolutionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医疗纠纷记录 */
export interface MedicalDisputeRecordV13 {
  disputeCount: number;
  compensationAmount: number;
  resolvedCount: number;
}

/**
 * 纠纷数（纯函数）：求和。
 *
 * @param records 医疗纠纷记录列表
 * @returns 纠纷数
 */
export function computeMedicalDisputeCountV13(records: MedicalDisputeRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.disputeCount, 0);
}

/**
 * 纠纷赔偿金额（纯函数）：求和，元。
 *
 * @param records 医疗纠纷记录列表
 * @returns 纠纷赔偿金额（元）
 */
export function computeMedicalDisputeCompensationAmountV13(records: MedicalDisputeRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.compensationAmount, 0);
}

/**
 * 纠纷化解率（纯函数）：已化解数/纠纷总数×100，保留 2 位小数。
 *
 * @param records 医疗纠纷记录列表
 * @returns 纠纷化解率百分比
 */
export function computeMedicalDisputeResolutionRateV13(records: MedicalDisputeRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.disputeCount, 0);
  if (total === 0) return 0;
  const resolved = records.reduce((acc, r) => acc + r.resolvedCount, 0);
  return Math.round((resolved / total) * 10000) / 100;
}
