/**
 * 健澜科技 jlmedaios - 质控问题反馈闭环 V14 聚合器（M496-A）
 *
 * 纯函数：反馈闭环记录构建 + 反馈状态跟踪。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 反馈闭环记录 */
export interface FeedbackLoopV14 {
  issue: string;
  status: string;
}

/** 反馈状态跟踪结果 */
export interface FeedbackStatusTrackV14 {
  total: number;
  closed: number;
  rate: number;
}

/**
 * 构建反馈闭环记录。
 *
 * @param issue 问题
 * @param status 状态（待处理/整改中/已闭环）
 * @returns 反馈闭环记录
 */
export function buildFeedbackLoop(issue: string, status: string): FeedbackLoopV14 {
  return { issue, status };
}

/**
 * 跟踪反馈状态（总数+已闭环+闭环率%）。
 *
 * @param records 反馈记录数组
 * @returns 反馈状态跟踪结果
 */
export function trackFeedbackStatus(records: { issue: string; status: string }[]): FeedbackStatusTrackV14 {
  const total = records.length;
  if (total === 0) {
    return { total: 0, closed: 0, rate: 0 };
  }
  // 手算闭环率：rate=Math.ceil(closed/total×100)，分母不能为 0
  const closed = records.filter((r) => r.status === "已闭环").length;
  const rate = Math.ceil((closed / total) * 100);
  return { total, closed, rate };
}
