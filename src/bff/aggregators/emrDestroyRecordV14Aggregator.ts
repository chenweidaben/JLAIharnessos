/**
 * 健澜科技 jlmedaios - 病历销毁记录 V14 聚合器（M482-D，M482 收官）
 *
 * 纯函数：销毁记录构建 + 销毁资格检查。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 销毁记录 */
export interface DestroyRecordV14 {
  medicalRecordId: string;
  reason: string;
  destroyDate: string;
}

/**
 * 构建销毁记录。
 *
 * @param medicalRecordId 病历号
 * @param reason 销毁原因
 * @param destroyDate 销毁日期
 * @returns 销毁记录
 */
export function buildDestroyRecord(medicalRecordId: string, reason: string, destroyDate: string): DestroyRecordV14 {
  return { medicalRecordId, reason, destroyDate };
}

/**
 * 检查销毁资格：recordAgeYears >= retentionYears 才可销毁。
 *
 * @param recordAgeYears 病历已保存年限
 * @param retentionYears 法定保存年限
 * @returns 是否可销毁
 */
export function checkDestroyEligibility(recordAgeYears: number, retentionYears: number): boolean {
  return recordAgeYears >= retentionYears;
}
