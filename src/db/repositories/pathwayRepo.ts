/**
 * 健澜科技 jlmedaios - 临床路径管理 Repository（M15-A）
 *
 * clinical.pathway_definitions / pathway_form_items / pathway_enrollments /
 * pathway_executions / pathway_variations 读写。
 *
 * 并发与一致性：
 *  - 路径定义按 pathway_code 唯一 upsert；表单项按 (pathway_id, stage_day, item_code) upsert；
 *  - 入径/完成/退出状态机以 CAS（WHERE status=…）更新，重复操作返回 null；
 *  - jsonb 一律以 tx.json(纯对象) 写入，禁止 JSON.stringify 字符串；
 *  - uuid 列动态过滤须用条件片段数组，避免空字符串绑定触发 22P02。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type DbExecutor } from '../pool.js';
import { toJson } from './helpers.js';
import type { FormItemType, VariationCategory, VariationType } from '../../medical-tools/pathway/pathwayRules.js';

/** 12 位十六进制后缀：避免编号在高并发/重跑下命中唯一约束。 */
function randomSuffix(): string {
  const buf = new Uint8Array(6);
  globalThis.crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

function genNo(prefix: string): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `${prefix}${ymd}${randomSuffix()}`;
}

// ---------------------------------------------------------------------------
// 路径定义
// ---------------------------------------------------------------------------

export interface PathwayDefinition {
  id: string;
  pathwayCode: string;
  name: string;
  icdCode: string | null;
  applicableDepartments: string[];
  standardLos: number | null;
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  dischargeCriteria: string[];
  version: string;
  status: 'active' | 'retired';
  sourceKnowledgeId: string | null;
  createdAt: string;
  updatedAt: string;
}

const DEF_COLS = `
  id, pathway_code, name, icd_code, applicable_departments, standard_los,
  inclusion_criteria, exclusion_criteria, discharge_criteria, version, status,
  source_knowledge_id, created_at, updated_at
`;

