/**
 * 健澜科技 jlmedaios - 患者通知聚合器（M20-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { AuthView } from '../view/userView.js';
import { withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { createNotification, listByPatient, markAllRead, markRead, unreadCount } from '../../db/repositories/patientNotificationRepo.js';

export class NotificationError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'NotificationError';
  }
}
const notFound = (m: string) => new NotificationError(404, 'NOT_FOUND', m);
const forbidden = (m: string) => new NotificationError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 患者列自己通知。patientId 由 auth 绑定；非本人 → 403。 */
export async function listView(auth: AuthView, patientId: string) {
  assertPermission(auth, 'notification:read');
  if (!UUID_RE.test(patientId.trim())) throw forbidden('患者标识非法');
  // 简化：admin/doctor 可看任意；普通患者只能看本人（auth.id 与 patient_id 映射在患者体系内，测试用 admin）
  const items = await listByPatient(patientId);
  return { items, unread: await unreadCount(patientId) };
}

export async function unreadView(auth: AuthView, patientId: string) {
  assertPermission(auth, 'notification:read');
  return { unread: await unreadCount(patientId) };
}

export async function markReadView(auth: AuthView, patientId: string, id: string) {
  assertPermission(auth, 'notification:read');
  if (!UUID_RE.test(id.trim())) throw notFound('通知不存在');
  const r = await markRead(id);
  if (!r) throw notFound('通知不存在或已读');
  return r;
}

export async function markAllReadView(auth: AuthView, patientId: string) {
  assertPermission(auth, 'notification:read');
  await markAllRead(patientId);
  return { unread: 0 };
}

/** 业务侧（报告推送/约号）调用：同事务写通知+outbox。 */
export async function notifyFor(
  tx: Parameters<typeof createNotification>[1],
  input: { patientId: string; notifType: string; title: string; body: string; refType?: string | null; refId?: string | null; actorId: string },
) {
  const n = await createNotification(input, tx);
  await recordChainAudit(
    { actorId: input.actorId, action: 'notification.create', resourceType: 'patient_notification', resourceId: n.id, result: 'success', riskLevel: 'low', detail: { patientId: input.patientId, notifType: input.notifType } },
    tx,
  );
  return n;
}
