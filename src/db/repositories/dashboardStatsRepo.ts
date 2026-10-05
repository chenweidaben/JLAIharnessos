/**
 * 健澜科技 jlmedaios - 院长驾驶舱统计 Repository（M9-A）
 *
 * 从真实 PostgreSQL 聚合运营指标，供管理端「工作台/院长驾驶舱」使用：
 *  - 今日门急诊量、当前在院、今日入出院；
 *  - 待审核医嘱/处方、未处理危急值；
 *  - 床位规模与占用率；
 *  - 近 N 天门急诊/入出院趋势；
 *  - 当前在院科室分布与最新告警。
 *
 * 全部为只读统计查询；任何查询失败直接抛错，绝不返回编造数字。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';

/** 关键计数指标 */
export interface DashboardOverview {
  todayOutpatient: number;
  todayEmergency: number;
  currentInpatients: number;
  todayAdmitted: number;
  todayDischarged: number;
  pendingOrderReview: number;
  activeOrders: number;
  pendingPrescriptionReview: number;
  unresolvedCriticalAlerts: number;
  bedsTotal: number;
  bedsOccupied: number;
  bedsAvailable: number;
  bedOccupancyRate: number;
}

/** 单日趋势点 */
export interface TrendPoint {
  date: string;
  outpatient: number;
  emergency: number;
  admitted: number;
  discharged: number;
}

/** 科室负载点 */
export interface DepartmentLoad {
  department: string;
  inpatients: number;
}

/** 最新告警视图 */
export interface DashboardAlert {
  id: string;
  level: 'critical' | 'warning';
  title: string;
  department: string | null;
  time: string;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** 关键计数指标（今日口径 + 当前在院 + 床位） */
export async function getDashboardOverview(db: DbExecutor = getDb()): Promise<DashboardOverview> {
  const rows = await db`
    SELECT
      (SELECT count(*) FROM clinical.visits
        WHERE visit_type = 'outpatient' AND created_at >= date_trunc('day', now()))::int AS today_outpatient,
      (SELECT count(*) FROM clinical.visits
        WHERE visit_type = 'emergency' AND created_at >= date_trunc('day', now()))::int AS today_emergency,
      (SELECT count(*) FROM clinical.admissions WHERE status = 'admitted')::int AS current_inpatients,
      (SELECT count(*) FROM clinical.admissions
        WHERE admitted_at >= date_trunc('day', now()))::int AS today_admitted,
      (SELECT count(*) FROM clinical.admissions
        WHERE discharged_at >= date_trunc('day', now()))::int AS today_discharged,
      (SELECT count(*) FROM clinical.orders WHERE status = 'pending_review')::int AS pending_order_review,
      (SELECT count(*) FROM clinical.orders WHERE status = 'active')::int AS active_orders,
      (SELECT count(*) FROM clinical.prescriptions WHERE status = 'pending_review')::int AS pending_prescription_review,
      (SELECT count(*) FROM clinical.critical_value_alerts
        WHERE status NOT IN ('resolved','closed'))::int AS unresolved_critical_alerts,
      (SELECT count(*) FROM clinical.beds)::int AS beds_total,
      (SELECT count(*) FROM clinical.beds WHERE status = 'occupied')::int AS beds_occupied,
      (SELECT count(*) FROM clinical.beds WHERE status = 'available')::int AS beds_available
  `;
  const r = rows[0];
  const occupancy = r.beds_total > 0 ? (r.beds_occupied / r.beds_total) * 100 : 0;
  return {
    todayOutpatient: r.today_outpatient,
    todayEmergency: r.today_emergency,
    currentInpatients: r.current_inpatients,
    todayAdmitted: r.today_admitted,
    todayDischarged: r.today_discharged,
    pendingOrderReview: r.pending_order_review,
    activeOrders: r.active_orders,
    pendingPrescriptionReview: r.pending_prescription_review,
    unresolvedCriticalAlerts: r.unresolved_critical_alerts,
    bedsTotal: r.beds_total,
    bedsOccupied: r.beds_occupied,
    bedsAvailable: r.beds_available,
    bedOccupancyRate: round1(occupancy),
  };
}

/** 近 N 天门急诊/入出院趋势（默认 14 天，上限 90） */
export async function getDashboardTrend(
  days = 14,
  db: DbExecutor = getDb(),
): Promise<TrendPoint[]> {
  const n = Math.min(Math.max(1, Math.floor(days)), 90);
  const rows = await db`
    WITH d AS (
      SELECT generate_series(
        date_trunc('day', now()) - make_interval(days => ${n - 1}),
        date_trunc('day', now()),
        interval '1 day'
      )::date AS day
    )
    SELECT
      to_char(d.day, 'YYYY-MM-DD') AS date,
      (SELECT count(*) FROM clinical.visits v
        WHERE v.visit_type = 'outpatient' AND v.created_at::date = d.day)::int AS outpatient,
      (SELECT count(*) FROM clinical.visits v
        WHERE v.visit_type = 'emergency' AND v.created_at::date = d.day)::int AS emergency,
      (SELECT count(*) FROM clinical.admissions a
        WHERE a.admitted_at::date = d.day)::int AS admitted,
      (SELECT count(*) FROM clinical.admissions a
        WHERE a.discharged_at::date = d.day)::int AS discharged
    FROM d
    ORDER BY d.day
  `;
  return rows.map((r) => ({
    date: r.date,
    outpatient: r.outpatient,
    emergency: r.emergency,
    admitted: r.admitted,
    discharged: r.discharged,
  }));
}

/** 当前在院患者按科室分布（默认前 12） */
export async function getDepartmentLoad(
  limit = 12,
  db: DbExecutor = getDb(),
): Promise<DepartmentLoad[]> {
  const rows = await db`
    SELECT COALESCE(a.department, '未分配') AS department, count(*)::int AS inpatients
    FROM clinical.admissions a
    WHERE a.status = 'admitted'
    GROUP BY a.department
    ORDER BY count(*) DESC
    LIMIT ${Math.min(Math.max(1, Math.floor(limit)), 30)}
  `;
  return rows.map((r) => ({ department: r.department, inpatients: r.inpatients }));
}

/** 最新危急值/告警（默认 8 条） */
export async function getLatestAlerts(
  limit = 8,
  db: DbExecutor = getDb(),
): Promise<DashboardAlert[]> {
  const rows = await db`
    SELECT id::text, item_name, department, raised_at::text AS time
    FROM clinical.critical_value_alerts
    ORDER BY raised_at DESC
    LIMIT ${Math.min(Math.max(1, Math.floor(limit)), 20)}
  `;
  return rows.map((r) => ({
    id: r.id,
    level: 'critical',
    title: `${r.item_name} 危急值`,
    department: r.department,
    time: r.time,
  }));
}
