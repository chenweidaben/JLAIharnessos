/**
 * 健澜科技 jlmedaios - 院长驾驶舱 V5 纯函数（M287-A）
 *
 * buildExecDashboardV5 / vsTargetV5 / rankDepartmentsV5
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** KPI 指标 */
export interface ExecKPI {
  name: string;
  value: number;
  target: number;
  unit: string;
  trend: "up" | "down" | "flat";
}

/** 科室绩效 */
export interface DeptPerf {
  name: string;
  score: number;
}

/**
 * 达成率 V5（纯函数）：value/target×100%。
 *
 * @param value 实际值
 * @param target 目标值
 * @returns 达成率%
 */
export function vsTargetV5(value: number, target: number): number {
  if (target === 0) return 0;
  return Math.round((value / target) * 1000) / 10;
}

/**
 * 一屏总览 V5（纯函数）：按 KPI 列表计算汇总。
 *
 * @param kpis KPI 列表
 * @returns 总览
 */
export function buildExecDashboardV5(kpis: ExecKPI[]): {
  totalKpis: number;
  onTargetCount: number;
  avgAchievementPct: number;
} {
  const onTarget = kpis.filter((k) => vsTargetV5(k.value, k.target) >= 100);
  const avg = kpis.length > 0
    ? Math.round((kpis.reduce((s, k) => s + vsTargetV5(k.value, k.target), 0) / kpis.length) * 10) / 10
    : 0;
  return {
    totalKpis: kpis.length,
    onTargetCount: onTarget.length,
    avgAchievementPct: avg,
  };
}

/**
 * 科室排名 V5（纯函数）：按 score 降序。
 *
 * @param depts 科室列表
 * @returns 排名
 */
export function rankDepartmentsV5(depts: DeptPerf[]): { name: string; score: number; rank: number }[] {
  return [...depts]
    .sort((a, b) => b.score - a.score)
    .map((d, idx) => ({ name: d.name, score: d.score, rank: idx + 1 }));
}
