/**
 * 健澜科技 jlmedaios - 号源排班前端 API（M19-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { SlotItem } from '@/types/scheduleSlot';

const base = '/schedule-slots';

export function listSlots(department?: string, workDate?: string) {
  return get<SlotItem[]>(base, { department: department ?? '', workDate: workDate ?? '' });
}
export function bookSlot(id: string) {
  return post<SlotItem>(`${base}/${id}/book`, {});
}
export function cancelSlot(id: string) {
  return post<SlotItem>(`${base}/${id}/cancel`, {});
}
