/**
 * 健澜科技 jlmedaios - 病历质控质控员工作台 V14 聚合器（M474-A，-desk 后缀避让）
 *
 * 纯函数：工作台统计汇总 + 待审列表按提交时间降序。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 工作台统计 */
export interface WorkbenchStatsV14 {
  pending: number;
  inProgress: number;
  reviewed: number;
  total: number;
}

/** 待审病历条目 */
export interface PendingNoteV14 {
  id: string;
  patientName: string;
  dept: string;
  submittedAt: string;
}

/**
 * 生成工作台统计，total = pending + inProgress + reviewed。
 *
 * @param stats 基础统计
 * @returns 含 total 的完整统计
 */
export function buildWorkbench(stats: { pending: number; inProgress: number; reviewed: number }): WorkbenchStatsV14 {
  return {
    pending: stats.pending,
    inProgress: stats.inProgress,
    reviewed: stats.reviewed,
    total: stats.pending + stats.inProgress + stats.reviewed,
  };
}

/**
 * 按 submittedAt 降序排列待审病历列表。
 *
 * @param notes 待审列表
 * @returns 降序后的列表
 */
export function buildPendingList(notes: PendingNoteV14[]): PendingNoteV14[] {
  return [...notes].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}