function mapDef(row: Record<string, unknown>): PathwayDefinition {
  return {
    id: String(row.id),
    pathwayCode: String(row.pathway_code),
    name: String(row.name),
    icdCode: row.icd_code ? String(row.icd_code) : null,
    applicableDepartments: (row.applicable_departments as string[]) ?? [],
    standardLos: row.standard_los !== null && row.standard_los !== undefined ? Number(row.standard_los) : null,
    inclusionCriteria: (row.inclusion_criteria as string[]) ?? [],
    exclusionCriteria: (row.exclusion_criteria as string[]) ?? [],
    dischargeCriteria: (row.discharge_criteria as string[]) ?? [],
    version: String(row.version),
    status: row.status as 'active' | 'retired',
    sourceKnowledgeId: row.source_knowledge_id ? String(row.source_knowledge_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export interface PathwayDefinitionInput {
  pathwayCode: string;
  name: string;
  icdCode?: string | null;
  applicableDepartments?: string[];
  standardLos?: number | null;
  inclusionCriteria?: string[];
  exclusionCriteria?: string[];
  dischargeCriteria?: string[];
  version?: string;
  status?: 'active' | 'retired';
}

export async function getDefinitionById(
  id: string, sql?: DbExecutor,
): Promise<PathwayDefinition | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(DEF_COLS)} FROM clinical.pathway_definitions WHERE id = ${id}`;
  return rows.length > 0 ? mapDef(rows[0] as Record<string, unknown>) : null;
}

export async function getDefinitionByCode(
  code: string, sql?: DbExecutor,
): Promise<PathwayDefinition | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(DEF_COLS)} FROM clinical.pathway_definitions WHERE pathway_code = ${code}`;
  return rows.length > 0 ? mapDef(rows[0] as Record<string, unknown>) : null;
}

export async function listDefinitions(
  filter: { status?: string; icd?: string } = {},
  sql?: DbExecutor,
): Promise<PathwayDefinition[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(DEF_COLS)} FROM clinical.pathway_definitions
    WHERE (${filter.status ?? ''} = '' OR status = ${filter.status ?? ''})
      AND (${filter.icd ?? ''} = '' OR icd_code = ${filter.icd ?? ''})
    ORDER BY pathway_code ASC`;
  return (rows as Record<string, unknown>[]).map(mapDef);
}

export async function listActiveDefinitions(sql?: DbExecutor): Promise<PathwayDefinition[]> {
  return listDefinitions({ status: 'active' }, sql);
}

/** upsert 路径定义（pathway_code 唯一），写后重新读取。 */
export async function upsertDefinition(
  input: PathwayDefinitionInput, tx: DbExecutor,
): Promise<PathwayDefinition> {
  await tx`
    INSERT INTO clinical.pathway_definitions
      (pathway_code, name, icd_code, applicable_departments, standard_los,
       inclusion_criteria, exclusion_criteria, discharge_criteria, version, status)
    VALUES (
      ${input.pathwayCode}, ${input.name}, ${input.icdCode ?? null},
      ${tx.json(toJson(input.applicableDepartments ?? []))}, ${input.standardLos ?? null},
      ${tx.json(toJson(input.inclusionCriteria ?? []))},
      ${tx.json(toJson(input.exclusionCriteria ?? []))},
      ${tx.json(toJson(input.dischargeCriteria ?? []))},
      ${input.version ?? '1.0'}, ${input.status ?? 'active'}
    )
    ON CONFLICT (pathway_code) DO UPDATE SET
      name = EXCLUDED.name, icd_code = EXCLUDED.icd_code,
      applicable_departments = EXCLUDED.applicable_departments,
      standard_los = EXCLUDED.standard_los,
      inclusion_criteria = EXCLUDED.inclusion_criteria,
      exclusion_criteria = EXCLUDED.exclusion_criteria,
      discharge_criteria = EXCLUDED.discharge_criteria,
      version = EXCLUDED.version, status = EXCLUDED.status, updated_at = now()
    RETURNING id`;
  const back = await getDefinitionByCode(input.pathwayCode, tx);
  if (!back) throw new Error('路径定义写入后读取失败');
  return back;
}

// ---------------------------------------------------------------------------
// 路径表单项目
// ---------------------------------------------------------------------------

export interface PathwayFormItem {
  id: string;
  pathwayId: string;
  stageDay: number;
  stageName: string;
  itemCode: string;
  itemType: FormItemType;
  content: string;
  required: boolean;
  sortOrder: number;
}

const FORM_COLS = `
  id, pathway_id, stage_day, stage_name, item_code, item_type, content, required, sort_order
`;

function mapFormItem(row: Record<string, unknown>): PathwayFormItem {
  return {
    id: String(row.id),
    pathwayId: String(row.pathway_id),
    stageDay: Number(row.stage_day),
    stageName: String(row.stage_name),
    itemCode: String(row.item_code),
    itemType: row.item_type as FormItemType,
    content: String(row.content),
    required: Boolean(row.required),
    sortOrder: Number(row.sort_order),
  };
}

export async function listFormItems(
  pathwayId: string, filter: { stageDay?: number } = {}, sql?: DbExecutor,
): Promise<PathwayFormItem[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(FORM_COLS)} FROM clinical.pathway_form_items
    WHERE pathway_id = ${pathwayId}
      AND (${filter.stageDay ?? 0} = 0 OR stage_day = ${filter.stageDay ?? 0})
    ORDER BY stage_day ASC, sort_order ASC, item_code ASC`;
  return (rows as Record<string, unknown>[]).map(mapFormItem);
}

