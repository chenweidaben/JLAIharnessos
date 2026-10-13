/**
 * 健澜科技 jlmedaios - 出院计划 API（M61-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { DischargePlan, PlanView } from '@/types/dischargePlan';

const base = '/discharge-plans';

export function createDischargePlan(input: {
  visitId: string; medicationSummary: string; diagnoses?: string[]; followupDepartment?: string;
}) {
  return post<PlanView>(`${base}`, input);
}
export function listDischargePlan(visitId: string) {
  return get<DischargePlan[]>(`${base}`, { visitId });
}
export function pushDischargePlan(id: string) {
  return post<DischargePlan>(`${base}/${id}/push`, {});
}
