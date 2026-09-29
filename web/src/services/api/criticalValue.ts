/**
 * 健澜科技 jlmedaios - 危急值闭环 API 服务（M3-F）
 *
 * 真实 BFF（src/bff/routes/critical.ts），读写 PostgreSQL，无 mock。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { get, post } from '../request';
import type { CriticalAlertItem } from '@/types/criticalValue';

/** 扫描并上报新危急值（幂等）。 */
export function scanCritical(): Promise<{ raised: number }> {
  return post<{ raised: number }>('/critical/scan', {});
}

/** 告警队列（可按状态过滤）。 */
export function fetchCriticalAlerts(status?: string): Promise<{ items: CriticalAlertItem[] }> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return get<{ items: CriticalAlertItem[] }>(`/critical/alerts${qs}`);
}

/** 医师签收。 */
export function ackCritical(id: string): Promise<unknown> {
  return post(`/critical/ack/${id}`, {});
}

/** 医师处置闭环。 */
export function resolveCritical(id: string, note: string): Promise<unknown> {
  return post(`/critical/resolve/${id}`, { note });
}
