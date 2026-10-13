/**
 * 健澜科技 jlmedaios - 老年综合评估 API（M56-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { AssessResult, CgaAssessment } from '@/types/cga';

const base = '/cga';

export function assessCga(input: {
  visitId: string; adlScore: number; iadlScore: number; mmseScore: number;
  fallRisk?: boolean; mnaScore: number; gdsScore: number;
}) {
  return post<AssessResult>(`${base}`, input);
}
export function listCga(visitId: string) {
  return get<CgaAssessment[]>(`${base}`, { visitId });
}
