/**
 * 健澜科技 jlmedaios - 病案首页质控 V14 聚合器（M480-C）
 *
 * 纯函数：首页必填项校验 + 首页得分计算。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 首页字段 */
export interface FrontPageFieldV14 {
  name: string;
  filled: boolean;
}

/** 首页质控结果 */
export interface FrontPageQcResultV14 {
  filledCount: number;
  total: number;
  missingFields: string[];
}

/**
 * 首页必填项校验：统计已填/未填字段。
 *
 * @param fields 字段列表
 * @returns 首页质控结果
 */
export function checkFrontPageFields(fields: FrontPageFieldV14[]): FrontPageQcResultV14 {
  const filledCount = fields.filter((f) => f.filled).length;
  const missingFields = fields.filter((f) => !f.filled).map((f) => f.name);
  return { filledCount, total: fields.length, missingFields };
}

/**
 * 计算首页得分：filledCount/total×100（整数）。
 *
 * @param result 质控结果
 * @returns 得分（0-100）
 */
export function computeFrontPageScore(result: { filledCount: number; total: number }): number {
  if (result.total === 0) return 0;
  return Math.round((result.filledCount / result.total) * 100);
}
