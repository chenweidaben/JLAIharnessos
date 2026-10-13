/**
 * 健澜科技 jlmedaios - 医生站工作台纯函数（M79-A）
 * 红黄风险分级 / 待办计数 / 看板汇总。纯函数无 DB。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type RiskLevel = 'red' | 'yellow' | 'green';

/** 按院感器械率与 DDDs 分级：任一超阈值 red，接近 yellow，否则 green。 */
export function riskLevel(infectionRate: number, ddds: number): RiskLevel {
  if (infectionRate > 5 || ddds > 50) return 'red';
  if (infectionRate > 3 || ddds > 40) return 'yellow';
  return 'green';
}

export interface TodoCount {
  openTasks: number;
  unread: number;
  critical: number;
}

/** 待办计数；critical 为高优待办数。 */
export function todoCount(openTasks: number, unreadNotifications: number, criticalTasks = 0): TodoCount {
  return { openTasks, unread: unreadNotifications, critical: criticalTasks };
}

export interface WorkbenchSummary {
  urgentAlerts: number;
  followupsToday: number;
  kpis: number;
}

/** 汇总看板块。 */
export function summarize(input: {
  urgentAlerts: number;
  followupsToday: number;
  kpiBlocks: number;
}): WorkbenchSummary {
  return {
    urgentAlerts: input.urgentAlerts,
    followupsToday: input.followupsToday,
    kpis: input.kpiBlocks,
  };
}