export async function getFormItemById(
  id: string, sql?: DbExecutor,
): Promise<PathwayFormItem | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(FORM_COLS)} FROM clinical.pathway_form_items WHERE id = ${id}`;
  return rows.length > 0 ? mapFormItem(rows[0] as Record<string, unknown>) : null;
}

export interface FormItemInput {
  stageDay: number;
  stageName: string;
  itemCode: string;
  itemType: FormItemType;
  content: string;
  required?: boolean;
  sortOrder?: number;
}

/** upsert 表单项（pathway_id + stage_day + item_code 唯一）。 */
export async function upsertFormItem(
  pathwayId: string, input: FormItemInput, tx: DbExecutor,
): Promise<PathwayFormItem> {
  await tx`
    INSERT INTO clinical.pathway_form_items
      (pathway_id, stage_day, stage_name, item_code, item_type, content, required, sort_order)
    VALUES (
      ${pathwayId}, ${input.stageDay}, ${input.stageName}, ${input.itemCode},
      ${input.itemType}, ${input.content}, ${input.required ?? true}, ${input.sortOrder ?? 0}
    )
    ON CONFLICT (pathway_id, stage_day, item_code) DO UPDATE SET
      stage_name = EXCLUDED.stage_name, item_type = EXCLUDED.item_type,
      content = EXCLUDED.content, required = EXCLUDED.required, sort_order = EXCLUDED.sort_order
    RETURNING ${tx.unsafe(FORM_COLS)}`;
  // 重新按唯一键读取
  const rows = await tx`
    SELECT ${tx.unsafe(FORM_COLS)} FROM clinical.pathway_form_items
    WHERE pathway_id = ${pathwayId} AND stage_day = ${input.stageDay} AND item_code = ${input.itemCode}`;
  return mapFormItem(rows[0] as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// 入径记录
// ---------------------------------------------------------------------------

export type EnrollmentStatus = 'in_path' | 'completed' | 'withdrawn';

export interface PathwayEnrollment {
  id: string;
  enrollmentNo: string;
  pathwayId: string;
  pathwayCode: string | null;
  pathwayName: string | null;
  visitId: string;
  patientId: string;
  patientName: string | null;
  enrollmentDiagnosis: string;
  diagnosisCode: string | null;
  status: EnrollmentStatus;
  enrolledBy: string;
  enrolledByName: string | null;
  enrolledAt: string;
  completedBy: string | null;
  completedAt: string | null;
  dischargeCriteriaMet: string[] | null;
  withdrawnBy: string | null;
  withdrawnAt: string | null;
  withdrawReason: string | null;
  actualLos: number | null;
  actualFee: number | null;
  createdAt: string;
}

const ENR_BASE_COLS = `
  id, enrollment_no, pathway_id, visit_id, patient_id, enrollment_diagnosis, diagnosis_code,
  status, enrolled_by, enrolled_at, completed_by, completed_at, discharge_criteria_met,
  withdrawn_by, withdrawn_at, withdraw_reason, actual_los, actual_fee, created_at
`;
const ENR_COLS = `
  e.id, e.enrollment_no, e.pathway_id, e.visit_id, e.patient_id, e.enrollment_diagnosis,
  e.diagnosis_code, e.status, e.enrolled_by, e.enrolled_at, e.completed_by, e.completed_at,
  e.discharge_criteria_met, e.withdrawn_by, e.withdrawn_at, e.withdraw_reason,
  e.actual_los, e.actual_fee, e.created_at,
  d.pathway_code, d.name AS pathway_name,
  p.name_masked AS patient_name, u.name AS enrolled_by_name
`;
const ENR_FROM = `
  FROM clinical.pathway_enrollments e
  LEFT JOIN clinical.pathway_definitions d ON d.id = e.pathway_id
  LEFT JOIN clinical.patients p ON p.id = e.patient_id
  LEFT JOIN iam.users u ON u.id = e.enrolled_by
`;

function mapEnrollment(row: Record<string, unknown>): PathwayEnrollment {
  return {
    id: String(row.id),
    enrollmentNo: String(row.enrollment_no),
    pathwayId: String(row.pathway_id),
    pathwayCode: row.pathway_code ? String(row.pathway_code) : null,
    pathwayName: row.pathway_name ? String(row.pathway_name) : null,
    visitId: String(row.visit_id),
    patientId: String(row.patient_id),
    patientName: row.patient_name ? String(row.patient_name) : null,
    enrollmentDiagnosis: String(row.enrollment_diagnosis),
    diagnosisCode: row.diagnosis_code ? String(row.diagnosis_code) : null,
    status: row.status as EnrollmentStatus,
    enrolledBy: String(row.enrolled_by),
    enrolledByName: row.enrolled_by_name ? String(row.enrolled_by_name) : null,
    enrolledAt: String(row.enrolled_at),
    completedBy: row.completed_by ? String(row.completed_by) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    dischargeCriteriaMet: row.discharge_criteria_met ? (row.discharge_criteria_met as string[]) : null,
    withdrawnBy: row.withdrawn_by ? String(row.withdrawn_by) : null,
    withdrawnAt: row.withdrawn_at ? String(row.withdrawn_at) : null,
    withdrawReason: row.withdraw_reason ? String(row.withdraw_reason) : null,
    actualLos: row.actual_los !== null && row.actual_los !== undefined ? Number(row.actual_los) : null,
    actualFee: row.actual_fee !== null && row.actual_fee !== undefined ? Number(row.actual_fee) : null,
    createdAt: String(row.created_at),
  };
}

export async function getEnrollmentById(
  id: string, sql?: DbExecutor,
): Promise<PathwayEnrollment | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(ENR_COLS)} ${db.unsafe(ENR_FROM)} WHERE e.id = ${id}`;
  return rows.length > 0 ? mapEnrollment(rows[0] as Record<string, unknown>) : null;
}

