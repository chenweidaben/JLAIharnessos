/**
 * 健澜科技 jlmedaios - 检验服务 V13 纯函数（M374-B）
 *
 * computeBloodRoutineTestCountV13 / computeBiochemistryTestCountV13 / computeImmunologyTestCountV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 检验服务记录 */
export interface LabServiceRecordV13 {
  bloodRoutineCount: number;
  biochemistryCount: number;
  immunologyCount: number;
}

/**
 * 血常规检验人次（纯函数）：求和。
 *
 * @param records 检验服务记录列表
 * @returns 血常规检验人次
 */
export function computeBloodRoutineTestCountV13(records: LabServiceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.bloodRoutineCount, 0);
}

/**
 * 生化检验人次（纯函数）：求和。
 *
 * @param records 检验服务记录列表
 * @returns 生化检验人次
 */
export function computeBiochemistryTestCountV13(records: LabServiceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.biochemistryCount, 0);
}

/**
 * 免疫检验人次（纯函数）：求和。
 *
 * @param records 检验服务记录列表
 * @returns 免疫检验人次
 */
export function computeImmunologyTestCountV13(records: LabServiceRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.immunologyCount, 0);
}
