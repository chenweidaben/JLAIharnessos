/**
 * 健澜科技 jlmedaios - SBAR 交接 API（M73-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { CreateInput, SbarHandoff } from '@/types/sbar';

const base = '/sbar';

export function createSbar(input: CreateInput) {
  return post<SbarHandoff>(base, input);
}
export function listSbar(visitId: string) {
  return get<SbarHandoff[]>(base, { visitId });
}
export function receiveSbar(id: string) {
  return post<SbarHandoff>(`${base}/${id}/receive`, {});
}
export function closeSbar(id: string) {
  return post<SbarHandoff>(`${base}/${id}/close`, {});
}
