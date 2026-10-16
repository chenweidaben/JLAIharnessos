/**
 * 健澜科技 jlmedaios - 风险管理纯函数（M217-D）
 *
 * buildRiskReport / calculateRiskScore / buildRiskMatrix
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 计算风险分数（纯函数）。
 *
 * @param likelihood 可能性（1-5）
 * @param impact 影响度（1-5）
 * @returns 风险分数
 */
export function calculateRiskScore(likelihood: number, impact: number): { score: number; level: string } {
  const score = likelihood * impact;
  let level = '低';
  if (score >= 15) level = '高';
  else if (score >= 8) level = '中';
  return { score, level };
}

/** 风险项 */
export interface RiskItem {
  name: string;
  likelihood: number;
  impact: number;
}

/**
 * 构建风险矩阵（纯函数）。
 *
 * @param risks 风险列表
 * @returns 矩阵数据
 */
export function buildRiskMatrix(risks: RiskItem[]): { total: number; high: number; medium: number; low: number } {
  let high = 0;
  let medium = 0;
  let low = 0;
  for (const r of risks) {
    const { level } = calculateRiskScore(r.likelihood, r.impact);
    if (level === '高') high += 1;
    else if (level === '中') medium += 1;
    else low += 1;
  }
  return { total: risks.length, high, medium, low };
}

/** 风险报告输出 */
export interface RiskReport {
  timeRange: string;
  identification: { strategic: number; operational: number; financial: number; legal: number; reputational: number };
  matrix: { high: number; medium: number; low: number };
  medical: { disputes: number; incidents: number; infection: number };
  operational: { risks: number };
  financial: { risks: number };
  legal: { risks: number };
  committee: { meetings: number };
  suggestions: string[];
}

/**
 * 构建风险报告。
 *
 * @param timeRange 时间范围
 * @returns 风险报告
 */
export function buildRiskReport(timeRange: string): RiskReport {
  return {
    timeRange,
    identification: { strategic: 5, operational: 10, financial: 8, legal: 3, reputational: 2 },
    matrix: { high: 5, medium: 10, low: 15 },
    medical: { disputes: 20, incidents: 10, infection: 5 },
    operational: { risks: 10 },
    financial: { risks: 8 },
    legal: { risks: 3 },
    committee: { meetings: 4 },
    suggestions: ['加强医疗纠纷防控', '完善风险应对预案'],
  };
}
