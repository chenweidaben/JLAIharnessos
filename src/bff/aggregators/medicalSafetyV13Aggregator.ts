/**
 * 健澜科技 jlmedaios - 医疗安全 V13 纯函数（M371-B）
 *
 * computeMedicalAdverseEventCountV13 / computeMedicalDisputeCountV13 / computeCompensationAmountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医疗安全记录 */
export interface MedicalSafetyRecordV13 {
  adverseEventCount: number;
  disputeCount: number;
  compensationAmount: number;
}

/**
 * 医疗不良事件数（纯函数）：求和。
 *
 * @param records 医疗安全记录列表
 * @returns 医疗不良事件数
 */
export function computeMedicalAdverseEventCountV13(records: MedicalSafetyRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.adverseEventCount, 0);
}

/**
 * 医疗纠纷数（纯函数）：求和。
 *
 * @param records 医疗安全记录列表
 * @returns 医疗纠纷数
 */
export function computeMedicalDisputeCountV13(records: MedicalSafetyRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.disputeCount, 0);
}

/**
 * 赔偿金额（纯函数）：求和，单位元，保留 2 位小数。
 *
 * @param records 医疗安全记录列表
 * @returns 赔偿金额（元）
 */
export function computeCompensationAmountV13(records: MedicalSafetyRecordV13[]): number {
  const total = records.reduce((acc, r) => acc + r.compensationAmount, 0);
  return Math.round(total * 100) / 100;
}
