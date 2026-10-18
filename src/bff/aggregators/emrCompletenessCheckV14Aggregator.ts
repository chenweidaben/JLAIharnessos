/**
 * 健澜科技 jlmedaios - 病历完整性检查 V14 聚合器（M476-A）
 *
 * 纯函数：缺失字段识别 + 完整性得分计算。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 病历字段填写状态 */
export interface EmrFieldV14 {
  name: string;
  filled: boolean;
}

/** 完整性检查结果 */
export interface CompletenessResultV14 {
  missingFields: string[];
  filledCount: number;
  total: number;
}

/**
 * 检查病历完整性，找出缺失字段。
 *
 * @param fields 字段列表
 * @returns 完整性检查结果
 */
export function checkCompleteness(fields: EmrFieldV14[]): CompletenessResultV14 {
  const missingFields = fields.filter((f) => !f.filled).map((f) => f.name);
  const filledCount = fields.length - missingFields.length;
  return { missingFields, filledCount, total: fields.length };
}

/**
 * 计算完整性得分：score=filledCount/total×100（整数）。
 *
 * @param result 完整性检查结果
 * @returns 完整性得分（0-100）
 */
export function computeCompletenessScore(result: { filledCount: number; total: number }): number {
  if (result.total === 0) return 0;
  return Math.round((result.filledCount / result.total) * 100);
}
