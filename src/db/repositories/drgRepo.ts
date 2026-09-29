/**
 * 健澜科技 jlmedaios - DRG 分组 Repository（M3-D）
 *
 * clinical.drg_group_rules / clinical.drg_group_results 读写。
 *
 * 并发与一致性：
 *  - 幂等重分组：ON CONFLICT (visit_id) DO UPDATE，同一出院就诊重复分组只覆盖一行；
 *  - 确认/退回：FOR UPDATE 行锁 + 源状态白名单（grouped → confirmed/rejected）；
 *  - DataScope 在聚合器按 department 过滤。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';
import { toJson } from './helpers.js';

export type DrgResultStatus = 'grouped' | 'confirmed' | 'rejected';

export interface DrgRule {
  id: string;
  groupCode: string;
  groupName: string;
  mdc: string;
  dxPrefixes: string[];
  requiresOrp: boolean;
  weight: string;
  avgPayment: string;
  enabled: boolean;
  sort: number;
}

export interface DrgGroupResult {
  id: string;
  visitId: string;
  frontPageId: string | null;
  patientId: string;
  department: string;
  primaryDxCode: string | null;
  hasOrp: boolean;
  groupCode: string;
  groupName: string | null;
  mdc: string | null;
  grouperVersion: string;
  weight: string;
  estimatedPayment: string;
  totalFee: string | null;
  balance: string | null;
  explanation: Record<string, unknown>;
  status: DrgResultStatus;
  groupedBy: string | null;
  groupedAt: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
}

const RULE_COLS = `
  id, group_code, group_name, mdc, dx_prefixes, requires_orp, weight, avg_payment, enabled, sort
`;

function mapRule(row: Record<string, unknown>): DrgRule {
  return {
    id: String(row.id),
    groupCode: String(row.group_code),
    groupName: String(row.group_name),
    mdc: String(row.mdc),
    dxPrefixes: Array.isArray(row.dx_prefixes) ? (row.dx_prefixes as string[]) : [],
    requiresOrp: Boolean(row.requires_orp),
    weight: String(row.weight),
    avgPayment: String(row.avg_payment),
    enabled: Boolean(row.enabled),
    sort: Number(row.sort),
  };
}

const RESULT_COLS = `
  id, visit_id, front_page_id, patient_id, department,
  primary_dx_code, has_orp, group_code, group_name, mdc, grouper_version,
  weight, estimated_payment, total_fee, balance, explanation,
  status, grouped_by, grouped_at, confirmed_by, confirmed_at, reject_reason,
  created_at, updated_at
`;

function asObj(v: unknown): Record<string, unknown> {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  if (typeof v === 'string' && v.trim()) {
    try {
      const p: unknown = JSON.parse(v);
      return p && typeof p === 'object' ? (p as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  return {};
}

function mapResult(row: Record<string, unknown>): DrgGroupResult {
  return {
    id: String(row.id),
    visitId: String(row.visit_id),
    frontPageId: row.front_page_id ? String(row.front_page_id) : null,
    patientId: String(row.patient_id),
    department: String(row.department),
    primaryDxCode: row.primary_dx_code ? String(row.primary_dx_code) : null,
    hasOrp: Boolean(row.has_orp),
    groupCode: String(row.group_code),
    groupName: row.group_name ? String(row.group_name) : null,
    mdc: row.mdc ? String(row.mdc) : null,
    grouperVersion: String(row.grouper_version),
    weight: String(row.weight),
    estimatedPayment: String(row.estimated_payment),
    totalFee: row.total_fee != null ? String(row.total_fee) : null,
    balance: row.balance != null ? String(row.balance) : null,
    explanation: asObj(row.explanation),
    status: row.status as DrgResultStatus,
    groupedBy: row.grouped_by ? String(row.grouped_by) : null,
    groupedAt: String(row.grouped_at),
    confirmedBy: row.confirmed_by ? String(row.confirmed_by) : null,
    confirmedAt: row.confirmed_at ? String(row.confirmed_at) : null,
    rejectReason: row.reject_reason ? String(row.reject_reason) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/* ------------------------------- 规则查询 ------------------------------ */

