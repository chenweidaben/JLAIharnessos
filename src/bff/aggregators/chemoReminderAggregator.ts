/**
 * 健澜科技 jlmedaios - 化疗 T-1 提醒聚合器（M43-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { getDb, withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { isEligibleForReminder, buildMessage } from '../../medical-tools/nursing/chemoReminder.js';

export class ChemoReminderError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message); this.name = 'ChemoReminderError';
  }
}
const forbidden = (m: string) => new ChemoReminderError(403, 'FORBIDDEN', m);
function assertPermission(auth: AuthView): void {
  if (!auth.permissions.includes('chemo:remind')) throw forbidden('缺少权限：chemo:remind');
}

const CCOLS = `id, patient_id, drug_name, cycle_no, planned_date, status, reminder_sent, created_at`;

export async function scanDueReminders(auth: AuthView): Promise<{ scanned: number; notified: number }> {
  assertPermission(auth);
  const db = getDb();
  const tomorrow = new Date(Date.now() + 86400000);
  const y = tomorrow.getFullYear();
  const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const d = String(tomorrow.getDate()).padStart(2, '0');
  const rows = await db`
    SELECT ${db.unsafe(CCOLS)} FROM clinical.chemo_cycles
    WHERE status='planned' AND planned_date=${`${y}-${m}-${d}`} AND reminder_sent=false`;
  let notified = 0;
  for (const r of rows) {
    const plannedIso = new Date(String(r.planned_date)).toISOString().slice(0, 10);
    if (!isEligibleForReminder(plannedIso, new Date(), Boolean(r.reminder_sent))) continue;
    await withTx(async (tx) => {
      await tx`UPDATE clinical.chemo_cycles SET reminder_sent=true WHERE id=${String(r.id)}`;
      const msg = buildMessage(String(r.drug_name), Number(r.cycle_no));
      await recordChainAudit({
        actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
        action: 'chemo.reminder', resourceType: 'chemo_cycle', resourceId: String(r.id),
        patientRef: String(r.patient_id), visitRef: null, result: 'success',
        detail: { title: msg.title },
      }, tx);
    });
    notified++;
  }
  return { scanned: rows.length, notified };
}

export async function listUpcoming(auth: AuthView): Promise<{ id: string; patientId: string; drug: string; cycleNo: number; plannedDate: string; reminderSent: boolean }[]> {
  if (process.env.DEMO_MODE === '1') {
    return [
      { id: 'demo-chemo-1', patientId: 'P-DEMO-001', drug: '紫杉醇', cycleNo: 2, plannedDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10), reminderSent: false },
      { id: 'demo-chemo-2', patientId: 'P-DEMO-002', drug: '顺铂', cycleNo: 4, plannedDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10), reminderSent: false },
    ];
  }
  if (!auth.permissions.includes('oncology:view') && !auth.permissions.includes('chemo:remind')) throw forbidden('缺少权限');
  const db = getDb();
  const tomorrow = new Date(Date.now() + 86400000);
  const y = tomorrow.getFullYear();
  const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const d = String(tomorrow.getDate()).padStart(2, '0');
  const rows = await db`
    SELECT ${db.unsafe(CCOLS)} FROM clinical.chemo_cycles
    WHERE status='planned' AND planned_date=${`${y}-${m}-${d}`} ORDER BY planned_date`;
  return rows.map(r => ({
    id: String(r.id), patientId: String(r.patient_id), drug: String(r.drug_name),
    cycleNo: Number(r.cycle_no), plannedDate: String(r.planned_date),
    reminderSent: Boolean(r.reminder_sent),
  }));
}
