/**
 * 健澜科技 jlmedaios - STOP-BANG 筛查 API（M59-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { AssessResult, StopBangScreening } from '@/types/stopbang';

const base = '/stopbang';

export function assessStopbang(input: {
  visitId: string; sSnoring: boolean; tTired: boolean; oObserved: boolean; pPressure: boolean;
  bBmi: boolean; aAge: boolean; nNeck: boolean; gGender: boolean;
}) {
  return post<AssessResult>(`${base}`, input);
}
export function listStopbang(visitId: string) {
  return get<StopBangScreening[]>(`${base}`, { visitId });
}
