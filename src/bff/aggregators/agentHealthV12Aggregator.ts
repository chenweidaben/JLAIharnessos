/**
 * 健澜科技 jlmedaios - 智能体健康度评分 V12 纯函数（M294-C）
 *
 * scoreAgentHealthV12 / classifyHealthV12 / buildHealthDashboardV12
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 采纳率统计 */
export interface AdoptionStatsV12 {
  adoptRate: number;
}

/** 单角色健康分输入 */
export interface AgentHealthInputV12 {
  role: string;
  adoptRate: number;
  retrainDone: number;
  retrainTotal: number;
}

/** 单角色健康分结果 */
export interface AgentHealthScoreV12 {
  role: string;
  score: number;
  level: "healthy" | "watch" | "critical";
}

/** 健康度看板 */
export interface HealthDashboardV12 {
  scores: AgentHealthScoreV12[];
  avgScore: number;
  lowestRole: string;
  criticalCount: number;
}

/**
 * 健康分计算（纯函数）：score = adoptRate*0.6 + 复训完成率*0.4，0-100。
 *
 * @param role 角色
 * @param stats 采纳率统计
 * @param retrainDone 复训完成数
 * @param retrainTotal 复训总数
 * @returns 健康分
 */
export function scoreAgentHealthV12(
  role: string,
  stats: AdoptionStatsV12,
  retrainDone: number,
  retrainTotal: number,
): AgentHealthScoreV12 {
  const retrainRate = retrainTotal <= 0 ? 100 : (retrainDone / retrainTotal) * 100;
  const score = Math.round(stats.adoptRate * 0.6 + retrainRate * 0.4);
  return { role, score, level: classifyHealthV12(score) };
}

/**
 * 健康分级（纯函数）：≥80 healthy / 60-79 watch / <60 critical。
 *
 * @param score 分数
 * @returns 等级
 */
export function classifyHealthV12(score: number): "healthy" | "watch" | "critical" {
  if (score >= 80) return "healthy";
  if (score >= 60) return "watch";
  return "critical";
}

/**
 * 健康度看板（纯函数）：汇总多角色分数，返回平均分/最低分角色/critical 数。
 *
 * @param scores 各角色分数
 * @returns 看板
 */
export function buildHealthDashboardV12(scores: AgentHealthScoreV12[]): HealthDashboardV12 {
  if (scores.length === 0) {
    return { scores: [], avgScore: 0, lowestRole: "", criticalCount: 0 };
  }
  const sum = scores.reduce((s, x) => s + x.score, 0);
  const avg = Math.round((sum / scores.length) * 10) / 10;
  const sorted = [...scores].sort((a, b) => a.score - b.score);
  return {
    scores,
    avgScore: avg,
    lowestRole: sorted[0].role,
    criticalCount: scores.filter((s) => s.level === "critical").length,
  };
}
