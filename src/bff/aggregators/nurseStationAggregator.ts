/**
 * 健澜科技 jlmedaios - 护士站四合一聚合器（M18-B）
 *
 * 纯读聚合，组合既有模块：床位/在院患者（listInpatients）、最新体征（observations）、
 * 出入量平衡（nursing_io_records）、待给药（med_administrations）、在院管路（tubes）、
 * 高危风险（nursing_risk_assessments）、未处理 hard CDS（order_cds_alerts）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';
import type { AuthView } from '../view/userView.js';
import { listInpatients } from './inpatientAggregator.js';
import { countUnresolvedHard, listByVisit as listCdsByVisit } from '../../db/repositories/orderCdsRepo.js';

export class NurseStationError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'NurseStationError';
  }
}
const forbidden = (m: string) => new NurseStationError(403, 'FORBIDDEN', m);
const notFound = (m: string) => new NurseStationError(404, 'NOT_FOUND', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}

export interface WardRow {
  visitId: string;
  patientName: string;
  bedNo: string | null;
  department: string | null;
  latestVitals: { temperature: number | null; sbp: number | null; pulse: number | null; recordedAt: string | null };
  ioBalance24h: number | null;
  pendingMeds: number;
  activeTubes: number;
  riskLevel: string;
  unresolvedHardCds: number;
  outstanding: number;
}

/** 拉最新体征一行。 */
async function latestVitals(visitId: string): Promise<WardRow['latestVitals']> {
  const db = getDb();
  const rows = await db`
    SELECT vitals->>'temperature' AS temp, vitals->>'sbp' AS sbp, vitals->>'pulse' AS pulse, created_at
    FROM clinical.observations
    WHERE visit_id = ${visitId} ORDER BY created_at DESC LIMIT 1`;
  if (rows.length === 0) return { temperature: null, sbp: null, pulse: null, recordedAt: null };
  const r = rows[0] as Record<string, unknown>;
  return {
    temperature: r.temp ? Number(r.temp) : null,
    sbp: r.sbp ? Number(r.sbp) : null,
    pulse: r.pulse ? Number(r.pulse) : null,
    recordedAt: r.created_at ? String(r.created_at) : null,
  };
}

/** 24h 出入量净平衡（intake-output）。 */
async function ioBalance24h(visitId: string): Promise<number | null> {
  const db = getDb();
  const rows = await db`
    SELECT
      COALESCE(SUM(amount_ml) FILTER (WHERE direction='intake'),0)::numeric AS in_ml,
      COALESCE(SUM(amount_ml) FILTER (WHERE direction='output'),0)::numeric AS out_ml
    FROM clinical.nursing_io_records
    WHERE visit_id = ${visitId} AND record_time >= now() - interval '24 hours'`;
  const r = rows[0] as Record<string, unknown>;
  if (!Number(r.in_ml) && !Number(r.out_ml)) return null;
  return Number(r.in_ml) - Number(r.out_ml);
}

async function pendingMeds(visitId: string): Promise<number> {
  const db = getDb();
  const rows = await db`SELECT count(*)::int AS n FROM clinical.med_administrations WHERE visit_id = ${visitId} AND status IN ('planned','arrived')`;
  return Number((rows[0] as Record<string, unknown>).n);
}

async function activeTubes(visitId: string): Promise<number> {
  const db = getDb();
  const rows = await db`SELECT count(*)::int AS n FROM clinical.tubes WHERE visit_id = ${visitId} AND status='in_place'`;
  return Number((rows[0] as Record<string, unknown>).n);
}

/** 最新风险等级（压疮+跌倒取较高者）。 */
async function latestRisk(visitId: string): Promise<string> {
  const db = getDb();
  const rows = await db`
    SELECT level FROM clinical.nursing_risk_assessments
    WHERE visit_id = ${visitId} ORDER BY assessed_at DESC LIMIT 1`;
  return rows.length > 0 ? String((rows[0] as Record<string, unknown>).level) : 'none';
}

function scoreOutstanding(r: WardRow): number {
  return r.unresolvedHardCds * 10 + (r.riskLevel === 'high' ? 5 : 0) + r.pendingMeds + r.activeTubes;
}

/** 护士站在院一览（按未处理项数倒序）。 */
export async function getWardBoard(auth: AuthView, perm: string): Promise<{ items: WardRow[] }> {
  assertPermission(auth, perm);
  const { items } = await listInpatients(auth, {});
  const rows: WardRow[] = [];
  for (const it of items) {
    const [vitals, balance, pending, tubes, risk, hardCds] = await Promise.all([
      latestVitals(it.visitId),
      ioBalance24h(it.visitId),
      pendingMeds(it.visitId),
      activeTubes(it.visitId),
      latestRisk(it.visitId),
      countUnresolvedHard(it.visitId),
    ]);
    rows.push({
      visitId: it.visitId,
      patientName: it.nameMasked,
      bedNo: it.bedNo ?? null,
      department: it.department ?? null,
      latestVitals: vitals,
      ioBalance24h: balance,
      pendingMeds: pending,
      activeTubes: tubes,
      riskLevel: risk,
      unresolvedHardCds: hardCds,
      outstanding: 0,
    });
  }
  for (const r of rows) r.outstanding = scoreOutstanding(r);
  rows.sort((a, b) => b.outstanding - a.outstanding);
  return { items: rows };
}

/** 单患者全量一览。 */
export async function getVisitWorkbench(auth: AuthView, perm: string, visitId: string) {
  assertPermission(auth, perm);
  if (!visitId) throw notFound('visitId 必填');
  const db = getDb();
  // 校验在院 + 数据范围（listInpatients 已带 auth 过滤，这里用其一找到 visit）
  const { items } = await listInpatients(auth, {});
  const mine = items.find((i) => i.visitId === visitId);
  if (!mine) throw forbidden('超出数据权限范围或就诊不在院');

  const [vitals, balance, cdsAlerts, tubesRows, ioRows, medRows, riskRows] = await Promise.all([
    latestVitals(visitId),
    ioBalance24h(visitId),
    listCdsByVisit(visitId),
    db`SELECT id, tube_type, site, status FROM clinical.tubes WHERE visit_id=${visitId} ORDER BY inserted_at DESC`,
    db`SELECT direction, category, amount_ml, record_time FROM clinical.nursing_io_records WHERE visit_id=${visitId} ORDER BY record_time DESC LIMIT 50`,
    db`SELECT med_name, dose, route, status, occurred_at FROM clinical.med_administrations WHERE visit_id=${visitId} ORDER BY occurred_at DESC LIMIT 50`,
    db`SELECT risk_type, level, assessed_at FROM clinical.nursing_risk_assessments WHERE visit_id=${visitId} ORDER BY assessed_at DESC LIMIT 10`,
  ]);
  return {
    visitId,
    patientName: mine.nameMasked,
    bedNo: mine.bedNo ?? null,
    latestVitals: vitals,
    ioBalance24h: balance,
    ioRows,
    medRows,
    tubesRows,
    riskRows,
    cdsAlerts,
    unresolvedHardCds: cdsAlerts.filter((a) => a.severity === 'hard' && !a.overrideBy).length,
  };
}
