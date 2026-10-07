/**
 * 健澜科技 jlmedaios - LIS 检验全流程 Repository（M11-A）
 *
 * clinical.lab_panels / lab_items / lab_panel_items / lab_requests / lab_request_items /
 * lab_specimens / lab_reports 读写，以及 lab_results 结果行 upsert。
 *
 * 并发与一致性：
 *  - 申请号 request_no 唯一，重复申请幂等返回既有；
 *  - 报告 (request_id, panel_id) 唯一，重复建草稿幂等返回既有；
 *  - 结果行按 (report_id, item_code) 先 SELECT 判存在再 INSERT/UPDATE，重录覆盖；
 *  - 标本/报告状态推进一律 FOR UPDATE 行锁 + 应用层状态白名单（规则引擎）；
 *  - 数组参数化 IN 用 ${db(array)}。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';
import type { AbnormalFlag } from '../../medical-tools/lab/lisWorkflow.js';

// ---------------------------------------------------------------------------
// 目录：面板 / 项目
// ---------------------------------------------------------------------------

export interface LabPanel {
  id: string;
  code: string;
  name: string;
  specimenType: string | null;
  execDepartment: string;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LabItem {
  id: string;
  code: string;
  name: string;
  specimenType: string | null;
  unit: string | null;
  refLow: number | null;
  refHigh: number | null;
  critLow: number | null;
  critHigh: number | null;
  execDepartment: string;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LabPanelDetail extends LabPanel {
  items: LabItem[];
}

const PANEL_COLS = `
  id, code, name, specimen_type, exec_department, price, is_active, created_at, updated_at
`;
const ITEM_COLS = `
  id, code, name, specimen_type, unit, ref_low, ref_high, crit_low, crit_high,
  exec_department, price, is_active, created_at, updated_at
`;

function numOrNull(v: unknown): number | null {
  return v === null || v === undefined ? null : Number(v);
}

function mapPanel(row: Record<string, unknown>): LabPanel {
  return {
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    specimenType: row.specimen_type ? String(row.specimen_type) : null,
    execDepartment: String(row.exec_department),
    price: Number(row.price),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapItem(row: Record<string, unknown>): LabItem {
  return {
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    specimenType: row.specimen_type ? String(row.specimen_type) : null,
    unit: row.unit ? String(row.unit) : null,
    refLow: numOrNull(row.ref_low),
    refHigh: numOrNull(row.ref_high),
    critLow: numOrNull(row.crit_low),
    critHigh: numOrNull(row.crit_high),
    execDepartment: String(row.exec_department),
    price: Number(row.price),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function createPanel(
  input: { code: string; name: string; specimenType?: string | null; price?: number },
  tx: DbExecutor,
): Promise<{ panel: LabPanel; created: boolean }> {
  const existing = await tx`
    SELECT ${tx.unsafe(PANEL_COLS)} FROM clinical.lab_panels WHERE code = ${input.code}`;
  if (existing.length > 0) return { panel: mapPanel(existing[0]), created: false };
  const rows = await tx`
    INSERT INTO clinical.lab_panels (code, name, specimen_type, price)
    VALUES (${input.code}, ${input.name}, ${input.specimenType ?? null}, ${input.price ?? 0})
    ON CONFLICT (code) DO NOTHING
    RETURNING ${tx.unsafe(PANEL_COLS)}`;
  if (rows.length === 0) {
    const back = await tx`
      SELECT ${tx.unsafe(PANEL_COLS)} FROM clinical.lab_panels WHERE code = ${input.code}`;
    return { panel: mapPanel(back[0]), created: false };
  }
  return { panel: mapPanel(rows[0]), created: true };
}

export async function createItem(
  input: {
    code: string; name: string; unit?: string | null;
    refLow?: number | null; refHigh?: number | null;
    critLow?: number | null; critHigh?: number | null;
    specimenType?: string | null; price?: number;
  },
  tx: DbExecutor,
): Promise<{ item: LabItem; created: boolean }> {
  const existing = await tx`
    SELECT ${tx.unsafe(ITEM_COLS)} FROM clinical.lab_items WHERE code = ${input.code}`;
  if (existing.length > 0) return { item: mapItem(existing[0]), created: false };
  const rows = await tx`
    INSERT INTO clinical.lab_items
      (code, name, specimen_type, unit, ref_low, ref_high, crit_low, crit_high, price)
    VALUES
      (${input.code}, ${input.name}, ${input.specimenType ?? null}, ${input.unit ?? null},
       ${input.refLow ?? null}, ${input.refHigh ?? null}, ${input.critLow ?? null},
       ${input.critHigh ?? null}, ${input.price ?? 0})
    ON CONFLICT (code) DO NOTHING
    RETURNING ${tx.unsafe(ITEM_COLS)}`;
  if (rows.length === 0) {
    const back = await tx`
      SELECT ${tx.unsafe(ITEM_COLS)} FROM clinical.lab_items WHERE code = ${input.code}`;
    return { item: mapItem(back[0]), created: false };
  }
  return { item: mapItem(rows[0]), created: true };
}

/** 面板加项目（幂等）。 */
export async function addItemToPanel(
  panelId: string,
  itemId: string,
  order = 0,
  tx?: DbExecutor,
): Promise<void> {
  const db = tx ?? getDb();
  await db`
    INSERT INTO clinical.lab_panel_items (panel_id, item_id, display_order)
    VALUES (${panelId}, ${itemId}, ${order})
    ON CONFLICT (panel_id, item_id) DO NOTHING`;
}

