/**
 * 健澜科技 jlmedaios - MDT API（M66-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { CreateMdtInput, MdtConsult } from '@/types/mdt';

const base = '/mdt';

export function createMdt(input: CreateMdtInput) {
  return post<MdtConsult>(base, input);
}
export function listMdt(visitId: string) {
  return get<MdtConsult[]>(base, { visitId });
}
export function scheduleMdt(id: string, scheduledAt: string) {
  return post<MdtConsult>(`${base}/${id}/schedule`, { scheduledAt });
}
export function minutesMdt(id: string, minutes: string, conclusion: string) {
  return post<MdtConsult>(`${base}/${id}/minutes`, { minutes, conclusion });
}
