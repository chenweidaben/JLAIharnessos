/**
 * 健澜科技 jlmedaios - 医嘱执行记录 Repository（M1-B2）
 * clinical.order_administrations 表 CRUD。
 *
 * 严谨性：
 *  - 每次医嘱执行（给药/处置）真实落库，记录执行人(护士)、执行时间、双人核对人；
 *  - 幂等：以 (order_id, idempotency_key) 与 (order_id, slot) 两个唯一约束兜底，
 *      并发重复触发同一执行时点时，仅一条成功，其余命中唯一冲突（由聚合器转 409/幂等返回）；
 *  - 高风险药/血制品要求双人核对（checked_by 非空），由聚合器按医嘱
 *      requires_double_check 强制。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';

export type AdministrationStatus = 'administered' | 'held' | 'refused';

export interface Administration {
  id: string;
  orderId: string;
  visitId: string;
  patientId: string;
  adminNo: string;
  slot: string;
  idempotencyKey: string;
  status: AdministrationStatus;
  dose: string | null;
  administeredBy: string;
  checkedBy: string | null;
  administeredAt: string;
  note: string | null;
  createdAt: string;
}

export interface AdministrationInput {
  orderId: string;
  visitId: string;
  patientId: string;
  slot: string;
  idempotencyKey: string;
  status?: AdministrationStatus;
  dose?: string | null;
  administeredBy: string;
  checkedBy?: string | null;
  administeredAt?: string | null;
  note?: string | null;
}

const SELECT_COLS = `id, order_id, visit_id, patient_id, admin_no, slot, idempotency_key,
  status, dose, administered_by, checked_by, administered_at, note, created_at`;

function mapRow(row: Record<string, unknown>): Administration {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    adminNo: String(row.admin_no),
    slot: String(row.slot),
    idempotencyKey: String(row.idempotency_key),
    status: row.status as AdministrationStatus,
    dose: row.dose ? String(row.dose) : null,
    administeredBy: String(row.administered_by),
    checkedBy: row.checked_by ? String(row.checked_by) : null,
    administeredAt: String(row.administered_at),
    note: row.note ? String(row.note) : null,
    createdAt: String(row.created_at),
  };
}

function generateAdminNo(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const hms = `${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
  return `ADM${ymd}${hms}${Math.floor(Math.random() * 900) + 100}`;
}

/** 唯一约束冲突判定（postgres.js 错误码 23505） */
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: string }).code === '23505'
  );
}

/**
 * 写入一条医嘱执行记录。
 * 并发重复（同 order+slot / idempotency_key）→ 抛唯一冲突，由调用方用 isUniqueViolation 判定。
 */
export async function createAdministration(
  input: AdministrationInput,
  db?: DbExecutor,
): Promise<Administration> {
  const exec = db ?? getDb();
  const rows = await exec`
    INSERT INTO clinical.order_administrations (
      order_id, visit_id, patient_id, admin_no, slot, idempotency_key, status, dose,
      administered_by, checked_by, administered_at, note
    ) VALUES (
      ${input.orderId}, ${input.visitId}, ${input.patientId}, ${generateAdminNo()},
      ${input.slot}, ${input.idempotencyKey}, ${input.status ?? 'administered'},
      ${input.dose ?? null}, ${input.administeredBy}, ${input.checkedBy ?? null},
      ${input.administeredAt ?? new Date().toISOString()}, ${input.note ?? null}
    )
    RETURNING ${exec.unsafe(SELECT_COLS)}
  `;
  return mapRow(rows[0] as Record<string, unknown>);
}

/** 幂等读取：按医嘱 + 幂等键查找已存在执行记录（并发冲突后用于返回既有记录）。 */
export async function findAdministration(
  orderId: string, idempotencyKey: string, db?: DbExecutor,
): Promise<Administration | null> {
  const exec = db ?? getDb();
  const rows = await exec`
    SELECT ${exec.unsafe(SELECT_COLS)} FROM clinical.order_administrations
    WHERE order_id = ${orderId} AND idempotency_key = ${idempotencyKey}
  `;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

/**
 * 幂等写入（事务安全）：以 ON CONFLICT DO NOTHING 落库，不抛唯一冲突、不中止事务。
 * 命中唯一约束（同 order+idempotency_key / slot）时，返回既有记录且 inserted=false，
 * 供聚合器判定 deduplicated；这是并发不重复执行的关键路径。
 */
export async function insertAdministrationOnce(
  input: AdministrationInput,
  db?: DbExecutor,
): Promise<{ admin: Administration; inserted: boolean }> {
  const exec = db ?? getDb();
  const rows = await exec`
    INSERT INTO clinical.order_administrations (
      order_id, visit_id, patient_id, admin_no, slot, idempotency_key, status, dose,
      administered_by, checked_by, administered_at, note
    ) VALUES (
      ${input.orderId}, ${input.visitId}, ${input.patientId}, ${generateAdminNo()},
      ${input.slot}, ${input.idempotencyKey}, ${input.status ?? 'administered'},
      ${input.dose ?? null}, ${input.administeredBy}, ${input.checkedBy ?? null},
      ${input.administeredAt ?? new Date().toISOString()}, ${input.note ?? null}
    )
    ON CONFLICT DO NOTHING
    RETURNING ${exec.unsafe(SELECT_COLS)}
  `;
  if (rows.length > 0) {
    return { admin: mapRow(rows[0] as Record<string, unknown>), inserted: true };
  }
  const existing = await findAdministration(input.orderId, input.idempotencyKey, exec);
  return { admin: existing as Administration, inserted: false };
}

/** 列出某医嘱全部执行记录（按时间正序，供在院医嘱视图展示执行史）。 */
export async function listAdministrationsByOrder(
  orderId: string, db?: DbExecutor,
): Promise<Administration[]> {
  const exec = db ?? getDb();
  const rows = await exec`
    SELECT ${exec.unsafe(SELECT_COLS)} FROM clinical.order_administrations
    WHERE order_id = ${orderId} ORDER BY administered_at ASC
  `;
  return (rows as Record<string, unknown>[]).map(mapRow);
}

/** 列出某就诊全部医嘱执行记录（护理/执行总览）。 */
export async function listAdministrationsByVisit(
  visitId: string, db?: DbExecutor,
): Promise<Administration[]> {
  const exec = db ?? getDb();
  const rows = await exec`
    SELECT ${exec.unsafe(SELECT_COLS)} FROM clinical.order_administrations
    WHERE visit_id = ${visitId} ORDER BY administered_at DESC
  `;
  return (rows as Record<string, unknown>[]).map(mapRow);
}

/** 统计某医嘱已执行次数（用于临时医嘱单次完成判定）。 */
export async function countAdministrations(orderId: string, db?: DbExecutor): Promise<number> {
  const exec = db ?? getDb();
  const rows = await exec`
    SELECT count(*)::int AS n FROM clinical.order_administrations
    WHERE order_id = ${orderId} AND status = 'administered'
  `;
  return Number(rows[0]?.n ?? 0);
}
