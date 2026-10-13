/**
 * 健澜科技 jlmedaios - 急诊留观 API（M74-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { EdObservation } from '@/types/edObservation';

const base = '/ed-observations';

export function registerEdObservation(input: { patientId: string; triageLevel: string }) {
  return post<EdObservation>(base, input);
}
export function listEdObservations(params: { status?: string; patientId?: string }) {
  return get<EdObservation[]>(base, params);
}
export function closeEdObservation(id: string, disposition: string) {
  return post<EdObservation>(`${base}/${id}/close`, { disposition });
}