/** 同就诊同路径是否已有在径/完成记录（UNIQUE(visit_id, pathway_id)）。 */
export async function getEnrollmentByVisitPathway(
  visitId: string, pathwayId: string, sql?: DbExecutor,
): Promise<PathwayEnrollment | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(ENR_COLS)} ${db.unsafe(ENR_FROM)}
    WHERE e.visit_id = ${visitId} AND e.pathway_id = ${pathwayId}`;
  return rows.length > 0 ? mapEnrollment(rows[0] as Record<string, unknown>) : null;
}

export async function listEnrollments(
  filter: { status?: string; visitId?: string; pathwayId?: string } = {},
  sql?: DbExecutor,
): Promise<PathwayEnrollment[]> {
  const db = sql ?? getDb();
  type Fragment = ReturnType<DbExecutor>;
  const conds: Fragment[] = [db`TRUE`];
  if (filter.status) conds.push(db`e.status = ${filter.status}`);
  if (filter.visitId) conds.push(db`e.visit_id = ${filter.visitId}`);
  if (filter.pathwayId) conds.push(db`e.pathway_id = ${filter.pathwayId}`);
  const where = conds.reduce((acc, c) => db`${acc} AND ${c}`);
  const rows = await db`
    SELECT ${db.unsafe(ENR_COLS)} ${db.unsafe(ENR_FROM)}
    WHERE ${where}
    ORDER BY e.enrolled_at DESC`;
  return (rows as Record<string, unknown>[]).map(mapEnrollment);
}

export interface CreateEnrollmentInput {
  pathwayId: string;
  visitId: string;
  patientId: string;
  enrollmentDiagnosis: string;
  diagnosisCode?: string | null;
  enrolledBy: string;
}

export async function createEnrollment(
  input: CreateEnrollmentInput, tx: DbExecutor,
): Promise<PathwayEnrollment> {
  const rows = await tx`
    INSERT INTO clinical.pathway_enrollments
      (enrollment_no, pathway_id, visit_id, patient_id, enrollment_diagnosis, diagnosis_code, enrolled_by)
    VALUES (
      ${genNo('EN')}, ${input.pathwayId}, ${input.visitId}, ${input.patientId},
      ${input.enrollmentDiagnosis}, ${input.diagnosisCode ?? null}, ${input.enrolledBy}
    )
    RETURNING ${tx.unsafe(ENR_BASE_COLS)}`;
  const created = await getEnrollmentById(String(rows[0].id), tx);
  if (!created) throw new Error('入径记录写入后读取失败');
  return created;
}

/** CAS in_path -> completed：记录完成医师、出院标准、实际住院日/费用。 */
export async function completeEnrollment(
  id: string,
  input: { completedBy: string; dischargeCriteriaMet: string[]; actualLos: number | null; actualFee: number | null },
  tx: DbExecutor,
): Promise<PathwayEnrollment | null> {
  const rows = await tx`
    UPDATE clinical.pathway_enrollments
    SET status = 'completed', completed_by = ${input.completedBy}, completed_at = now(),
        discharge_criteria_met = ${tx.json(toJson(input.dischargeCriteriaMet))},
        actual_los = ${input.actualLos}, actual_fee = ${input.actualFee}, updated_at = now()
    WHERE id = ${id} AND status = 'in_path'
    RETURNING id`;
  if (rows.length === 0) return null;
  return getEnrollmentById(id, tx);
}

/** CAS in_path -> withdrawn：记录退出医师、原因、实际住院日/费用。 */
export async function withdrawEnrollment(
  id: string,
  input: { withdrawnBy: string; reason: string; actualLos: number | null; actualFee: number | null },
  tx: DbExecutor,
): Promise<PathwayEnrollment | null> {
  const rows = await tx`
    UPDATE clinical.pathway_enrollments
    SET status = 'withdrawn', withdrawn_by = ${input.withdrawnBy}, withdrawn_at = now(),
        withdraw_reason = ${input.reason}, actual_los = ${input.actualLos},
        actual_fee = ${input.actualFee}, updated_at = now()
    WHERE id = ${id} AND status = 'in_path'
    RETURNING id`;
  if (rows.length === 0) return null;
  return getEnrollmentById(id, tx);
}

// ---------------------------------------------------------------------------
// 执行记录
// ---------------------------------------------------------------------------

export type ExecutionStatus = 'pending' | 'executed' | 'skipped' | 'replaced';

export interface PathwayExecution {
  id: string;
  enrollmentId: string;
  formItemId: string;
  stageDay: number;
  status: ExecutionStatus;
  orderId: string | null;
  note: string | null;
  executedBy: string | null;
  executedAt: string | null;
}

const EXE_COLS = `
  id, enrollment_id, form_item_id, stage_day, status, order_id, note, executed_by, executed_at
