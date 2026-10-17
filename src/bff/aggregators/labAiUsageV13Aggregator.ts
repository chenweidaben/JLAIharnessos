/**
 * 健澜科技 jlmedaios - 检验 AI 使用统计 V13 纯函数（M325-B）
 *
 * countLabReviewCallsV13 / computeLabAdoptionRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 检验 AI 复核记录 */
export interface LabAiRecordV13 {
  isAdopted: boolean;
}

/**
 * 异常结果复核调用量（纯函数）：总数。
 *
 * @param records 复核记录列表
 * @returns 复核调用量
 */
export function countLabReviewCallsV13(records: LabAiRecordV13[]): number {
  return records.length;
}

/**
 * 建议采纳率（纯函数）：采纳数/复核数×100。
 *
 * @param records 复核记录列表
 * @returns 采纳率百分比
 */
export function computeLabAdoptionRateV13(records: LabAiRecordV13[]): number {
  if (records.length === 0) return 0;
  const adopted = records.filter((r) => r.isAdopted).length;
  return Math.round((adopted / records.length) * 100);
}
