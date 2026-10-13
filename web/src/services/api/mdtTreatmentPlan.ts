/**
 * 健澜科技 jlmedaios - MDT 治疗方案 API（M67-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { DraftPlanInput, TreatmentPlan } from '@/types/mdtTreatmentPlan';

const base = '/mdt-treatment-plans';

export function draftPlan(input: DraftPlanInput) {
  return post<TreatmentPlan>(`${base}/${input.mdtConsultId}/draft`, input);
}
export function listPlans(visitId: string) {
  return get<TreatmentPlan[]>(base, { visitId });
}
export function confirmPlan(id: string, scheduledAt: string) {
  return post<TreatmentPlan>(`${base}/${id}/confirm`, { scheduledAt });
}