`;

function mapExecution(row: Record<string, unknown>): PathwayExecution {
  return {
    id: String(row.id),
    enrollmentId: String(row.enrollment_id),
    formItemId: String(row.form_item_id),
    stageDay: Number(row.stage_day),
    status: row.status as ExecutionStatus,
    orderId: row.order_id ? String(row.order_id) : null,
    note: row.note ? String(row.note) : null,
    executedBy: row.executed_by ? String(row.executed_by) : null,
    executedAt: row.executed_at ? String(row.executed_at) : null,
  };
}

export async function listExecutionsByEnrollment(
  enrollmentId: string, sql?: DbExecutor,
): Promise<PathwayExecution[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(EXE_COLS)} FROM clinical.pathway_executions
    WHERE enrollment_id = ${enrollmentId} ORDER BY created_at ASC`;
  return (rows as Record<string, unknown>[]).map(mapExecution);
}

export async function getExecutionByItem(
  enrollmentId: string, formItemId: string, sql?: DbExecutor,
): Promise<PathwayExecution | null> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(EXE_COLS)} FROM clinical.pathway_executions
    WHERE enrollment_id = ${enrollmentId} AND form_item_id = ${formItemId}`;
  return rows.length > 0 ? mapExecution(rows[0] as Record<string, unknown>) : null;
}

/** 入径时为路径全部表单项建立 pending 执行记录（幂等：已存在则不重复建）。 */
export async function seedPendingExecutions(
  enrollmentId: string, formItems: PathwayFormItem[], tx: DbExecutor,
): Promise<void> {
  for (const item of formItems) {
    await tx`
      INSERT INTO clinical.pathway_executions (enrollment_id, form_item_id, stage_day)
      VALUES (${enrollmentId}, ${item.id}, ${item.stageDay})
      ON CONFLICT (enrollment_id, form_item_id) DO NOTHING`;
  }
}

/** CAS pending -> executed：绑定医嘱与执行人（电子签名后调用）。 */
export async function markExecutionExecuted(
  executionId: string, orderId: string, executedBy: string, tx: DbExecutor,
): Promise<PathwayExecution | null> {
  const rows = await tx`
    UPDATE clinical.pathway_executions
    SET status = 'executed', order_id = ${orderId}, executed_by = ${executedBy},
        executed_at = now(), updated_at = now()
    WHERE id = ${executionId} AND status = 'pending'
    RETURNING ${tx.unsafe(EXE_COLS)}`;
  return rows.length > 0 ? mapExecution(rows[0] as Record<string, unknown>) : null;
}

/** CAS pending -> skipped/replaced：记录说明与执行人。 */
export async function markExecutionSkipped(
  executionId: string, status: 'skipped' | 'replaced', note: string, executedBy: string, tx: DbExecutor,
): Promise<PathwayExecution | null> {
  const rows = await tx`
    UPDATE clinical.pathway_executions
    SET status = ${status}, note = ${note}, executed_by = ${executedBy},
        executed_at = now(), updated_at = now()
    WHERE id = ${executionId} AND status = 'pending'
    RETURNING ${tx.unsafe(EXE_COLS)}`;
  return rows.length > 0 ? mapExecution(rows[0] as Record<string, unknown>) : null;
}

// ---------------------------------------------------------------------------
// 变异记录
// ---------------------------------------------------------------------------

export interface PathwayVariation {
  id: string;
  variationNo: string;
  enrollmentId: string;
  stageDay: number | null;
  variationType: VariationType;
  category: VariationCategory;
  description: string;
  recordedBy: string;
  recordedByName: string | null;
  recordedAt: string;
  handled: boolean;
}

const VAR_COLS = `
  v.id, v.variation_no, v.enrollment_id, v.stage_day, v.variation_type, v.category,
  v.description, v.recorded_by, v.recorded_at, v.handled, u.name AS recorded_by_name
