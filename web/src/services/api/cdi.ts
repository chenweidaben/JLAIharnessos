/**
 * 健澜科技 jlmedaios - CDI 用药审查 API（M70-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { CdiReview, ReviewInput } from '@/types/cdi';

const base = '/cdi';

export function reviewDrug(input: ReviewInput) {
  return post<CdiReview>(`${base}/review`, input);
}
export function listCdi(patientId: string) {
  return get<CdiReview[]>(base, { patientId });
}
export function resolveCdi(id: string) {
  return post<CdiReview>(`${base}/${id}/resolve`, {});
}
