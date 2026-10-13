/**
 * 健澜科技 jlmedaios - 康复治疗执行 API（M51-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post, patch } from '../request';
import type { CompleteResult, RehabTreatment } from '@/types/rehabTreatment';

const base = '/rehab-treatments';

export function prescribeTreatment(input: { visitId: string; modality: string; scheduledDate: string; note?: string | null }) {
  return post<RehabTreatment>(`${base}`, input);
}
export function listTreatments(visitId: string) {
  return get<RehabTreatment[]>(`${base}`, { visitId });
}
export function signTreatment(id: string) {
  return patch<RehabTreatment>(`${base}/${id}/sign`, {});
}
export function completeTreatment(id: string, input: { efficacy: string; note?: string | null }) {
  return post<CompleteResult>(`${base}/${id}/complete`, input);
}
