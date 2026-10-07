/**
 * 健澜科技 jlmedaios - 危急值闭环 Repository（M3-F）
 *
 * clinical.critical_value_alerts 读写。
 *
 * 并发与一致性：
 *  - 扫描上报：lab_result_id 唯一，INSERT ... ON CONFLICT DO NOTHING，
 *    同一危急值结果重复扫描只产生一条告警；
 *  - 签收/处置：FOR UPDATE 行锁 + 状态白名单（raised -> acked -> resolved）；
 *  - DataScope 在聚合器按 department 过滤。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';

export type CriticalStatus = 'raised' | 'acked' | 'resolved';

export interface CriticalAlert {
  id: string;
  labResultId: string;
  visitId: string;
  patientId: string;
  department: string;
  itemName: string;
  itemCode: string | null;
  value: string | null;
  unit: string | null;
  refLow: string | null;
  refHigh: string | null;
  flag: string | null;
  status: CriticalStatus;
  raisedAt: string;
  ackedBy: string | null;
  ackedAt: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  dispositionNote: string | null;
  createdAt: string;
  updatedAt: string;
}

const COLS = `
  id, lab_result_id, visit_id, patient_id, department,
  item_name, item_code, value, unit, ref_low, ref_high, flag,
  status, raised_at, acked_by, acked_at, resolved_by, resolved_at, disposition_note,
  created_at, updated_at
`;

function mapRow(row: Record<string, unknown>): CriticalAlert {
  return {
    id: String(row.id),
    labResultId: String(row.lab_result_id),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    department: String(row.department),
    itemName: String(row.item_name),
    itemCode: row.item_code ? String(row.item_code) : null,
    value: row.value != null ? String(row.value) : null,
    unit: row.unit ? String(row.unit) : null,
    refLow: row.ref_low != null ? String(row.ref_low) : null,
    refHigh: row.ref_high != null ? String(row.ref_high) : null,
    flag: row.flag ? String(row.flag) : null,
    status: row.status as CriticalStatus,
    raisedAt: String(row.raised_at),
    ackedBy: row.acked_by ? String(row.acked_by) : null,
    ackedAt: row.acked_at ? String(row.acked_at) : null,
    resolvedBy: row.resolved_by ? String(row.resolved_by) : null,
    resolvedAt: row.resolved_at ? String(row.resolved_at) : null,
    dispositionNote: row.disposition_note ? String(row.disposition_note) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/**
 * 扫描全部 is_critical 但尚无告警的检验结果，幂等上报。返回新产生的告警（完整信息）。
 *
 * 可选 options.labResultIds：仅扫描指定的检验结果（用于测试隔离或针对性重扫）；
 * 不传则扫描全部。
 */
export async function scanAndRaise(
  sql?: DbExecutor,
  options?: { labResultIds?: string[] },
): Promise<CriticalAlert[]> {
  const db = sql ?? getDb();
  const scope = options?.labResultIds?.length
    ? db`AND lr.id IN ${db(options.labResultIds)}`
    : db``;
  const rows = await db`
    INSERT INTO clinical.critical_value_alerts (
      lab_result_id, visit_id, patient_id, department,
      item_name, item_code, value, unit, ref_low, ref_high, flag
    )
    SELECT lr.id, lr.visit_id, lr.patient_id, v.department,
           lr.item_name, lr.item_code, lr.value, lr.unit, lr.ref_low, lr.ref_high, lr.abnormal_flag
    FROM clinical.lab_results lr
    JOIN clinical.visits v ON v.id = lr.visit_id
    WHERE lr.is_critical = true
      AND NOT EXISTS (
        SELECT 1 FROM clinical.critical_value_alerts a WHERE a.lab_result_id = lr.id
      )
      ${scope}
    ON CONFLICT (lab_result_id) DO NOTHING
    RETURNING ${db.unsafe(COLS)}
  `;
  return (rows as Record<string, unknown>[]).map((r) => mapRow(r));
}

