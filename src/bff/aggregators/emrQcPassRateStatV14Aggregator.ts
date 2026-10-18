/**
 * 健澜科技 jlmedaios - 质控合格率统计 V14 聚合器（M500-B）
 *
 * 纯函数：合格率统计构建 + 统计聚合。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 合格率统计 */
export interface PassRateStatV14 {
  dept: string;
  passCount: number;
  total: number;
  rate: number;
}

/** 聚合结果 */
export interface PassRateAggregateV14 {
  avgRate: number;
  depts: number;
}

/**
 * 构建合格率统计。
 *
 * @param dept 科室
 * @param passCount 合格数
 * @param total 总数
 * @returns 合格率统计（rate 保留 1 位小数）
 */
export function buildPassRateStat(dept: string, passCount: number, total: number): PassRateStatV14 {
  // 手算 rate：passCount / total * 100，保留 1 位小数
  const rate = total > 0 ? Math.round((passCount / total) * 1000) / 10 : 0;
  return { dept, passCount, total, rate };
}

/**
 * 聚合合格率统计（平均合格率 + 科室数）。
 *
 * @param stats 合格率统计数组
 * @returns 聚合结果
 */
export function aggregatePassRateStat(stats: PassRateStatV14[]): PassRateAggregateV14 {
  // 手算 avgRate：各科室合格率之和 / 科室数，保留 1 位小数
  if (stats.length === 0) {
    return { avgRate: 0, depts: 0 };
  }
  const sum = stats.reduce((acc, s) => acc + s.rate, 0);
  const avgRate = Math.round((sum / stats.length) * 10) / 10;
  return { avgRate, depts: stats.length };
}
