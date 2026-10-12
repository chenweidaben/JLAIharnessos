/**
 * 健澜科技 jlmedaios - 通知中心 API（M20-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { NotificationItem } from '@/types/notification';

const base = '/patient-notifications';

export function listNotifications(patientId: string) {
  return get<{ items: NotificationItem[]; unread: number }>(base, { patientId });
}
export function unreadNotifications(patientId: string) {
  return get<{ unread: number }>(`${base}/unread`, { patientId });
}
export function markRead(id: string, patientId: string) {
  return post<NotificationItem>(`${base}/${id}/read?patientId=${encodeURIComponent(patientId)}`, {});
}
export function markAllRead(patientId: string) {
  return post<{ unread: number }>(`${base}/read-all?patientId=${encodeURIComponent(patientId)}`, {});
}
