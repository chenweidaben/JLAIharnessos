/**
 * 健澜科技 jlmedaios - 危急值管理 v2 API（M659，配套 M550）
 *
 * 对接 BFF：GET /api/v1/critical-values + POST /api/v1/critical-values/:id/acknowledge
 *   （未注册则 DEMO 兜底，打标 demo:true；POST 不做成功兜底）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

export type CriticalStatus = 'alerted' | 'notified' | 'acknowledged' | 'closed';

export interface CriticalValue {
  id: string;
  patientId: string;
  testName: string;
  result: string;
  refRange: string;
  occurredAt: string;
  status: CriticalStatus;
  notifiedAt: string | null;
  acknowledgedAt: string | null;
  acknowledgingDoctor: string | null;
}

export const CRITICAL_STATUS_META: Record<CriticalStatus, { label: string; color: string }> = {
  alerted: { label: '刚触发', color: 'red' },
  notified: { label: '已通知', color: 'orange' },
  acknowledged: { label: '医师签收', color: 'blue' },
  closed: { label: '已闭环', color: 'green' },
};

const DEMO_CRITICALS: CriticalValue[] = [
  { id: 'CV-001', patientId: 'P10001', testName: '血钾 K+', result: '6.1 mmol/L', refRange: '3.5-5.3', occurredAt: '2026-10-22T06:30:00+08:00', status: 'notified', notifiedAt: '2026-10-22T06:35:00+08:00', acknowledgedAt: null, acknowledgingDoctor: null },
  { id: 'CV-002', patientId: 'P10005', testName: '血糖 GLU', result: '28.6 mmol/L', refRange: '3.9-6.1', occurredAt: '2026-10-22T05:00:00+08:00', status: 'acknowledged', notifiedAt: '2026-10-22T05:05:00+08:00', acknowledgedAt: '2026-10-22T05:15:00+08:00', acknowledgingDoctor: '王医师' },
  { id: 'CV-003', patientId: 'P10011', testName: '血红蛋白 Hb', result: '45 g/L', refRange: '115-150', occurredAt: '2026-10-21T22:00:00+08:00', status: 'closed', notifiedAt: '2026-10-21T22:05:00+08:00', acknowledgedAt: '2026-10-21T22:10:00+08:00', acknowledgingDoctor: '陈主任' },
];

export interface CriticalListResult {
  items: CriticalValue[];
  totalCount: number;
  demo: boolean;
}

export async function fetchCriticalValues(): Promise<CriticalListResult> {
  try {
    const res = await get<{ items: CriticalValue[]; totalCount: number }>('/critical-values');
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_CRITICALS, totalCount: DEMO_CRITICALS.length, demo: true };
  }
}

export async function acknowledgeCriticalValue(id: string, doctor: string): Promise<void> {
  await post(`/critical-values/${id}/acknowledge`, { doctor });
}
