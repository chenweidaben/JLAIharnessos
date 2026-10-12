/**
 * 健澜科技 jlmedaios - 结算同比环比分析纯函数（M23-D）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 百分比变化；previous=0 返回 null。 */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / previous;
}

/** 趋势：±3% 内 flat。 */
export function trendOf(pct: number | null): 'up' | 'down' | 'flat' | 'na' {
  if (pct === null) return 'na';
  if (pct > 0.03) return 'up';
  if (pct < -0.03) return 'down';
  return 'flat';
}

/** 占比 0-1。 */
export function ratioShare(part: number, total: number): number {
  if (total === 0) return 0;
  return part / total;
}

export interface SummaryPoint {
  period: string;
  insuranceSettlement: number;
  drgCases: number;
  dipCases: number;
  drugShare: number;
  materialShare: number;
  examShare: number;
}

export interface AnalyticPoint {
  period: string;
  settlementMoM: number | null;
  settlementTrend: 'up' | 'down' | 'flat' | 'na';
  drgRatio: number;
  dipRatio: number;
  drugShare: number;
  materialShare: number;
  examShare: number;
}

/** 输入近 N 期汇总（按 period 升序）→ 每期分析点。 */
export function buildAnalytics(points: SummaryPoint[]): AnalyticPoint[] {
  return points.map((p, i) => {
    const prev = i > 0 ? points[i - 1].insuranceSettlement : 0;
    const mom = pctChange(p.insuranceSettlement, prev);
    const total = p.drgCases + p.dipCases;
    return {
      period: p.period,
      settlementMoM: mom,
      settlementTrend: trendOf(mom),
      drgRatio: ratioShare(p.drgCases, total),
      dipRatio: ratioShare(p.dipCases, total),
      drugShare: p.drugShare,
      materialShare: p.materialShare,
      examShare: p.examShare,
    };
  });
}
