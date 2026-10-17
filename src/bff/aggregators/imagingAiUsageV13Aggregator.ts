/**
 * 健澜科技 jlmedaios - 影像 AI 使用统计 V13 纯函数（M325-A）
 *
 * countImagingAiCallsV13 / computeDetectionRateV13 / classifyImagingByOrganV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 影像 AI 调用记录 */
export interface ImagingAiRecordV13 {
  organ: "lung" | "liver" | "heart" | "brain";
  isPositive: boolean;
}

/** 器官分组项 */
export interface OrganGroupV13 {
  organ: string;
  count: number;
}

/**
 * 本月影像 AI 调用量（纯函数）：总数。
 *
 * @param records 调用记录列表
 * @returns 调用量
 */
export function countImagingAiCallsV13(records: ImagingAiRecordV13[]): number {
  return records.length;
}

/**
 * 检出率（纯函数）：AI 检出阳性数/总调用数×100。
 *
 * @param records 调用记录列表
 * @returns 检出率百分比
 */
export function computeDetectionRateV13(records: ImagingAiRecordV13[]): number {
  if (records.length === 0) return 0;
  const positive = records.filter((r) => r.isPositive).length;
  return Math.round((positive / records.length) * 100);
}

/**
 * 按器官分组（纯函数）：肺/肝/心/脑 分组计数。
 *
 * @param records 调用记录列表
 * @returns 器官分组列表
 */
export function classifyImagingByOrganV13(records: ImagingAiRecordV13[]): OrganGroupV13[] {
  const map = new Map<string, number>();
  for (const r of records) {
    map.set(r.organ, (map.get(r.organ) ?? 0) + 1);
  }
  return [...map.entries()].map(([organ, count]) => ({ organ, count }));
}
