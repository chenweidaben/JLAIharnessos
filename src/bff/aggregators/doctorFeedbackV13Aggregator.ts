/**
 * 健澜科技 jlmedaios - 医生显式反馈闭环 V13 纯函数（M301-A）
 *
 * collectDoctorFeedbackV13 / computeFeedbackSignalV13 / triggerExperienceUpdateByFeedbackV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医生反馈 */
export interface DoctorFeedbackV13 {
  feedbackId: string;
  suggestionId: string;
  doctorId: string;
  action: "accepted" | "modified" | "rejected";
  modificationNote: string;
}

/** 反馈信号 */
export interface FeedbackSignalV13 {
  acceptedCount: number;
  modifiedCount: number;
  rejectedCount: number;
  adoptionRate: number;
  modificationRate: number;
  rejectionRate: number;
  needsReview: boolean;
}

let nextFeedbackId = 1;

/**
 * 记录医生反馈（纯函数式生成新条目）。
 *
 * @param suggestionId 建议ID
 * @param doctorId 医生ID
 * @param action 动作
 * @param modificationNote 修改点说明
 * @returns 反馈条目
 */
export function collectDoctorFeedbackV13(
  suggestionId: string,
  doctorId: string,
  action: "accepted" | "modified" | "rejected",
  modificationNote: string,
): DoctorFeedbackV13 {
  return {
    feedbackId: `fb-${nextFeedbackId++}`,
    suggestionId,
    doctorId,
    action,
    modificationNote,
  };
}

/**
 * 信号统计（纯函数）：三率百分比，保留1位小数。
 *
 * @param feedbacks 反馈列表
 * @returns 信号
 */
export function computeFeedbackSignalV13(feedbacks: DoctorFeedbackV13[]): FeedbackSignalV13 {
  const acceptedCount = feedbacks.filter((f) => f.action === "accepted").length;
  const modifiedCount = feedbacks.filter((f) => f.action === "modified").length;
  const rejectedCount = feedbacks.filter((f) => f.action === "rejected").length;
  const total = feedbacks.length;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 1000) / 10);
  const signal: Omit<FeedbackSignalV13, "needsReview"> = {
    acceptedCount,
    modifiedCount,
    rejectedCount,
    adoptionRate: pct(acceptedCount),
    modificationRate: pct(modifiedCount),
    rejectionRate: pct(rejectedCount),
  };
  return { ...signal, needsReview: triggerExperienceUpdateByFeedbackV13(signal) };
}

/**
 * 触发复审（纯函数）：rejectionRate≥30 或 modificationRate≥40 → needsReview=true。
 *
 * @param signal 信号（不含 needsReview）
 * @returns 是否需要复审
 */
export function triggerExperienceUpdateByFeedbackV13(
  signal: Pick<FeedbackSignalV13, "modificationRate" | "rejectionRate">,
): boolean {
  return signal.rejectionRate >= 30 || signal.modificationRate >= 40;
}
