/**
 * 健澜科技 jlmedaios - 移动护理 PDA 读模型 Repository（M16-A）
 *
 * 只做移动护理所需的少量定向读查询，写操作全部复用既有护理/医嘱聚合器，
 * 不在此新增任何业务写路径：
 *  - 按腕带号（visits.visit_no）定位在院就诊（连 patients 取脱敏姓名）；
 *  - 按标本号（lab_specimens.specimen_no）定位标本；
 *  - 按在院就诊 + 药品编码（orders.detail->>drugCode）定位 active 药品医嘱；
 *  - 批量统计各就诊待办护理任务数；
 *  - 批量取各就诊最新压疮/跌倒风险标记；
 *  - 交接班 SBAR 聚合读（本科室待办/最新体征/active 药品医嘱）。
 *
 * 严谨性：一律 tx.json(toJson()) 纯对象写、日期时间列 SELECT ::text、
 * 不缓存连接、每次 getDb()；UUID 列过滤不用空串参数。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';

/* --------------------------- 腕带定位患者 ------------------------------ */

export interface WristbandVisit {
  visitId: string;
  visitNo: string;
  patientId: string;
  bedNo: string | null;
  ward: string | null;
  department: string;
  patientName: string;
  attendingDoctorId: string | null;
}

/** 按腕带号（在院就诊号）定位在院住院就诊。仅 ongoing inpatient。 */
export async function getInpatientVisitByNo(
  visitNo: string, db?: DbExecutor,
): Promise<WristbandVisit | null> {
  const exec = db ?? getDb();
  const rows = await exec`
    SELECT v.id AS visit_id, v.visit_no, v.patient_id, v.bed_no, v.ward,
           v.department, v.attending_doctor_id, p.name_masked
    FROM clinical.visits v
    JOIN clinical.patients p ON p.id = v.patient_id
    WHERE v.visit_no = ${visitNo}
      AND v.visit_type = 'inpatient' AND v.status = 'ongoing'
      AND p.deleted_at IS NULL
  `;
  if (rows.length === 0) return null;
  const r = rows[0] as Record<string, unknown>;
  return {
    visitId: String(r.visit_id),
    visitNo: String(r.visit_no),
    patientId: String(r.patient_id),
    bedNo: r.bed_no ? String(r.bed_no) : null,
    ward: r.ward ? String(r.ward) : null,
    department: String(r.department),
    patientName: String(r.name_masked),
    attendingDoctorId: r.attending_doctor_id ? String(r.attending_doctor_id) : null,
  };
}

/* ------------------------------ 标本定位 ------------------------------ */

export interface SpecimenInfo {
  specimenNo: string;
  visitId: string;
  patientId: string;
  specimenType: string;
  status: string;
}

/** 按标本条码定位标本。 */
export async function getSpecimenByNo(
  specimenNo: string, db?: DbExecutor,
): Promise<SpecimenInfo | null> {
  const exec = db ?? getDb();
  const rows = await exec`
    SELECT specimen_no, visit_id, patient_id, specimen_type, status
    FROM clinical.lab_specimens
    WHERE specimen_no = ${specimenNo}
  `;
  if (rows.length === 0) return null;
  const r = rows[0] as Record<string, unknown>;
  return {
    specimenNo: String(r.specimen_no),
    visitId: String(r.visit_id),
    patientId: String(r.patient_id),
    specimenType: String(r.specimen_type),
    status: String(r.status),
  };
}

/* ------------------------ 药品编码定位 active 医嘱 --------------------- */

export interface DrugOrderRef {
  orderId: string;
  orderNo: string;
  content: string;
  detail: Record<string, unknown>;
  requiresDoubleCheck: boolean;
}

/**
 * 按在院就诊 + 药品编码定位该患者当前 active 药品医嘱。
 * 药品编码存于 orders.detail->>drugCode（种子医嘱未挂编码时由前端/开单补充）。
 */
