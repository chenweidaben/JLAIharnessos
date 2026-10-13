/**
 * 健澜科技 jlmedaios - 输血反应 API（M71-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { ReportInput, TransfusionReaction } from '@/types/transfusionReaction';

const base = '/transfusion-reactions';

export function reportTransfusion(input: ReportInput) {
  return post<TransfusionReaction>(base, input);
}
export function listTransfusion(patientId: string) {
  return get<TransfusionReaction[]>(base, { patientId });
}
