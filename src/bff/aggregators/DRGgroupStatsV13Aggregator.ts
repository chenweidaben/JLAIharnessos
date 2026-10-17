/**
 * 健澜科技 jlmedaios - DRG分组统计 V13 纯函数（M382-C，stats 避让）
 *
 * computeDRGCaseCountV13 / computeDRGAvgWeightV13 / computeDRGCostDeviationRateV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** DRG分组统计记录 */
export interface DRGgroupRecordV13 {
  caseCount: number;
  totalWeight: number;
  actualCost: number;
  standardCost: number;
}

/**
 * DRG入组病例数（纯函数）：求和。
 *
 * @param records DRG分组统计记录列表
 * @returns DRG入组病例数
 */
export function computeDRGCaseCountV13(records: DRGgroupRecordV13[]): number {
  return records.reduce((acc, r) => acc + r.caseCount, 0);
}

/**
 * DRG平均权重（纯函数）：总权重/病例数，保留 2 位小数。
 *
 * @param records DRG分组统计记录列表
 * @returns DRG平均权重
 */
export function computeDRGAvgWeightV13(records: DRGgroupRecordV13[]): number {
  const cases = records.reduce((acc, r) => acc + r.caseCount, 0);
  if (cases === 0) return 0;
  const weight = records.reduce((acc, r) => acc + r.totalWeight, 0);
  return Math.round((weight / cases) * 100) / 100;
}

/**
 * DRG费用偏差率（纯函数）：(实际费用-标准费用)/标准费用×100，保留 2 位小数。
 *
 * @param records DRG分组统计记录列表
 * @returns DRG费用偏差率百分比
 */
export function computeDRGCostDeviationRateV13(records: DRGgroupRecordV13[]): number {
  const standard = records.reduce((acc, r) => acc + r.standardCost, 0);
  if (standard === 0) return 0;
  const actual = records.reduce((acc, r) => acc + r.actualCost, 0);
  return Math.round(((actual - standard) / standard) * 10000) / 100;
}
