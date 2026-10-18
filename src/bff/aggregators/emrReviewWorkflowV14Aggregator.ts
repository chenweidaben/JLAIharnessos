/**
 * 健澜科技 jlmedaios - 病历审核工作流 V14 聚合器（M478-A）
 *
 * 纯函数：审核工作流构建 + 状态流转。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 审核工作流 */
export interface ReviewWorkflowV14 {
  medicalRecordId: string;
  currentStatus: string;
  history: string[];
}

/**
 * 构建审核工作流。
 *
 * @param medicalRecordId 病历 ID
 * @param currentStatus 当前状态
 * @returns 审核工作流
 */
export function buildReviewWorkflow(medicalRecordId: string, currentStatus: string): ReviewWorkflowV14 {
  return { medicalRecordId, currentStatus, history: [currentStatus] };
}

/**
 * 状态流转：pending→reviewing（submit）、reviewing→approved（approve）、reviewing→rejected（reject）。
 *
 * @param currentStatus 当前状态
 * @param action 动作
 * @returns 流转后的新状态（非法流转原样返回）
 */
export function transitionReviewStatus(currentStatus: string, action: string): string {
  if (currentStatus === "pending" && action === "submit") return "reviewing";
  if (currentStatus === "reviewing" && action === "approve") return "approved";
  if (currentStatus === "reviewing" && action === "reject") return "rejected";
  return currentStatus;
}
