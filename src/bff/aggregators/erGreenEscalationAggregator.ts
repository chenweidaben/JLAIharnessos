/**
 * 健澜科技 jlmedaios - 急诊绿色通道超时催办聚合器（M37-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';
import { getDb, withTx } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import { createTask, hasOpenTask } from '../../db/repositories/improvementTaskRepo.js';
import { isOverdue, erGreenTaskTitle, erGreenTaskFinding } from '../../medical-tools/nursing/erGreenEscalation.js';

export class ErGreenError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message); this.name = 'ErGreenError';
  }
}
const forbidden = (m: string) => new ErGreenError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}

interface OverdueRow {
  visitId: string; level: string; chiefComplaint: string; createdAt: Date; triagedBy: string;
}

export async function scanAndEscalate(auth: AuthView): Promise<{ created: number }> {
  assertPermission(auth, 'er_triage:view');
  const db = getDb();
  const now = new Date();
  const rows = await db`
    SELECT visit_id, level, chief_complaint, created_at, triaged_by
    FROM clinical.er_triage_levels
    WHERE level IN ('I','II') AND green_channel = true`;
  let created = 0;
  for (const r of rows) {
    const triagedAt = new Date(String(r.created_at));
    if (!isOverdue(String(r.level), triagedAt, now)) continue;
    const visitId = String(r.visit_id);
    const exists = await hasOpenTask(visitId, 'er_green');
    if (exists) continue;
    await withTx(async (tx) => {
      const minutes = (now.getTime() - triagedAt.getTime()) / 60000;
      const t = await createTask({
        source: 'er_green', visitId,
        title: erGreenTaskTitle(String(r.level)),
        finding: erGreenTaskFinding(String(r.level), minutes),
        assigneeId: String(r.triaged_by), createdBy: auth.id,
      }, tx);
      await recordChainAudit({
        actorId: auth.id, actorRole: auth.rawRoles.join(','), actorDept: auth.deptName,
        action: 'er_green.escalate', resourceType: 'improvement_task', resourceId: t.id,
        patientRef: null, visitRef: visitId, result: 'success',
        detail: { level: r.level, minutes: Math.round(minutes) },
      }, tx);
    });
    created++;
  }
  return { created };
}

export async function listOverdue(auth: AuthView): Promise<OverdueRow[]> {
  if (process.env.DEMO_MODE === '1') {
    return [
      { visitId: 'V-DEMO-001', level: 'I', chiefComplaint: '急性胸痛', createdAt: new Date(Date.now() - 3600000), triagedBy: 'demo-nurse-01' },
      { visitId: 'V-DEMO-002', level: 'II', chiefComplaint: '剧烈腹痛', createdAt: new Date(Date.now() - 1800000), triagedBy: 'demo-nurse-02' },
    ];
  }
  assertPermission(auth, 'er_triage:view');
  const db = getDb();
  const now = new Date();
  const rows = await db`
    SELECT visit_id, level, chief_complaint, created_at, triaged_by
    FROM clinical.er_triage_levels
    WHERE level IN ('I','II') AND green_channel = true`;
  return rows
    .map(r => ({
      visitId: String(r.visit_id), level: String(r.level), chiefComplaint: String(r.chief_complaint),
      createdAt: new Date(String(r.created_at)), triagedBy: String(r.triaged_by),
    }))
    .filter(r => isOverdue(r.level, r.createdAt, now));
}
