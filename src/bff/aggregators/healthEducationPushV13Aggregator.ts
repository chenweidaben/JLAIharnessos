/**
 * 健澜科技 jlmedaios - 健教材料推送统计 V13 纯函数（M316-C）
 *
 * countMaterialsByDiseaseV13 / computeReadRateV13 / computeFeedbackRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 健教材料 */
export interface EducationMaterialV13 {
  materialId: string;
  disease: string;
}

/** 推送记录 */
export interface EducationRecordV13 {
  recordId: string;
  materialId: string;
  disease: string;
  isRead: boolean;
  hasFeedback: boolean;
}

/**
 * 按病种统计推送材料数（纯函数）。
 *
 * @param materials 材料列表
 * @returns 病种 → 材料数
 */
export function countMaterialsByDiseaseV13(
  materials: EducationMaterialV13[],
): { disease: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const m of materials) {
    counts.set(m.disease, (counts.get(m.disease) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([disease, count]) => ({ disease, count }));
}

/**
 * 患者阅读率（纯函数）：已读数/推送总数×100。
 *
 * @param records 推送记录
 * @returns 阅读率百分比
 */
export function computeReadRateV13(records: EducationRecordV13[]): number {
  if (records.length === 0) return 0;
  const read = records.filter((r) => r.isRead).length;
  return Math.round((read / records.length) * 100);
}

/**
 * 反馈率（纯函数）：有反馈数/已读数×100。
 *
 * @param records 推送记录
 * @returns 反馈率百分比
 */
export function computeFeedbackRateV13(records: EducationRecordV13[]): number {
  const read = records.filter((r) => r.isRead);
  if (read.length === 0) return 0;
  const feedback = read.filter((r) => r.hasFeedback).length;
  return Math.round((feedback / read.length) * 100);
}
