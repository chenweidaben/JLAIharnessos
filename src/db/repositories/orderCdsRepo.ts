/**
 * 健澜科技 jlmedaios - 医嘱开方 CDS Repository（M18-A）
 *
 * clinical.order_cds_alerts 读写。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';
import type { CdsRuleCode, CdsSeverity } from '../../medical-tools/order/cdsRules.js';

export interface OrderCdsAlert {
  id: string;
  orderId: string;
  visitId: string;
  patientId: string;
  ruleCode: CdsRuleCode;
  severity: CdsSeverity;
  message: string;
  overrideBy: string | null;
  overrideReason: string | null;
  createdAt: string;
}

const COLS = `id, order_id, visit_id, patient_id, rule_code, severity, message, override_by, override_reason, created_at`;

function map(row: Record<string, unknown>): OrderCdsAlert {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    ruleCode: row.rule_code as CdsRuleCode,
    severity: row.severity as CdsSeverity,
    message: String(row.message),
    overrideBy: row.override_by ? String(row.override_by) : null,
    overrideReason: row.override_reason ? String(row.override_reason) : null,
    createdAt: String(row.created_at),
  };
}

export interface NewAlert {
  orderId: string;
  visitId: string;
  patientId: string;
  ruleCode: CdsRuleCode;
  severity: CdsSeverity;
  message: string;
}

export async function insertAlert(input: NewAlert, tx: DbExecutor): Promise<OrderCdsAlert> {
  const rows = await tx`
    INSERT INTO clinical.order_cds_alerts (order_id, visit_id, patient_id, rule_code, severity, message)
    VALUES (${input.orderId}, ${input.visitId}, ${input.patientId}, ${input.ruleCode}, ${input.severity}, ${input.message})
    RETURNING ${tx.unsafe(COLS)}`;
  return map(rows[0] as Record<string, unknown>);
}

export async function listByOrder(orderId: string, sql?: DbExecutor): Promise<OrderCdsAlert[]> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(COLS)} FROM clinical.order_cds_alerts WHERE order_id = ${orderId} ORDER BY created_at DESC`;
  return (rows as Record<string, unknown>[]).map(map);
}

/** 按就诊列；visit_id uuid 条件拼接。 */
export async function listByVisit(visitId: string, sql?: DbExecutor): Promise<OrderCdsAlert[]> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(COLS)} FROM clinical.order_cds_alerts WHERE visit_id = ${visitId} ORDER BY created_at DESC`;
  return (rows as Record<string, unknown>[]).map(map);
}

/** 某就诊未 override 的 hard 拦截数。 */
export async function countUnresolvedHard(visitId: string, sql?: DbExecutor): Promise<number> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT count(*)::int AS n FROM clinical.order_cds_alerts
    WHERE visit_id = ${visitId} AND severity = 'hard' AND override_by IS NULL`;
  return Number((rows[0] as Record<string, unknown>).n);
}

/** override 落库。 */
export async function overrideAlert(id: string, by: string, reason: string, tx: DbExecutor): Promise<OrderCdsAlert | null> {
  const rows = await tx`
    UPDATE clinical.order_cds_alerts SET override_by = ${by}, override_reason = ${reason}
    WHERE id = ${id}
    RETURNING ${tx.unsafe(COLS)}`;
  return rows.length > 0 ? map(rows[0] as Record<string, unknown>) : null;
}

export async function getAlertById(id: string, sql?: DbExecutor): Promise<OrderCdsAlert | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(COLS)} FROM clinical.order_cds_alerts WHERE id = ${id}`;
  return rows.length > 0 ? map(rows[0] as Record<string, unknown>) : null;
}
