/**
 * 健澜科技 jlmedaios - 营养科会诊类型（M58-A）
 * Copyright (c) 杭州健澜科技有限公司
 */

export type PlanTier = 'low' | 'normal' | 'high';

export interface NutritionConsult {
  id: string;
  visitId: string;
  consultType: 'routine' | 'urgent';
  nutritionDiagnosis: string;
  plan: string;
  caloriesPerDay: number;
  followupDays: number;
  status: 'consulted' | 'followed_up' | 'closed';
  dietitian: string;
  createdAt: string;
  needsFollowup?: boolean;
}

export interface ConsultView {
  consult: NutritionConsult;
  planTier: PlanTier;
}
