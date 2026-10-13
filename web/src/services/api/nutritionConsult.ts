/**
 * 健澜科技 jlmedaios - 营养科会诊 API（M58-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { ConsultView, NutritionConsult } from '@/types/nutritionConsult';

const base = '/nutrition-consults';

export function consultNutrition(input: {
  visitId: string; consultType?: string; nutritionDiagnosis: string; plan: string;
  caloriesPerDay: number; followupDays?: number;
}) {
  return post<ConsultView>(`${base}`, input);
}
export function listNutritionConsult(visitId: string) {
  return get<NutritionConsult[]>(`${base}`, { visitId });
}
export function followupNutritionConsult(id: string) {
  return post<NutritionConsult>(`${base}/${id}/followup`, {});
}
