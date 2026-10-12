/**
 * 健澜科技 jlmedaios - 在院费用监控 API（M22-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { MonitorItem } from '@/types/inpatientCostMonitor';

const base = '/inpatient-cost-monitor';

export function listMonitors() {
  return get<MonitorItem[]>(base);
}
export function refresh(visitId: string, body: { groupCode: string; accumulatedCost: number }) {
  return post<MonitorItem>(`${base}/${visitId}/refresh`, body);
}
export function dischargeReview(visitId: string) {
  return post<{ discharged: boolean; reason: string; level: string }>(`${base}/${visitId}/discharge-review`, {});
}