export async function getPanelById(id: string, sql?: DbExecutor): Promise<LabPanel | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(PANEL_COLS)} FROM clinical.lab_panels WHERE id = ${id}`;
  return rows.length > 0 ? mapPanel(rows[0] as Record<string, unknown>) : null;
}

/** 联表查询时带 i. 前缀的项目列（与 ITEM_COLS 对应）。 */
const ITEM_COLS_T = `
  i.id, i.code, i.name, i.specimen_type, i.unit, i.ref_low, i.ref_high, i.crit_low, i.crit_high,
  i.exec_department, i.price, i.is_active, i.created_at, i.updated_at
`;

export async function getItemsByPanel(panelId: string, tx?: DbExecutor): Promise<LabItem[]> {
  const db = tx ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(ITEM_COLS_T)}
    FROM clinical.lab_items i
    JOIN clinical.lab_panel_items pi ON pi.item_id = i.id
    WHERE pi.panel_id = ${panelId}
    ORDER BY pi.display_order ASC`;
  return (rows as Record<string, unknown>[]).map((r) => mapItem(r));
}

export async function listPanels(sql?: DbExecutor): Promise<LabPanelDetail[]> {
  const db = sql ?? getDb();
  const panels = await db`
    SELECT ${db.unsafe(PANEL_COLS)} FROM clinical.lab_panels ORDER BY code ASC`;
  const all = panels as Record<string, unknown>[];
  if (all.length === 0) return [];
  const ids = all.map((p) => String(p.id));
  const links = await db`
    SELECT pi.panel_id, ${db.unsafe(ITEM_COLS_T)}
    FROM clinical.lab_panel_items pi
    JOIN clinical.lab_items i ON i.id = pi.item_id
    WHERE pi.panel_id IN ${db(ids)}
    ORDER BY pi.display_order ASC`;
  const itemMap = new Map<string, LabItem[]>();
  for (const r of links as Record<string, unknown>[]) {
    const pid = String(r.panel_id);
    if (!itemMap.has(pid)) itemMap.set(pid, []);
    itemMap.get(pid)!.push(mapItem(r));
  }
  return all.map((row) => ({ ...mapPanel(row), items: itemMap.get(String(row.id)) ?? [] }));
}

export async function listItems(sql?: DbExecutor): Promise<LabItem[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(ITEM_COLS)} FROM clinical.lab_items ORDER BY code ASC`;
  return (rows as Record<string, unknown>[]).map((r) => mapItem(r));
}

// ---------------------------------------------------------------------------
// 检验申请单与申请项目行
// ---------------------------------------------------------------------------

export interface LabRequest {
  id: string;
  requestNo: string;
  visitId: string;
  patientId: string;
  orderedBy: string | null;
  urgency: string;
  diagnosis: string | null;
  note: string | null;
  status: string;
  cancelledBy: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LabRequestItem {
  id: string;
  requestId: string;
  panelId: string | null;
  itemId: string | null;
  createdAt: string;
}

const REQUEST_COLS = `
  id, request_no, visit_id, patient_id, ordered_by, urgency, diagnosis, note, status,
  cancelled_by, cancelled_at, cancel_reason, created_at, updated_at
