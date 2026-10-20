import type { AuthView } from '../view/userView.js';
import * as repo from '@/db/repositories/timelinessRepo';

export class TimelinessError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/**
 * v5.0试点扩展（M189 EMR/AI种子）：DEMO_MODE 文书时效确定性种子。
 * 固定 5 条待处理文书台账，其中 2 条已逾期、2 条今日到期、1 条时限内，
 * 保证页面「待处理/已逾期/今日到期」三个计数器均非零。
 * 字段与 clinical.document_timeliness mapRow 输出一致（camelCase）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
function buildDemoTimeliness(): Array<{
  id: string; visitId: string; docType: string; requiredMinutes: number;
  createdAt: string; dueAt: string; completedAt: string | null;
  status: 'pending' | 'ontime' | 'late'; lateMinutes: number | null;
}> {
  const now = Date.now();
  const iso = (ts: number) => new Date(ts).toISOString();
  const h = 60 * 60 * 1000;
  const d = 24 * h;
  // 今日 23:59 的时间戳（用于「今日到期」）
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 0, 0);
  const eot = endOfToday.getTime();
  return [
    // 已逾期 2 条
    {
      id: 'demo-tl-1', visitId: 'V20261018001', docType: 'first_progress',
      requiredMinutes: 480, createdAt: iso(now - 26 * h), dueAt: iso(now - 2 * h),
      completedAt: null, status: 'pending', lateMinutes: 120,
    },
    {
      id: 'demo-tl-2', visitId: 'V20261018002', docType: 'admission_note',
      requiredMinutes: 1440, createdAt: iso(now - 28 * h), dueAt: iso(now - 1 * h),
      completedAt: null, status: 'pending', lateMinutes: 60,
    },
    // 今日到期 2 条（尚未逾期）
    {
      id: 'demo-tl-3', visitId: 'V20261019003', docType: 'daily_progress',
      requiredMinutes: 1440, createdAt: iso(now - 6 * h), dueAt: iso(eot),
      completedAt: null, status: 'pending', lateMinutes: null,
    },
    {
      id: 'demo-tl-4', visitId: 'V20261019004', docType: 'consent',
      requiredMinutes: 60, createdAt: iso(now - 30 * 60 * 1000), dueAt: iso(eot - 2 * h),
      completedAt: null, status: 'pending', lateMinutes: null,
    },
    // 时限内 1 条
    {
      id: 'demo-tl-5', visitId: 'V20261019005', docType: 'surgery_record',
      requiredMinutes: 1440, createdAt: iso(now - 4 * h), dueAt: iso(now + 2 * d),
      completedAt: null, status: 'pending', lateMinutes: null,
    },
  ];
}

export async function listView(view: AuthView) {
  if (!view.permissions.includes('timeliness:view')) throw new TimelinessError(403, '无查看权限');
  // v5.0试点扩展（M189 EMR/AI种子）：DEMO_MODE 直接返回确定性演示种子
  if (process.env.DEMO_MODE === '1') return buildDemoTimeliness();
  return repo.listPending();
}

export async function scanView(view: AuthView) {
  if (!view.permissions.includes('timeliness:alert')) throw new TimelinessError(403, '无预警权限');
  return repo.scanLate();
}

export async function createView(view: AuthView, body: Record<string, unknown>) {
  if (!body.visitId) throw new TimelinessError(400, 'visitId 必填');
  if (!body.docType) throw new TimelinessError(400, 'docType 必填');
  const requiredMap: Record<string, number> = {
    admission_note: 1440, first_progress: 480, daily_progress: 1440,
    discharge_summary: 1440, consent: 60, surgery_record: 1440,
  };
  const required = requiredMap[body.docType as string] ?? 1440;
  return repo.create({
    visitId: String(body.visitId), docType: String(body.docType),
    requiredMinutes: required, createdBy: view.id,
  });
}