export async function getById(id: string, sql?: DbExecutor): Promise<CriticalAlert | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(COLS)} FROM clinical.critical_value_alerts WHERE id = ${id}`;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

export interface CriticalListRow {
  id: string;
  visitId: string;
  visitNo: string;
  patientName: string;
  department: string;
  itemName: string;
  value: string | null;
  unit: string | null;
  flag: string | null;
  status: CriticalStatus;
  raisedAt: string;
}

export async function listAlerts(
  status: CriticalStatus | null,
  sql?: DbExecutor,
): Promise<CriticalListRow[]> {
  const db = sql ?? getDb();
  const where = status ? db`WHERE a.status = ${status}` : db``;
  const rows = await db`
    SELECT a.id, a.visit_id, v.visit_no, p.name_masked, a.department,
           a.item_name, a.value, a.unit, a.flag, a.status, a.raised_at
    FROM clinical.critical_value_alerts a
    JOIN clinical.visits v ON v.id = a.visit_id
    JOIN clinical.patients p ON p.id = a.patient_id
    ${where}
    ORDER BY CASE a.status WHEN 'raised' THEN 0 WHEN 'acked' THEN 1 ELSE 2 END,
             a.raised_at DESC
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    visitId: String(r.visit_id),
    visitNo: String(r.visit_no),
    patientName: String(r.name_masked),
    department: String(r.department),
    itemName: String(r.item_name),
    value: r.value != null ? String(r.value) : null,
    unit: r.unit ? String(r.unit) : null,
    flag: r.flag ? String(r.flag) : null,
    status: r.status as CriticalStatus,
    raisedAt: String(r.raised_at),
  }));
}

/**
 * FOR UPDATE 行锁 + 状态白名单。0 行返回 null（并发冲突/状态非法）。
 */
export async function setStatus(
  id: string,
  fromStatuses: CriticalStatus[],
  toStatus: Exclude<CriticalStatus, 'raised'>,
  opts: { ackedBy?: string; resolvedBy?: string; dispositionNote?: string | null },
  tx: DbExecutor,
): Promise<CriticalAlert | null> {
  const locked = await tx`
    SELECT ${tx.unsafe(COLS)} FROM clinical.critical_value_alerts
    WHERE id = ${id} FOR UPDATE
  `;
  if (locked.length === 0) return null;
  const current = mapRow(locked[0] as Record<string, unknown>);
  if (!fromStatuses.includes(current.status)) return null;

  const rows = await tx`
    UPDATE clinical.critical_value_alerts SET
      status = ${toStatus},
      acked_by = CASE WHEN ${toStatus} = 'acked' THEN ${opts.ackedBy ?? null} ELSE acked_by END,
      acked_at = CASE WHEN ${toStatus} = 'acked' THEN now() ELSE acked_at END,
      resolved_by = CASE WHEN ${toStatus} = 'resolved' THEN ${opts.resolvedBy ?? null} ELSE resolved_by END,
      resolved_at = CASE WHEN ${toStatus} = 'resolved' THEN now() ELSE resolved_at END,
      disposition_note = ${opts.dispositionNote ?? null}
    WHERE id = ${id}
    RETURNING ${tx.unsafe(COLS)}
  `;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

export async function countAlerts(sql?: DbExecutor): Promise<number> {
  const db = sql ?? getDb();
  const rows = await db<{ n: number }[]>`SELECT count(*) AS n FROM clinical.critical_value_alerts`;
  return Number(rows[0]?.n ?? 0);
}

/** 批量获取患者的脱敏姓名（用于实时推送 payload）。 */
export async function getPatientNameMap(
  patientIds: string[],
  sql?: DbExecutor,
): Promise<Record<string, string>> {
  if (patientIds.length === 0) return {};
  const db = sql ?? getDb();
  const rows = await db`
    SELECT id::text AS pid, name_masked
    FROM clinical.patients
    WHERE id IN ${db(patientIds)}
  `;
  const map: Record<string, string> = {};
  for (const r of rows as Record<string, unknown>[]) {
    map[String(r.pid)] = String(r.name_masked);
  }
  return map;
}