`;

function mapRequest(row: Record<string, unknown>): LabRequest {
  return {
    id: String(row.id),
    requestNo: String(row.request_no),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    orderedBy: row.ordered_by ? String(row.ordered_by) : null,
    urgency: String(row.urgency),
    diagnosis: row.diagnosis ? String(row.diagnosis) : null,
    note: row.note ? String(row.note) : null,
    status: String(row.status),
    cancelledBy: row.cancelled_by ? String(row.cancelled_by) : null,
    cancelledAt: row.cancelled_at ? String(row.cancelled_at) : null,
    cancelReason: row.cancel_reason ? String(row.cancel_reason) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/**
 * 幂等建申请单：request_no 唯一，重复提交返回既有（created=false）。
 * 调用方在同一事务内随后写入申请项目行。
 */
export async function createRequest(
  input: {
    requestNo: string;
    visitId: string;
    patientId: string;
    orderedBy: string | null;
    urgency: string;
    diagnosis?: string | null;
    note?: string | null;
  },
  tx: DbExecutor,
): Promise<{ req: LabRequest; created: boolean }> {
  const existing = await tx`
    SELECT ${tx.unsafe(REQUEST_COLS)} FROM clinical.lab_requests WHERE request_no = ${input.requestNo}`;
  if (existing.length > 0) return { req: mapRequest(existing[0]), created: false };
  const rows = await tx`
    INSERT INTO clinical.lab_requests
      (request_no, visit_id, patient_id, ordered_by, urgency, diagnosis, note)
    VALUES
      (${input.requestNo}, ${input.visitId}, ${input.patientId}, ${input.orderedBy},
       ${input.urgency}, ${input.diagnosis ?? null}, ${input.note ?? null})
    ON CONFLICT (request_no) DO NOTHING
    RETURNING ${tx.unsafe(REQUEST_COLS)}`;
  if (rows.length === 0) {
    const back = await tx`
      SELECT ${tx.unsafe(REQUEST_COLS)} FROM clinical.lab_requests WHERE request_no = ${input.requestNo}`;
    return { req: mapRequest(back[0]), created: false };
  }
  return { req: mapRequest(rows[0]), created: true };
}

export async function addRequestItem(
  input: { requestId: string; panelId?: string | null; itemId?: string | null },
  tx: DbExecutor,
): Promise<void> {
  await tx`
    INSERT INTO clinical.lab_request_items (request_id, panel_id, item_id)
    VALUES (${input.requestId}, ${input.panelId ?? null}, ${input.itemId ?? null})`;
}

export async function getRequestById(id: string, sql?: DbExecutor): Promise<LabRequest | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(REQUEST_COLS)} FROM clinical.lab_requests WHERE id = ${id}`;
  return rows.length > 0 ? mapRequest(rows[0] as Record<string, unknown>) : null;
}

export async function lockRequestById(id: string, tx: DbExecutor): Promise<LabRequest | null> {
  const rows = await tx`
    SELECT ${tx.unsafe(REQUEST_COLS)} FROM clinical.lab_requests WHERE id = ${id} FOR UPDATE`;
  return rows.length > 0 ? mapRequest(rows[0] as Record<string, unknown>) : null;
}

export async function getRequestItems(requestId: string, tx?: DbExecutor): Promise<LabRequestItem[]> {
  const db = tx ?? getDb();
  const rows = await db`
    SELECT id, request_id, panel_id, item_id, created_at
    FROM clinical.lab_request_items WHERE request_id = ${requestId} ORDER BY created_at ASC, id ASC`;
  return (rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    requestId: String(r.request_id),
    panelId: r.panel_id ? String(r.panel_id) : null,
    itemId: r.item_id ? String(r.item_id) : null,
    createdAt: String(r.created_at),
  }));
}

