/**
 * 健澜科技 jlmedaios - 科室运营画像 V5 纯函数（M287-B）
 *
 * buildDeptProfileV5 / compareDeptV5 / classifyDeptV5
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 科室画像数据 */
export interface DeptProfile {
  deptName: string;
  revenue: number;
  cost: number;
  cmi: number;
  avgStayDays: number;
  satisfaction: number;
  rankScore: number;
  headcount: number;
}

/** 科室对比结果 */
export interface DeptCompare {
  higherRevenue: string;
  higherSatisfaction: string;
  deltaProfit: number;
}

/**
 * 科室画像 V5（纯函数）：计算利润率与健康度。
 *
 * @param dept 科室数据
 * @returns 画像
 */
export function buildDeptProfileV5(dept: DeptProfile): {
  profit: number;
  profitMarginPct: number;
  health: "green" | "yellow" | "red";
} {
  const profit = dept.revenue - dept.cost;
  const margin = dept.revenue > 0 ? Math.round((profit / dept.revenue) * 1000) / 10 : 0;
  return {
    profit,
    profitMarginPct: margin,
    health: classifyDeptV5(dept.rankScore),
  };
}

/**
 * 科室对比 V5（纯函数）：对比两个科室。
 *
 * @param a 科室A
 * @param b 科室B
 * @returns 对比结果
 */
export function compareDeptV5(a: DeptProfile, b: DeptProfile): DeptCompare {
  const profitA = a.revenue - a.cost;
  const profitB = b.revenue - b.cost;
  return {
    higherRevenue: a.revenue >= b.revenue ? a.deptName : b.deptName,
    higherSatisfaction: a.satisfaction >= b.satisfaction ? a.deptName : b.deptName,
    deltaProfit: Math.round((profitA - profitB) * 10) / 10,
  };
}

/**
 * 红黄绿分组 V5（纯函数）：≥80绿 / 60-80黄 / <60红。
 *
 * @param score 综合分
 * @returns 分组
 */
export function classifyDeptV5(score: number): "green" | "yellow" | "red" {
  if (score >= 80) return "green";
  if (score >= 60) return "yellow";
  return "red";
}
