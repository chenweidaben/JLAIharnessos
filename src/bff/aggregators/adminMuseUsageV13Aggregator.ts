/**
 * 健澜科技 jlmedaios - 行政个人智能体使用统计 V13 纯函数（M320-C）
 *
 * computeAdminCallCountV13 / classifyAdminScenariosV13 / computeAdminSatisfactionV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 行政 MUSE 使用记录 */
export interface AdminMuseUsageV13 {
  usageId: string;
  adminId: string;
  scenario: "document" | "meetingMinutes" | "dataReport";
}

/** 行政反馈 */
export interface AdminMuseFeedbackV13 {
  feedbackId: string;
  adminId: string;
  isSatisfied: boolean;
}

/** 行政场景分布 */
export interface AdminScenarioDistributionV13 {
  document: number;
  meetingMinutes: number;
  dataReport: number;
}

/**
 * 行政调用次数（纯函数）。
 *
 * @param usages 使用记录列表
 * @param adminId 行政 ID
 * @returns 调用次数
 */
export function computeAdminCallCountV13(usages: AdminMuseUsageV13[], adminId: string): number {
  return usages.filter((u) => u.adminId === adminId).length;
}

/**
 * 场景分布（纯函数）：公文/会议纪要/数据报表 分组计数。
 *
 * @param usages 使用记录列表
 * @returns 场景分布
 */
export function classifyAdminScenariosV13(usages: AdminMuseUsageV13[]): AdminScenarioDistributionV13 {
  const result: AdminScenarioDistributionV13 = { document: 0, meetingMinutes: 0, dataReport: 0 };
  for (const u of usages) {
    if (u.scenario === "document") result.document++;
    else if (u.scenario === "meetingMinutes") result.meetingMinutes++;
    else if (u.scenario === "dataReport") result.dataReport++;
  }
  return result;
}

/**
 * 满意度（纯函数）：满意数/总反馈数×100。
 *
 * @param feedbacks 反馈列表
 * @param adminId 行政 ID
 * @returns 满意度百分比
 */
export function computeAdminSatisfactionV13(feedbacks: AdminMuseFeedbackV13[], adminId: string): number {
  const adminFeedbacks = feedbacks.filter((f) => f.adminId === adminId);
  if (adminFeedbacks.length === 0) return 0;
  const satisfied = adminFeedbacks.filter((f) => f.isSatisfied).length;
  return Math.round((satisfied / adminFeedbacks.length) * 100);
}
