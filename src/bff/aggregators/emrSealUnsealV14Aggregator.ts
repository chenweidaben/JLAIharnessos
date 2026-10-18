/**
 * 健澜科技 jlmedaios - 病历封存解封 V14 聚合器（M482-C）
 *
 * 纯函数：封存病历 + 解封病历。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 封存/解封记录 */
export interface SealRecordV14 {
  medicalRecordId: string;
  reason: string;
  status: string;
}

/**
 * 封存病历：状态设为 'sealed'。
 *
 * @param medicalRecordId 病历号
 * @param reason 封存原因
 * @returns 封存记录
 */
export function sealRecord(medicalRecordId: string, reason: string): SealRecordV14 {
  return { medicalRecordId, reason, status: "sealed" };
}

/**
 * 解封病历：状态从 'sealed' → 'unsealed'；已 unsealed 保持不变。
 *
 * @param record 封存记录
 * @returns 解封后的记录
 */
export function unsealRecord(record: SealRecordV14): SealRecordV14 {
  if (record.status === "sealed") {
    return { ...record, status: "unsealed" };
  }
  return { ...record };
}