`;
const VAR_FROM = `
  FROM clinical.pathway_variations v
  LEFT JOIN iam.users u ON u.id = v.recorded_by
`;

function mapVariation(row: Record<string, unknown>): PathwayVariation {
  return {
    id: String(row.id),
    variationNo: String(row.variation_no),
    enrollmentId: String(row.enrollment_id),
    stageDay: row.stage_day !== null && row.stage_day !== undefined ? Number(row.stage_day) : null,
    variationType: row.variation_type as VariationType,
    category: row.category as VariationCategory,
    description: String(row.description),
    recordedBy: String(row.recorded_by),
    recordedByName: row.recorded_by_name ? String(row.recorded_by_name) : null,
    recordedAt: String(row.recorded_at),
    handled: Boolean(row.handled),
  };
}

export interface CreateVariationInput {
  enrollmentId: string;
  stageDay?: number | null;
  variationType: VariationType;
  category: VariationCategory;
  description: string;
  recordedBy: string;
}

export async function createVariation(
  input: CreateVariationInput, tx: DbExecutor,
): Promise<PathwayVariation> {
  const rows = await tx`
    INSERT INTO clinical.pathway_variations
      (variation_no, enrollment_id, stage_day, variation_type, category, description, recorded_by)
    VALUES (
      ${genNo('VN')}, ${input.enrollmentId}, ${input.stageDay ?? null},
      ${input.variationType}, ${input.category}, ${input.description}, ${input.recordedBy}
    )
    RETURNING id`;
  const id = String(rows[0].id);
  const back = await getVariationById(id, tx);
  if (!back) throw new Error('变异记录写入后读取失败');
  return back;
}

export async function getVariationById(
  id: string, sql?: DbExecutor,
): Promise<PathwayVariation | null> {
  const db = sql ?? getDb();
  const rows = await db`SELECT ${db.unsafe(VAR_COLS)} ${db.unsafe(VAR_FROM)} WHERE v.id = ${id}`;
  return rows.length > 0 ? mapVariation(rows[0] as Record<string, unknown>) : null;
}

export async function listVariationsByEnrollment(
  enrollmentId: string, sql?: DbExecutor,
): Promise<PathwayVariation[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT ${db.unsafe(VAR_COLS)} ${db.unsafe(VAR_FROM)}
    WHERE v.enrollment_id = ${enrollmentId} ORDER BY v.recorded_at ASC`;
  return (rows as Record<string, unknown>[]).map(mapVariation);
}

// ---------------------------------------------------------------------------
// 质控指标取数（SQL 聚合；匹配/纯计算在规则引擎）
// ---------------------------------------------------------------------------

export interface MetricsWindowRows {
  enrolled: number;
  completed: number;
  withdrawn: number;
  varied: number;
  losValues: number[];
  feeValues: number[];
  categoryCounts: Record<string, number>;
}