export async function listDrgRules(sql?: DbExecutor): Promise<DrgRule[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(RULE_COLS)} FROM clinical.drg_group_rules
    WHERE enabled = true ORDER BY sort ASC
  `;
  return (rows as Record<string, unknown>[]).map(mapRule);
}

/* --------------------------- 幂等分组结果写入 --------------------------- */

export interface DrgResultUpsertInput {
  visitId: string;
  frontPageId?: string | null;
  patientId: string;
  department: string;
  primaryDxCode?: string | null;
  hasOrp: boolean;
  groupCode: string;
  groupName?: string | null;
  mdc?: string | null;
  grouperVersion: string;
  weight: number | string;
  estimatedPayment: number | string;
  totalFee?: number | string | null;
  balance?: number | string | null;
  explanation: Record<string, unknown>;
  groupedBy: string;
}

/**
 * 幂等写入分组结果：同一 visit_id 重分组覆盖业务字段，状态重置为 grouped。
 */
export async function upsertGroupResult(
  input: DrgResultUpsertInput,
  tx: DbExecutor,
): Promise<DrgGroupResult> {
  const rows = await tx`
    INSERT INTO clinical.drg_group_results (
      visit_id, front_page_id, patient_id, department,
      primary_dx_code, has_orp, group_code, group_name, mdc, grouper_version,
      weight, estimated_payment, total_fee, balance, explanation,
      status, grouped_by, grouped_at
    ) VALUES (
      ${input.visitId}, ${input.frontPageId ?? null}, ${input.patientId}, ${input.department},
      ${input.primaryDxCode ?? null}, ${input.hasOrp}, ${input.groupCode},
      ${input.groupName ?? null}, ${input.mdc ?? null}, ${input.grouperVersion},
      ${input.weight}, ${input.estimatedPayment}, ${input.totalFee ?? null}, ${input.balance ?? null},
      ${tx.json(toJson(input.explanation))},
      'grouped', ${input.groupedBy}, now()
    )
    ON CONFLICT (visit_id) DO UPDATE SET
      front_page_id = EXCLUDED.front_page_id,
      primary_dx_code = EXCLUDED.primary_dx_code,
      has_orp = EXCLUDED.has_orp,
      group_code = EXCLUDED.group_code,
      group_name = EXCLUDED.group_name,
      mdc = EXCLUDED.mdc,
      grouper_version = EXCLUDED.grouper_version,
      weight = EXCLUDED.weight,
      estimated_payment = EXCLUDED.estimated_payment,
      total_fee = EXCLUDED.total_fee,
      balance = EXCLUDED.balance,
      explanation = EXCLUDED.explanation,
      status = 'grouped',
      grouped_by = EXCLUDED.grouped_by,
      grouped_at = now(),
      confirmed_by = NULL,
      confirmed_at = NULL,
      reject_reason = NULL
    RETURNING ${tx.unsafe(RESULT_COLS)}
  `;
  return mapResult(rows[0] as Record<string, unknown>);
}

/* ------------------------------- 查询 -------------------------------- */

export async function getResultByVisit(
  visitId: string,
  sql?: DbExecutor,
): Promise<DrgGroupResult | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(RESULT_COLS)} FROM clinical.drg_group_results WHERE visit_id = ${visitId}
  `;
  return rows.length > 0 ? mapResult(rows[0] as Record<string, unknown>) : null;
}

