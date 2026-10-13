/**
 * 健澜科技 jlmedaios - 出院计划类型（M61-A）
 * Copyright (c) 杭州健澜科技有限公司
 */

export interface DischargePlan {
  id: string;
  visitId: string;
  dischargeGuidance: string;
  medicationSummary: string;
  followupDate: string;
  followupDepartment: string;
  status: 'planned' | 'pushed' | 'completed';
  createdBy: string;
  createdAt: string;
}

export interface PlanView {
  plan: DischargePlan;
  suggestedFollowupDate: string;
}