export async function listRequests(
  filter: { status?: string; patientId?: string; visitId?: string } = {},
  sql?: DbExecutor,
): Promise<LabRequest[]> {
  const db = sql ?? getDb();
  let where = db`WHERE 1 = 1`;
  if (filter.status) where = db`${where} AND status = ${filter.status}`;
  if (filter.patientId) where = db`${where} AND patient_id = ${filter.patientId}`;
  if (filter.visitId) where = db`${where} AND visit_id = ${filter.visitId}`;
  const rows = await db`
    SELECT ${db.unsafe(REQUEST_COLS)} FROM clinical.lab_requests
    ${where}
    ORDER BY created_at DESC`;
  return (rows as Record<string, unknown>[]).map((r) => mapRequest(r));
}

/** 通用动态 UPDATE（状态推进与取消等共用）。 */
export async function patchRequest(
  id: string,
  fields: Record<string, unknown>,
  tx: DbExecutor,
): Promise<LabRequest> {
  const cols = Object.keys(fields);
  const setClause = cols.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = Object.values(fields);
  const rows = await tx.unsafe(
    `UPDATE clinical.lab_requests SET ${setClause}, updated_at = now()
     WHERE id = $${cols.length + 1} RETURNING ${REQUEST_COLS}`,
    [...values, id],
  );
  return mapRequest(rows[0] as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// 标本
// ---------------------------------------------------------------------------

export interface LabSpecimen {
  id: string;
  specimenNo: string;
  requestId: string;
  visitId: string;
  patientId: string;
  panelId: string | null;
  specimenType: string;
  status: string;
  collectedBy: string | null;
  collectedAt: string | null;
  collectionSite: string | null;
  receivedBy: string | null;
  receivedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
}

const SPECIMEN_COLS = `
  id, specimen_no, request_id, visit_id, patient_id, panel_id, specimen_type, status,
  collected_by, collected_at, collection_site, received_by, received_at,
  rejected_by, rejected_at, reject_reason, created_at, updated_at
`;

function mapSpecimen(row: Record<string, unknown>): LabSpecimen {
  return {
    id: String(row.id),
    specimenNo: String(row.specimen_no),
    requestId: String(row.request_id),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    panelId: row.panel_id ? String(row.panel_id) : null,
    specimenType: String(row.specimen_type),
    status: String(row.status),
    collectedBy: row.collected_by ? String(row.collected_by) : null,
    collectedAt: row.collected_at ? String(row.collected_at) : null,
    collectionSite: row.collection_site ? String(row.collection_site) : null,
    receivedBy: row.received_by ? String(row.received_by) : null,
    receivedAt: row.received_at ? String(row.received_at) : null,
    rejectedBy: row.rejected_by ? String(row.rejected_by) : null,
    rejectedAt: row.rejected_at ? String(row.rejected_at) : null,
    rejectReason: row.reject_reason ? String(row.reject_reason) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function insertSpecimen(
  input: {
    specimenNo: string;
    requestId: string;
    visitId: string;
    patientId: string;
    panelId: string | null;
    specimenType: string;
  },
  tx: DbExecutor,
): Promise<LabSpecimen> {
  const rows = await tx`
    INSERT INTO clinical.lab_specimens
      (specimen_no, request_id, visit_id, patient_id, panel_id, specimen_type)
    VALUES
      (${input.specimenNo}, ${input.requestId}, ${input.visitId}, ${input.patientId},
       ${input.panelId ?? null}, ${input.specimenType})
    RETURNING ${tx.unsafe(SPECIMEN_COLS)}`;
  return mapSpecimen(rows[0] as Record<string, unknown>);
}

export async function getSpecimenById(id: string, sql?: DbExecutor): Promise<LabSpecimen | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(SPECIMEN_COLS)} FROM clinical.lab_specimens WHERE id = ${id}`;
  return rows.length > 0 ? mapSpecimen(rows[0] as Record<string, unknown>) : null;
}

export async function lockSpecimenById(id: string, tx: DbExecutor): Promise<LabSpecimen | null> {
  const rows = await tx`
    SELECT ${tx.unsafe(SPECIMEN_COLS)} FROM clinical.lab_specimens WHERE id = ${id} FOR UPDATE`;
  return rows.length > 0 ? mapSpecimen(rows[0] as Record<string, unknown>) : null;
}

export async function patchSpecimen(
  id: string,
  fields: Record<string, unknown>,
  tx: DbExecutor,
): Promise<LabSpecimen> {
  const cols = Object.keys(fields);
  const setClause = cols.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = Object.values(fields);
  const rows = await tx.unsafe(
    `UPDATE clinical.lab_specimens SET ${setClause}, updated_at = now()
     WHERE id = $${cols.length + 1} RETURNING ${SPECIMEN_COLS}`,
    [...values, id],
  );
  return mapSpecimen(rows[0] as Record<string, unknown>);
}

export async function listSpecimens(
  filter: { status?: string; requestId?: string } = {},
  sql?: DbExecutor,
): Promise<LabSpecimen[]> {
  const db = sql ?? getDb();
  let where = db`WHERE 1 = 1`;
  if (filter.status) where = db`${where} AND status = ${filter.status}`;
  if (filter.requestId) where = db`${where} AND request_id = ${filter.requestId}`;
  const rows = await db`
    SELECT ${db.unsafe(SPECIMEN_COLS)} FROM clinical.lab_specimens
    ${where}
    ORDER BY created_at DESC`;
  return (rows as Record<string, unknown>[]).map((r) => mapSpecimen(r));
}

// ---------------------------------------------------------------------------
// 检验报告与结果行
// ---------------------------------------------------------------------------

export interface LabReport {
  id: string;
  reportNo: string;
  requestId: string;
  visitId: string;
  patientId: string;
  specimenId: string | null;
  panelId: string | null;
  panelName: string | null;
  status: string;
  enteredBy: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  publishedBy: string | null;
  publishedAt: string | null;
  returnedBy: string | null;
  returnedAt: string | null;
  returnReason: string | null;
  reportTime: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LabResultRow {
  id: string;
  reportId: string;
  requestId: string | null;
  specimenId: string | null;
  itemCode: string | null;
  itemName: string;
  value: string | null;
  numericValue: number | null;
  unit: string | null;
  refLow: number | null;
  refHigh: number | null;
  abnormalFlag: string | null;
  isCritical: boolean;
  resultTime: string | null;
  enteredBy: string | null;
}

const REPORT_COLS = `
  id, report_no, request_id, visit_id, patient_id, specimen_id, panel_id, panel_name,
  status, entered_by, reviewed_by, reviewed_at, published_by, published_at,
  returned_by, returned_at, return_reason, report_time, created_at, updated_at
`;

function mapReport(row: Record<string, unknown>): LabReport {
  return {
    id: String(row.id),
    reportNo: String(row.report_no),
    requestId: String(row.request_id),
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    specimenId: row.specimen_id ? String(row.specimen_id) : null,
    panelId: row.panel_id ? String(row.panel_id) : null,
    panelName: row.panel_name ? String(row.panel_name) : null,
    status: String(row.status),
    enteredBy: row.entered_by ? String(row.entered_by) : null,
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    publishedBy: row.published_by ? String(row.published_by) : null,
    publishedAt: row.published_at ? String(row.published_at) : null,
    returnedBy: row.returned_by ? String(row.returned_by) : null,
    returnedAt: row.returned_at ? String(row.returned_at) : null,
    returnReason: row.return_reason ? String(row.return_reason) : null,
    reportTime: row.report_time ? String(row.report_time) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/**
 * 建草稿报告：UNIQUE(request_id, panel_id)，重复建返回既有草稿（created=false）。
 */
export async function createReport(
  input: {
    reportNo: string;
    requestId: string;
    visitId: string;
    patientId: string;
    specimenId?: string | null;
    panelId?: string | null;
    panelName?: string | null;
    enteredBy: string;
  },
  tx: DbExecutor,
): Promise<{ report: LabReport; created: boolean }> {
  const existing = await tx`
    SELECT ${tx.unsafe(REPORT_COLS)} FROM clinical.lab_reports
    WHERE request_id = ${input.requestId} AND panel_id IS NOT DISTINCT FROM ${input.panelId ?? null}`;
  if (existing.length > 0) return { report: mapReport(existing[0]), created: false };
  const rows = await tx`
    INSERT INTO clinical.lab_reports
      (report_no, request_id, visit_id, patient_id, specimen_id, panel_id, panel_name, entered_by)
    VALUES
      (${input.reportNo}, ${input.requestId}, ${input.visitId}, ${input.patientId},
       ${input.specimenId ?? null}, ${input.panelId ?? null}, ${input.panelName ?? null},
       ${input.enteredBy})
    ON CONFLICT (request_id, panel_id) DO NOTHING
    RETURNING ${tx.unsafe(REPORT_COLS)}`;
  if (rows.length === 0) {
    const back = await tx`
      SELECT ${tx.unsafe(REPORT_COLS)} FROM clinical.lab_reports
      WHERE request_id = ${input.requestId} AND panel_id IS NOT DISTINCT FROM ${input.panelId ?? null}`;
    return { report: mapReport(back[0]), created: false };
  }
  return { report: mapReport(rows[0]), created: true };
}

export async function getReportById(id: string, sql?: DbExecutor): Promise<LabReport | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(REPORT_COLS)} FROM clinical.lab_reports WHERE id = ${id}`;
  return rows.length > 0 ? mapReport(rows[0] as Record<string, unknown>) : null;
}

export async function lockReportById(id: string, tx: DbExecutor): Promise<LabReport | null> {
  const rows = await tx`
    SELECT ${tx.unsafe(REPORT_COLS)} FROM clinical.lab_reports WHERE id = ${id} FOR UPDATE`;
  return rows.length > 0 ? mapReport(rows[0] as Record<string, unknown>) : null;
}

export async function patchReport(
  id: string,
  fields: Record<string, unknown>,
  tx: DbExecutor,
): Promise<LabReport> {
  const cols = Object.keys(fields);
  const setClause = cols.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = Object.values(fields);
  const rows = await tx.unsafe(
    `UPDATE clinical.lab_reports SET ${setClause}, updated_at = now()
     WHERE id = $${cols.length + 1} RETURNING ${REPORT_COLS}`,
    [...values, id],
  );
  return mapReport(rows[0] as Record<string, unknown>);
}

export async function getReportsByRequest(requestId: string, tx?: DbExecutor): Promise<LabReport[]> {
  const db = tx ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(REPORT_COLS)} FROM clinical.lab_reports
    WHERE request_id = ${requestId} ORDER BY created_at ASC`;
  return (rows as Record<string, unknown>[]).map((r) => mapReport(r));
}

export async function listReports(
  filter: { status?: string; patientId?: string; visitId?: string } = {},
  sql?: DbExecutor,
): Promise<LabReport[]> {
  const db = sql ?? getDb();
  let where = db`WHERE 1 = 1`;
  if (filter.status) where = db`${where} AND status = ${filter.status}`;
  if (filter.patientId) where = db`${where} AND patient_id = ${filter.patientId}`;
  if (filter.visitId) where = db`${where} AND visit_id = ${filter.visitId}`;
  const rows = await db`
    SELECT ${db.unsafe(REPORT_COLS)} FROM clinical.lab_reports
    ${where}
    ORDER BY created_at DESC`;
  return (rows as Record<string, unknown>[]).map((r) => mapReport(r));
}

/**
 * 结果行 upsert：同一报告同一项目重录覆盖（先 SELECT 判存在）。
 * 写入 lab_results 的同时回写 LIS 串联列（request_id/specimen_id/report_id/entered_by）。
 */
export async function upsertResult(
  input: {
    reportId: string;
    requestId: string;
    specimenId: string | null;
    visitId: string;
    patientId: string;
    reportNo: string;
    panelName: string | null;
    specimenType: string | null;
    itemCode: string;
    itemName: string;
    unit: string | null;
    value: string;
    numericValue: number | null;
    refLow: number | null;
    refHigh: number | null;
    abnormalFlag: AbnormalFlag;
    isCritical: boolean;
    enteredBy: string;
  },
  tx: DbExecutor,
): Promise<{ result: LabResultRow; created: boolean }> {
  const existing = await tx`
    SELECT id FROM clinical.lab_results
    WHERE report_id = ${input.reportId} AND item_code = ${input.itemCode}`;
  const created = existing.length === 0;

  let rows;
  if (created) {
    rows = await tx`
      INSERT INTO clinical.lab_results
        (visit_id, patient_id, report_no, panel_name, item_name, item_code, specimen,
         value, numeric_value, unit, ref_low, ref_high, abnormal_flag, is_critical,
         result_time, request_id, specimen_id, report_id, entered_by)
      VALUES
        (${input.visitId}, ${input.patientId}, ${input.reportNo}, ${input.panelName ?? null},
         ${input.itemName}, ${input.itemCode}, ${input.specimenType ?? null},
         ${input.value}, ${input.numericValue}, ${input.unit ?? null},
         ${input.refLow ?? null}, ${input.refHigh ?? null}, ${input.abnormalFlag},
         ${input.isCritical}, now(), ${input.requestId}, ${input.specimenId ?? null},
         ${input.reportId}, ${input.enteredBy})
      RETURNING id, report_id, request_id, specimen_id, item_code, item_name, value,
        numeric_value, unit, ref_low, ref_high, abnormal_flag, is_critical, result_time, entered_by`;
  } else {
    rows = await tx`
      UPDATE clinical.lab_results SET
        item_name = ${input.itemName},
        value = ${input.value},
        numeric_value = ${input.numericValue},
        unit = ${input.unit ?? null},
        ref_low = ${input.refLow ?? null},
        ref_high = ${input.refHigh ?? null},
        abnormal_flag = ${input.abnormalFlag},
        is_critical = ${input.isCritical},
        result_time = now(),
        request_id = ${input.requestId},
        specimen_id = ${input.specimenId ?? null},
        entered_by = ${input.enteredBy}
      WHERE id = ${String((existing[0] as Record<string, unknown>).id)}
      RETURNING id, report_id, request_id, specimen_id, item_code, item_name, value,
        numeric_value, unit, ref_low, ref_high, abnormal_flag, is_critical, result_time, entered_by`;
  }
  const r = rows[0] as Record<string, unknown>;
  return {
    created,
    result: {
      id: String(r.id),
      reportId: String(r.report_id),
      requestId: r.request_id ? String(r.request_id) : null,
      specimenId: r.specimen_id ? String(r.specimen_id) : null,
      itemCode: r.item_code ? String(r.item_code) : null,
      itemName: String(r.item_name),
      value: r.value != null ? String(r.value) : null,
      numericValue: r.numeric_value != null ? Number(r.numeric_value) : null,
      unit: r.unit ? String(r.unit) : null,
      refLow: r.ref_low != null ? Number(r.ref_low) : null,
      refHigh: r.ref_high != null ? Number(r.ref_high) : null,
      abnormalFlag: r.abnormal_flag ? String(r.abnormal_flag) : null,
      isCritical: Boolean(r.is_critical),
      resultTime: r.result_time ? String(r.result_time) : null,
      enteredBy: r.entered_by ? String(r.entered_by) : null,
    },
  };
}

export async function getResultsByReport(reportId: string, tx?: DbExecutor): Promise<LabResultRow[]> {
  const db = tx ?? getDb();
  const rows = await db`
    SELECT id, report_id, request_id, specimen_id, item_code, item_name, value,
      numeric_value, unit, ref_low, ref_high, abnormal_flag, is_critical, result_time, entered_by
    FROM clinical.lab_results
    WHERE report_id = ${reportId}
    ORDER BY created_at ASC`;
  return (rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    reportId: String(r.report_id),
    requestId: r.request_id ? String(r.request_id) : null,
    specimenId: r.specimen_id ? String(r.specimen_id) : null,
    itemCode: r.item_code ? String(r.item_code) : null,
    itemName: String(r.item_name),
    value: r.value != null ? String(r.value) : null,
    numericValue: r.numeric_value != null ? Number(r.numeric_value) : null,
    unit: r.unit ? String(r.unit) : null,
    refLow: r.ref_low != null ? Number(r.ref_low) : null,
    refHigh: r.ref_high != null ? Number(r.ref_high) : null,
    abnormalFlag: r.abnormal_flag ? String(r.abnormal_flag) : null,
    isCritical: Boolean(r.is_critical),
    resultTime: r.result_time ? String(r.result_time) : null,
    enteredBy: r.entered_by ? String(r.entered_by) : null,
  }));
}