export async function getResultById(
  id: string,
  sql?: DbExecutor,
): Promise<DrgGroupResult | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(RESULT_COLS)} FROM clinical.drg_group_results WHERE id = ${id}
  `;
  return rows.length > 0 ? mapResult(rows[0] as Record<string, unknown>) : null;
}

export interface DrgResultListRow {
  id: string;
  visitId: string;
  visitNo: string;
  patientId: string;
  patientName: string;
  department: string;
  primaryDxCode: string | null;
  groupCode: string;
  groupName: string | null;
  weight: string;
  estimatedPayment: string;
  totalFee: string | null;
  balance: string | null;
  status: DrgResultStatus;
  updatedAt: string;
}

export async function listDrgResults(
  status: DrgResultStatus | null,
  sql?: DbExecutor,
): Promise<DrgResultListRow[]> {
  const db = sql ?? getDb();
  const rows = status
    ? await db`
        SELECT r.id, r.visit_id, v.visit_no, r.patient_id, p.name_masked, r.department,
          r.primary_dx_code, r.group_code, r.group_name, r.weight, r.estimated_payment,
          r.total_fee, r.balance, r.status, r.updated_at
        FROM clinical.drg_group_results r
        JOIN clinical.visits v ON v.id = r.visit_id
        JOIN clinical.patients p ON p.id = r.patient_id
        WHERE r.status = ${status}
        ORDER BY r.updated_at DESC
      `
    : await db`
        SELECT r.id, r.visit_id, v.visit_no, r.patient_id, p.name_masked, r.department,
          r.primary_dx_code, r.group_code, r.group_name, r.weight, r.estimated_payment,
          r.total_fee, r.balance, r.status, r.updated_at
        FROM clinical.drg_group_results r
        JOIN clinical.visits v ON v.id = r.visit_id
        JOIN clinical.patients p ON p.id = r.patient_id
        ORDER BY r.updated_at DESC
      `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    visitId: String(r.visit_id),
    visitNo: String(r.visit_no),
    patientId: String(r.patient_id),
    patientName: String(r.name_masked),
    department: String(r.department),
    primaryDxCode: r.primary_dx_code ? String(r.primary_dx_code) : null,
    groupCode: String(r.group_code),
    groupName: r.group_name ? String(r.group_name) : null,
    weight: String(r.weight),
    estimatedPayment: String(r.estimated_payment),
    totalFee: r.total_fee != null ? String(r.total_fee) : null,
    balance: r.balance != null ? String(r.balance) : null,
    status: r.status as DrgResultStatus,
    updatedAt: String(r.updated_at),
  }));
}

/* --------------------------- 条件式确认/退回 --------------------------- */

/**
 * FOR UPDATE 行锁 + 源状态白名单：grouped → confirmed/rejected。
 * 0 行返回 null（并发冲突 / 状态非法）。
 */
export async function setResultStatus(
  id: string,
  fromStatuses: DrgResultStatus[],
  toStatus: Exclude<DrgResultStatus, 'grouped'>,
  opts: { confirmedBy?: string; rejectReason?: string | null },
  tx: DbExecutor,
): Promise<DrgGroupResult | null> {
  const locked = await tx`
    SELECT ${tx.unsafe(RESULT_COLS)} FROM clinical.drg_group_results
    WHERE id = ${id} FOR UPDATE
  `;
  if (locked.length === 0) return null;
  const current = mapResult(locked[0] as Record<string, unknown>);
  if (!fromStatuses.includes(current.status)) return null;

  const rows = await tx`
    UPDATE clinical.drg_group_results SET
      status = ${toStatus},
      confirmed_by = ${opts.confirmedBy ?? null},
      confirmed_at = CASE WHEN ${toStatus} = 'confirmed' THEN now() ELSE confirmed_at END,
      reject_reason = ${opts.rejectReason ?? null}
    WHERE id = ${id}
    RETURNING ${tx.unsafe(RESULT_COLS)}
  `;
  return rows.length > 0 ? mapResult(rows[0] as Record<string, unknown>) : null;
}

/* ------------------------------- 计数 -------------------------------- */

export async function countResults(sql?: DbExecutor): Promise<number> {
  const db = sql ?? getDb();
  const rows = await db<{ n: number }[]>`SELECT count(*) AS n FROM clinical.drg_group_results`;
  return Number(rows[0]?.n ?? 0);
}