export async function getActiveDrugOrderByVisitAndCode(
  visitId: string, drugCode: string, db?: DbExecutor,
): Promise<DrugOrderRef | null> {
  const exec = db ?? getDb();
  const rows = await exec`
    SELECT id, order_no, content, detail, requires_double_check
    FROM clinical.orders
    WHERE visit_id = ${visitId}
      AND status = 'active' AND order_type = 'drug'
      AND detail->>'drugCode' = ${drugCode}
    ORDER BY created_at DESC
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  const r = rows[0] as Record<string, unknown>;
  return {
    orderId: String(r.id),
    orderNo: String(r.order_no),
    content: String(r.content),
    detail: (r.detail as Record<string, unknown>) ?? {},
    requiresDoubleCheck: Boolean(r.requires_double_check),
  };
}

/* ------------------------- 看板：待办任务计数 ------------------------- */

/** 批量统计各就诊 pending 护理任务数（visitId -> count）。 */
export async function countPendingTasksByVisits(
  visitIds: string[], db?: DbExecutor,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (visitIds.length === 0) return map;
  const exec = db ?? getDb();
  const rows = await exec`
    SELECT visit_id::text AS visit_id, COUNT(*)::int AS cnt
    FROM clinical.nursing_tasks
    WHERE status = 'pending' AND visit_id = ANY(${visitIds})
    GROUP BY visit_id
  `;
  for (const row of rows as Record<string, unknown>[]) {
    map.set(String(row.visit_id), Number(row.cnt));
  }
  return map;
}

/* ------------------------- 看板：最新风险标记 ------------------------- */

export interface VisitRisk {
  pressureSoreRisk: string;
  fallRisk: string;
}

/** 批量取各就诊最近一条护理记录的压疮/跌倒风险标记。 */
export async function getLatestRiskByVisits(
  visitIds: string[], db?: DbExecutor,
): Promise<Map<string, VisitRisk>> {
  const map = new Map<string, VisitRisk>();
  if (visitIds.length === 0) return map;
  const exec = db ?? getDb();
  const rows = await exec`
    SELECT DISTINCT ON (visit_id)
      visit_id::text AS visit_id,
      pressure_sore_risk, fall_risk
    FROM clinical.nursing_records
    WHERE deleted_at IS NULL AND visit_id = ANY(${visitIds})
    ORDER BY visit_id, recorded_at DESC
  `;
  for (const row of rows as Record<string, unknown>[]) {
    map.set(String(row.visit_id), {
      pressureSoreRisk: String(row.pressure_sore_risk),
      fallRisk: String(row.fall_risk),
    });
  }
  return map;
}

/* --------------------------- SBAR 聚合读 ------------------------------ */

export interface SbarDeptRow {
  visitId: string;
  visitNo: string;
  patientName: string;
  bedNo: string | null;
  pendingTasks: number;
  activeDrugOrders: number;
  latestVitals: Record<string, unknown>;
}

/**
 * 按科室聚合本班交班素材：在院患者 + 待办任务数 + active 药品医嘱数 + 最新体征。
 * 纯读，不杜撰结论，由上层 buildSbarSections 组织。
 */
export async function listSbarDeptRows(
  department: string, db?: DbExecutor,
): Promise<SbarDeptRow[]> {
  const exec = db ?? getDb();
  const rows = await exec`
    WITH base AS (
      SELECT v.id AS visit_id, v.visit_no, v.bed_no, p.name_masked,
             v.department
      FROM clinical.visits v
      JOIN clinical.patients p ON p.id = v.patient_id
      WHERE v.visit_type = 'inpatient' AND v.status = 'ongoing'
        AND v.department = ${department} AND p.deleted_at IS NULL
    ),
    pending AS (
      SELECT visit_id, COUNT(*)::int AS cnt
      FROM clinical.nursing_tasks WHERE status = 'pending'
      GROUP BY visit_id
    ),
    drugs AS (
      SELECT visit_id, COUNT(*)::int AS cnt
      FROM clinical.orders
      WHERE status = 'active' AND order_type = 'drug'
      GROUP BY visit_id
    ),
    vitals AS (
      SELECT DISTINCT ON (visit_id) visit_id, vitals
      FROM clinical.nursing_records
      WHERE deleted_at IS NULL ORDER BY visit_id, recorded_at DESC
    )
    SELECT b.visit_id::text AS visit_id, b.visit_no, b.name_masked, b.bed_no,
           COALESCE(p.cnt, 0) AS pending_tasks,
           COALESCE(d.cnt, 0) AS active_drug_orders,
           COALESCE(v.vitals, '{}'::jsonb) AS latest_vitals
    FROM base b
    LEFT JOIN pending p ON p.visit_id = b.visit_id
    LEFT JOIN drugs d ON d.visit_id = b.visit_id
    LEFT JOIN vitals v ON v.visit_id = b.visit_id
    ORDER BY b.bed_no NULLS LAST, b.visit_no
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    visitId: String(r.visit_id),
    visitNo: String(r.visit_no),
    patientName: String(r.name_masked),
    bedNo: r.bed_no ? String(r.bed_no) : null,
    pendingTasks: Number(r.pending_tasks),
    activeDrugOrders: Number(r.active_drug_orders),
    latestVitals: (r.latest_vitals as Record<string, unknown>) ?? {},
  }));
}
