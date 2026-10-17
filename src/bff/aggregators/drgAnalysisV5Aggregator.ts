/**
 * 健澜科技 jlmedaios - 病种/DRG 经营分析 V5 纯函数（M287-C）
 *
 * buildDrgProfitV5 / rankDrgV5 / detectLossDrgV5
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** DRG 病种数据 */
export interface DrgCase {
  drgCode: string;
  drgName: string;
  caseCnt: number;
  avgCost: number;
  avgReimburse: number;
  cmi: number;
  los: number;
}

/**
 * DRG 盈亏 V5（纯函数）：profit = reimburse − cost。
 *
 * @param c DRG 病种
 * @returns 盈亏
 */
export function buildDrgProfitV5(c: DrgCase): { avgProfit: number; totalProfit: number; isLoss: boolean } {
  const avgProfit = Math.round((c.avgReimburse - c.avgCost) * 10) / 10;
  return {
    avgProfit,
    totalProfit: Math.round(avgProfit * c.caseCnt * 10) / 10,
    isLoss: avgProfit < 0,
  };
}

/**
 * DRG 排名 V5（纯函数）：按总盈亏降序。
 *
 * @param cases DRG 列表
 * @returns 排名
 */
export function rankDrgV5(cases: DrgCase[]): { drgCode: string; drgName: string; totalProfit: number; rank: number }[] {
  return cases
    .map((c) => ({
      drgCode: c.drgCode,
      drgName: c.drgName,
      totalProfit: buildDrgProfitV5(c).totalProfit,
    }))
    .sort((a, b) => b.totalProfit - a.totalProfit)
    .map((d, idx) => ({ ...d, rank: idx + 1 }));
}

/**
 * 亏损病种预警 V5（纯函数）：profit<0。
 *
 * @param cases DRG 列表
 * @returns 亏损列表
 */
export function detectLossDrgV5(cases: DrgCase[]): DrgCase[] {
  return cases.filter((c) => buildDrgProfitV5(c).isLoss);
}
