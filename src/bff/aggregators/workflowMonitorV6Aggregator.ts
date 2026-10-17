/**
 * 健澜科技 jlmedaios - 流程监控与效率分析 V6 纯函数（M288-D）
 *
 * computeWfSlaV6 / computeWfEfficiencyV6 / buildWfMonitorV6
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 实例运行指标 */
export interface WfInstanceMetric {
  instanceId: string;
  defId: string;
  minutes: number;
  overdue: boolean;
  action: "approved" | "rejected";
}

/** 流程日聚合指标 */
export interface WfDailyMetric {
  defId: string;
  instanceCnt: number;
  avgMinutes: number;
  overdueCnt: number;
  approvalCnt: number;
  rejectCnt: number;
}

/**
 * 平均耗时 V6（纯函数）：Math.ceil 向上取整。
 *
 * @param instances 实例列表
 * @returns 平均耗时（分钟，向上取整）
 */
export function computeWfSlaV6(instances: WfInstanceMetric[]): { avgMinutes: number; totalInstances: number } {
  if (instances.length === 0) return { avgMinutes: 0, totalInstances: 0 };
  const totalMinutes = instances.reduce((s, i) => s + i.minutes, 0);
  return {
    avgMinutes: Math.ceil(totalMinutes / instances.length),
    totalInstances: instances.length,
  };
}

/**
 * 效率分 V6（纯函数）：通过率×100 − 超时率×50。
 *
 * @param m 日聚合指标
 * @returns 效率分与子项
 */
export function computeWfEfficiencyV6(m: WfDailyMetric): {
  passRatePct: number;
  overdueRatePct: number;
  efficiencyScore: number;
  grade: "green" | "yellow" | "red";
} {
  const totalDecided = m.approvalCnt + m.rejectCnt;
  const passRate = totalDecided > 0 ? m.approvalCnt / totalDecided : 0;
  const overdueRate = m.instanceCnt > 0 ? m.overdueCnt / m.instanceCnt : 0;
  const efficiencyScore = Math.round((passRate * 100 - overdueRate * 50) * 10) / 10;
  let grade: "green" | "yellow" | "red" = "red";
  if (efficiencyScore >= 80) grade = "green";
  else if (efficiencyScore >= 50) grade = "yellow";
  return {
    passRatePct: Math.round(passRate * 1000) / 10,
    overdueRatePct: Math.round(overdueRate * 1000) / 10,
    efficiencyScore,
    grade,
  };
}

/**
 * 监控总览 V6（纯函数）。
 *
 * @param metrics 日聚合指标列表
 * @returns 总览
 */
export function buildWfMonitorV6(metrics: WfDailyMetric[]): {
  totalInstances: number;
  avgMinutes: number;
  totalOverdue: number;
  totalApproved: number;
  totalRejected: number;
  gradeA: number;
} {
  const totalInstances = metrics.reduce((s, m) => s + m.instanceCnt, 0);
  const totalOverdue = metrics.reduce((s, m) => s + m.overdueCnt, 0);
  const totalApproved = metrics.reduce((s, m) => s + m.approvalCnt, 0);
  const totalRejected = metrics.reduce((s, m) => s + m.rejectCnt, 0);
  const weightedMinutes = metrics.reduce((s, m) => s + m.avgMinutes * m.instanceCnt, 0);
  const avgMinutes = totalInstances > 0 ? Math.ceil(weightedMinutes / totalInstances) : 0;
  let gradeA = 0;
  for (const m of metrics) {
    if (computeWfEfficiencyV6(m).grade === "green") gradeA += 1;
  }
  return {
    totalInstances,
    avgMinutes,
    totalOverdue,
    totalApproved,
    totalRejected,
    gradeA,
  };
}
