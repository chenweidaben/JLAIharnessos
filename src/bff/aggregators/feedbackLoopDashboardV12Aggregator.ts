/**
 * 健澜科技 jlmedaios - 反馈闭环总览 V12 纯函数（M294-D）
 *
 * buildFeedbackLoopDashboardV12 / computeLoopTrendV12 / identifyLoopBottleneckV12
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 采纳看板（最小字段） */
export interface AdoptionBoardMiniV12 {
  overallAdoptionRate: number;
}

/** 复训任务（最小字段） */
export interface RetrainTaskMiniV12 {
  urgent: boolean;
}

/** 健康度看板（最小字段） */
export interface HealthDashboardMiniV12 {
  avgScore: number;
  criticalCount: number;
}

/** 周环比输入 */
export interface LoopWeekV12 {
  adoptionRate: number;
  retrainDoneRate: number;
  healthScore: number;
}

/** 闭环总览 */
export interface FeedbackLoopDashboardV12 {
  overallAdoptionRate: number;
  totalRetrainTasks: number;
  urgentRetrainTasks: number;
  criticalAgentCount: number;
  avgHealthScore: number;
}

/** 周环比结果 */
export interface LoopTrendV12 {
  adoptionDelta: number;
  retrainDelta: number;
  healthDelta: number;
}

/** 闭环总览（纯函数）：汇总三块看板为闭环指标。
 *
 * @param adoptionBoard 采纳看板
 * @param retrainTasks 复训任务列表
 * @param healthDashboard 健康度看板
 * @returns 闭环总览
 */
export function buildFeedbackLoopDashboardV12(
  adoptionBoard: AdoptionBoardMiniV12,
  retrainTasks: RetrainTaskMiniV12[],
  healthDashboard: HealthDashboardMiniV12,
): FeedbackLoopDashboardV12 {
  return {
    overallAdoptionRate: adoptionBoard.overallAdoptionRate,
    totalRetrainTasks: retrainTasks.length,
    urgentRetrainTasks: retrainTasks.filter((t) => t.urgent).length,
    criticalAgentCount: healthDashboard.criticalCount,
    avgHealthScore: healthDashboard.avgScore,
  };
}

/**
 * 周环比（纯函数）：本周-上周，保留1位小数。
 *
 * @param prevWeek 上周
 * @param thisWeek 本周
 * @returns 环比 delta
 */
export function computeLoopTrendV12(prevWeek: LoopWeekV12, thisWeek: LoopWeekV12): LoopTrendV12 {
  const round1 = (x: number) => Math.round(x * 10) / 10;
  return {
    adoptionDelta: round1(thisWeek.adoptionRate - prevWeek.adoptionRate),
    retrainDelta: round1(thisWeek.retrainDoneRate - prevWeek.retrainDoneRate),
    healthDelta: round1(thisWeek.healthScore - prevWeek.healthScore),
  };
}

/**
 * 闭环瓶颈识别（纯函数）：采纳<60 / 紧急复训>2 / critical agent>1 → 对应环节最弱。
 *
 * @param dashboard 闭环总览
 * @returns 瓶颈环节列表
 */
export function identifyLoopBottleneckV12(dashboard: FeedbackLoopDashboardV12): string[] {
  const bottlenecks: string[] = [];
  if (dashboard.overallAdoptionRate < 60) bottlenecks.push("采纳率偏低");
  if (dashboard.urgentRetrainTasks > 2) bottlenecks.push("紧急复训积压");
  if (dashboard.criticalAgentCount > 1) bottlenecks.push("健康度 critical 角色过多");
  return bottlenecks;
}
