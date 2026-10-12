/**
 * 健澜科技 jlmedaios - 报告推送前端 API（M19-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { ReportPushItem } from '@/types/reportPush';

const base = '/report-pushes';

export function listMine(patientId: string) {
  return get<{ items: ReportPushItem[]; unread: number }>(base, { patientId });
}
export function pushReport(body: { reportType: 'lab' | 'imaging'; reportId: string; patientId: string }) {
  return post<ReportPushItem>(base, body);
}
export function markViewed(id: string) {
  return post<ReportPushItem>(`${base}/${id}/view`, {});
}
