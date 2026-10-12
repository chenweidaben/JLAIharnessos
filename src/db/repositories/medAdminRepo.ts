/**
 * 健澜科技 jlmedaios - 给药三查七对 MAR Repository（M17-B）
 *
 * clinical.med_administrations 读写：五对结果 + 高危药双人核对 + 本人签名 + CDS override。
 *
 * 并发与一致性：
 *  - idempotency_key 唯一：同键重放由聚合器转 409；
 *  - 状态机 planned/arrived -> given/held/waste/cancelled，CAS 更新（重复置 given 返回 null）；
 *  - 高危行 double_check_by 与 ≠ administered_by 由聚合器前置校验后写入；repo 仅透传。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';
import type { MedAdminStatus, MedErrorType } from '../../medical-tools/nursing/medAdminCheck.js';

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

export interface MedAdministration {
  id: string;
  orderId: string;
  visitId: string;
  patientId: string;
  medName: string;
  dose: string;
  route: string;
  medFreq: string;
  checkPatient: boolean;
  checkMed: boolean;
  checkDose: boolean;
  checkTime: boolean;
  checkExpire: boolean;
  highRisk: boolean;
  doubleCheckBy: string | null;
  administeredBy: string;
  signature: string;
  cdsBlocked: boolean;
  overrideReason: string | null;
  status: MedAdminStatus;
  errorType: MedErrorType | null;
  occurredAt: string;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

const ADMIN_COLS = `
  id, order_id, visit_id, patient_id, med_name, dose, route, med_freq,
  check_patient, check_med, check_dose, check_time, check_expire,
  high_risk, double_check_by, administered_by, signature,
  cds_blocked, override_reason, status, error_type,
  occurred_at, idempotency_key, created_at, updated_at
`;

function mapRow(row: Record<string, unknown>): MedAdministration {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    medName: String(row.med_name),
    dose: String(row.dose),
    route: String(row.route ?? ''),
    medFreq: String(row.med_freq ?? ''),
    checkPatient: row.check_patient === true,
    checkMed: row.check_med === true,
    checkDose: row.check_dose === true,
    checkTime: row.check_time === true,
    checkExpire: row.check_expire === true,
    highRisk: row.high_risk === true,
    doubleCheckBy: row.double_check_by ? String(row.double_check_by) : null,
    administeredBy: String(row.administered_by),
    signature: String(row.signature),
    cdsBlocked: row.cds_blocked === true,
    overrideReason: row.override_reason ? String(row.override_reason) : null,
    status: row.status as MedAdminStatus,
    errorType: (row.error_type as MedErrorType | null) ?? null,
    occurredAt: String(row.occurred_at),
    idempotencyKey: String(row.idempotency_key),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export interface MedAdminInput {
  orderId: string;
  visitId: string;
  patientId: string;
  medName: string;
  dose: string;
  route?: string;
  medFreq?: string;
  checkPatient: boolean;
  checkMed: boolean;
  checkDose: boolean;
  checkTime: boolean;
  checkExpire: boolean;
  highRisk: boolean;
  doubleCheckBy?: string | null;
  administeredBy: string;
  signature: string;
  cdsBlocked: boolean;
  overrideReason?: string | null;
  status?: MedAdminStatus;
  errorType?: MedErrorType | null;
  occurredAt?: string | null;
  idempotencyKey: string;
}

/** 唯一约束冲突判定（postgres.js 错误码 23505）。 */
export function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null
    && (err as { code?: string }).code === '23505';
}

/** 写入一条给药执行记录。重复 idempotency_key 抛唯一冲突，由聚合器转 409。 */
export async function createMedAdmin(input: MedAdminInput, tx: DbExecutor): Promise<MedAdministration> {
  const rows = await tx`
    INSERT INTO clinical.med_administrations (
      order_id, visit_id, patient_id, med_name, dose, route, med_freq,
      check_patient, check_med, check_dose, check_time, check_expire,
      high_risk, double_check_by, administered_by, signature,
      cds_blocked, override_reason, status, error_type, occurred_at, idempotency_key
    ) VALUES (
      ${input.orderId}, ${input.visitId}, ${input.patientId}, ${input.medName}, ${input.dose},
      ${input.route ?? ''}, ${input.medFreq ?? ''},
      ${input.checkPatient}, ${input.checkMed}, ${input.checkDose}, ${input.checkTime}, ${input.checkExpire},
      ${input.highRisk}, ${input.doubleCheckBy ?? null}, ${input.administeredBy}, ${input.signature},
      ${input.cdsBlocked}, ${input.overrideReason ?? null}, ${input.status ?? 'given'},
      ${input.errorType ?? null}, ${input.occurredAt ?? new Date().toISOString()}, ${input.idempotencyKey}
    )
    RETURNING ${tx.unsafe(ADMIN_COLS)}`;
  return mapRow(rows[0] as Record<string, unknown>);
}

export async function getMedAdminById(id: string, sql?: DbExecutor): Promise<MedAdministration | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(ADMIN_COLS)} FROM clinical.med_administrations WHERE id = ${id}`;
  return rows.length > 0 ? mapRow(rows[0] as Record<string, unknown>) : null;
}

/**
 * 列表：visit_id/order_id 为 uuid 列，禁止空串占位（会抛 invalid uuid），TS 侧条件拼接；
 * status/error_type 为 text 列，保留空串占位。
 */
export async function listMedAdmins(
  filter: { visitId?: string; orderId?: string; status?: string; errorType?: string } = {},
  sql?: DbExecutor,
): Promise<MedAdministration[]> {
  const db = sql ?? getDb();
  const conds = [];
  if (filter.visitId) conds.push(db`visit_id = ${filter.visitId}`);
  if (filter.orderId) conds.push(db`order_id = ${filter.orderId}`);
  if (filter.status) conds.push(db`status = ${filter.status}`);
  if (filter.errorType) conds.push(db`error_type = ${filter.errorType}`);
  let where = db``;
  if (conds.length > 0) {
    where = db`WHERE ${conds[0]}`;
    for (let i = 1; i < conds.length; i++) where = db`${where} AND ${conds[i]}`;
  }
  const rows = await db`
    SELECT ${db.unsafe(ADMIN_COLS)} FROM clinical.med_administrations
    ${where}
    ORDER BY occurred_at DESC, created_at DESC`;
  return (rows as Record<string, unknown>[]).map(mapRow);
}

/** 差错指标聚合明细：拉全量行供纯函数 computeMedErrorMetrics 计算（数据量小可内存算）。 */
export async function listAllForMetrics(sql?: DbExecutor): Promise<MedAdministration[]> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(ADMIN_COLS)} FROM clinical.med_administrations`;
  return (rows as Record<string, unknown>[]).map(mapRow);
}
