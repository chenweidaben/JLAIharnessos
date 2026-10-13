/**
 * 健澜科技 jlmedaios - 满意度提醒 API（M64-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { get, post } from '../request';

export interface PendingItem { id: string; title: string; body: string; createdAt: string }

export function runNotifyScan() {
  return post<{ pushed: number }>('/satisfaction/notify-scan', {});
}
export function getMyPending() {
  return get<{ items: PendingItem[] }>('/satisfaction/my-pending').then((r) => r.items);
}
