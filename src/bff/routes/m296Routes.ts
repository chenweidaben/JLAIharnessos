/**
 * 健澜科技 jlmedaios - M296 护理 NQI + 病历锁定历史
 *
 * 护理质量趋势/病历锁定历史
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/nursing/nqi-trend - 护理质量趋势 5 条 */
async function handleNqiTrend(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { indicator: '护理不良事件发生率', month: '2026-08', score: '0.12%', target: '<0.20%', trend: '↓ 改善' },
    { indicator: '压疮发生率', month: '2026-08', score: '0.08%', target: '<0.10%', trend: '→ 持平' },
    { indicator: '跌倒发生率', month: '2026-08', score: '0.05%', target: '<0.08%', trend: '↓ 改善' },
    { indicator: '护理文书书写合格率', month: '2026-08', score: '98.5%', target: '≥95%', trend: '↑ 提升' },
    { indicator: '患者满意度（护理）', month: '2026-08', score: '96.2%', target: '≥95%', trend: '↑ 提升' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emr/lock-history - 病历锁定历史 5 条 */
async function handleEmrLockHistory(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'LH-001', recordId: 'EMR-2026-1001', lockedBy: '李***主治医师', lockTime: '2026-10-15 10:30', unlockTime: '—', status: '已锁定（出院归档）' },
    { id: 'LH-002', recordId: 'EMR-2026-1002', lockedBy: '王***主任医师', lockTime: '2026-10-14 14:00', unlockTime: '2026-10-16 09:00', status: '已解锁（质控返修）' },
    { id: 'LH-003', recordId: 'EMR-2026-1003', lockedBy: '陈***副主任医师', lockTime: '2026-10-13 11:00', unlockTime: '—', status: '已锁定（死亡病历）' },
    { id: 'LH-004', recordId: 'EMR-2026-1004', lockedBy: '赵***主治医师', lockTime: '2026-10-12 16:30', unlockTime: '2026-10-13 08:00', status: '已解锁（医生修改）' },
    { id: 'LH-005', recordId: 'EMR-2026-1005', lockedBy: '刘***主任医师', lockTime: '2026-10-11 09:00', unlockTime: '—', status: '已锁定（出院归档）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m296Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/nursing/nqi-trend', handle: handleNqiTrend, auth: true },
  { method: 'GET', path: '/api/v1/emr/lock-history', handle: handleEmrLockHistory, auth: true },
];
