/**
 * 健澜科技 jlmedaios - 配药任务 API（M21-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { PharmacyTaskItem } from '@/types/pharmacy';

export function listPendingTasks() {
  return get<PharmacyTaskItem[]>('/pharmacy-tasks');
}
export function completeTask(id: string) {
  return post<{ task: PharmacyTaskItem }>(`/pharmacy-tasks/${id}/complete`, {});
}