/** 窗口内入径状态聚合 + 完成患者住院日/费用 + 变异原因分布。 */
export async function aggregateMetricsWindow(
  from: string, to: string, sql?: DbExecutor,
): Promise<MetricsWindowRows> {
  const db = sql ?? getDb();
  const statusRow = await db`
    SELECT
      COUNT(*)::int AS enrolled,
      COUNT(*) FILTER (WHERE e.status = 'completed')::int AS completed,
      COUNT(*) FILTER (WHERE e.status = 'withdrawn')::int AS withdrawn,
      COUNT(DISTINCT e.id) FILTER (WHERE EXISTS (
        SELECT 1 FROM clinical.pathway_variations v WHERE v.enrollment_id = e.id
      ))::int AS varied
    FROM clinical.pathway_enrollments e
    WHERE e.enrolled_at >= ${from} AND e.enrolled_at < ${to}`;
  const sr = statusRow[0] as Record<string, unknown>;

  const doneRows = await db`
    SELECT e.actual_los, e.actual_fee
    FROM clinical.pathway_enrollments e
    WHERE e.status = 'completed' AND e.enrolled_at >= ${from} AND e.enrolled_at < ${to}`;
  const losValues = (doneRows as Record<string, unknown>[])
    .map((r) => Number(r.actual_los))
    .filter((n) => Number.isFinite(n));
  const feeValues = (doneRows as Record<string, unknown>[])
    .map((r) => Number(r.actual_fee))
    .filter((n) => Number.isFinite(n));

  const catRows = await db`
    SELECT v.category, COUNT(*)::int AS c
    FROM clinical.pathway_variations v
    JOIN clinical.pathway_enrollments e ON e.id = v.enrollment_id
    WHERE v.recorded_at >= ${from} AND v.recorded_at < ${to}
    GROUP BY v.category`;
  const categoryCounts: Record<string, number> = {};
  for (const r of catRows as Record<string, unknown>[]) {
    categoryCounts[String(r.category)] = Number(r.c);
  }

  return {
    enrolled: Number(sr.enrolled) || 0,
    completed: Number(sr.completed) || 0,
    withdrawn: Number(sr.withdrawn) || 0,
    varied: Number(sr.varied) || 0,
    losValues,
    feeValues,
    categoryCounts,
  };
}

/**
 * 窗口内符合路径诊断的住院就诊（用于入径率分母）：
 * 返回 distinct (visitId, diagnosisCode)，由聚合器用 matchPathway 判定是否命中 active 路径。
 */
export interface DiagnosedVisitRow {
  visitId: string;
  diagnosisCode: string | null;
}

export async function listDiagnosedInpatientVisits(
  from: string, to: string, sql?: DbExecutor,
): Promise<DiagnosedVisitRow[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT DISTINCT v.id AS visit_id, dg.code AS diagnosis_code
    FROM clinical.visits v
    JOIN clinical.diagnoses dg ON dg.visit_id = v.id
    WHERE v.visit_type = 'inpatient'
      AND dg.confirmed = true AND dg.code IS NOT NULL AND dg.code <> ''
      AND v.admit_at >= ${from} AND v.admit_at < ${to}`;
  return (rows as Record<string, unknown>[]).map((r) => ({
    visitId: String(r.visit_id),
    diagnosisCode: r.diagnosis_code ? String(r.diagnosis_code) : null,
  }));
}

/**
 * 在院住院就诊及其已确认诊断（用于 eligible 可入径列表）。
 * 返回每行一个就诊的一个诊断（distinct visit + code），由聚合器做匹配与去重。
 */
export interface EligibleCandidateRow {
  visitId: string;
  patientId: string;
  patientName: string | null;
  department: string;
  status: string;
  admitAt: string | null;
  diagnosisName: string;
  diagnosisCode: string | null;
  alreadyEnrolledPathwayIds: string[];
}

export async function listEligibleCandidates(sql?: DbExecutor): Promise<EligibleCandidateRow[]> {
  const db = sql ?? getDb();
  const rows = await db`
    SELECT v.id AS visit_id, v.patient_id, p.name_masked AS patient_name,
           v.department, v.status, v.admit_at,
           dg.name AS diagnosis_name, dg.code AS diagnosis_code,
           COALESCE((
             SELECT array_agg(e2.pathway_id)
             FROM clinical.pathway_enrollments e2
             WHERE e2.visit_id = v.id AND e2.status IN ('in_path','completed')
           ), ARRAY[]::uuid[]) AS enrolled_ids
    FROM clinical.visits v
    JOIN clinical.diagnoses dg ON dg.visit_id = v.id
    LEFT JOIN clinical.patients p ON p.id = v.patient_id
    WHERE v.visit_type = 'inpatient' AND v.status = 'ongoing'
      AND dg.confirmed = true AND dg.code IS NOT NULL AND dg.code <> ''
    ORDER BY v.admit_at DESC`;
  return (rows as Record<string, unknown>[]).map((r) => ({
    visitId: String(r.visit_id),
    patientId: String(r.patient_id),
    patientName: r.patient_name ? String(r.patient_name) : null,
    department: String(r.department),
    status: String(r.status),
    admitAt: r.admit_at ? String(r.admit_at) : null,
    diagnosisName: String(r.diagnosis_name),
    diagnosisCode: r.diagnosis_code ? String(r.diagnosis_code) : null,
    alreadyEnrolledPathwayIds: (r.enrolled_ids as string[]) ?? [],
  }));
}
