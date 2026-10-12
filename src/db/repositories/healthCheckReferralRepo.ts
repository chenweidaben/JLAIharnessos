/**
 * 健澜科技 jlmedaios - 体检转诊 repo（M40-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb, type DbExecutor } from '../pool.js';

export interface Referral {
  id: string; orderId: string; abnormalItem: string;
  findingDetail: string | null; suggestedDepartment: string;
  appointmentStatus: string; createdAt: string;
}
const COLS = `id, order_id, abnormal_item, finding_detail, suggested_department, appointment_status, created_at`;
function rmap(r: Record<string, unknown>): Referral {
  return {
    id: String(r.id), orderId: String(r.order_id), abnormalItem: String(r.abnormal_item),
    findingDetail: r.finding_detail ? String(r.finding_detail) : null,
    suggestedDepartment: String(r.suggested_department),
    appointmentStatus: String(r.appointment_status), createdAt: String(r.created_at),
  };
}

export async function createReferral(inp: { orderId: string; abnormalItem: string; findingDetail?: string | null; suggestedDepartment: string }, tx: DbExecutor = getDb()): Promise<Referral> {
  const rows = await tx`
    INSERT INTO clinical.healthcheck_referrals (order_id, abnormal_item, finding_detail, suggested_department)
    VALUES (${inp.orderId}, ${inp.abnormalItem}, ${inp.findingDetail ?? null}, ${inp.suggestedDepartment})
    RETURNING ${tx.unsafe(COLS)}`;
  return rmap(rows[0]);
}

export async function listByOrder(orderId: string): Promise<Referral[]> {
  const db = getDb();
  const rows = await db`SELECT ${db.unsafe(COLS)} FROM clinical.healthcheck_referrals WHERE order_id=${orderId} ORDER BY created_at`;
  return rows.map(rmap);
}

export async function dismissReferral(id: string, tx: DbExecutor = getDb()): Promise<Referral | null> {
  const rows = await tx`
    UPDATE clinical.healthcheck_referrals SET appointment_status='dismissed'
    WHERE id=${id} RETURNING ${tx.unsafe(COLS)}`;
  return rows[0] ? rmap(rows[0]) : null;
}
