/* ============================================================================
 * 健澜科技杠OS - 数据湖仓聚合器（M5-D）
 *
 * 编排湖仓分层加工：
 *  - 触发全量/增量 pipeline、单个作业重跑；
 *  - 查询作业运行历史、数据血缘；
 *  - 查询 DWS 科室日汇总、ADS 院级日指标。
 *
 * 权限：加工需 data_warehouse:admin，查询需 data_warehouse:read（路由层校验）。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import type { AuthView } from '../view/userView.js';
import { getDb } from '../../db/pool.js';
import { recordChainAudit } from '../../db/repositories/auditChainRepo.js';
import {
  type JobCode,
  type JobResult,
  type RunMode,
  runLakehousePipeline,
  runSingleJob,
} from '../../data-platform/lakehouseEtl.js';

/* -------------------------------- 错误类型 ------------------------------- */

export class LakehouseAggregatorError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'LakehouseAggregatorError';
  }
}
const badRequest = (m: string) => new LakehouseAggregatorError(400, 'BAD_REQUEST', m);

/** date 列（postgres.js 返回 Date 或字符串）→ yyyy-mm-dd。 */
function dateToIso(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

/* -------------------------------- 审计 -------------------------------- */

async function audit(
  auth: AuthView,
  action: string,
  resourceId: string,
  detail?: Record<string, unknown>,
): Promise<void> {
  await recordChainAudit({
    actorId: auth.id,
    actorName: auth.realName,
    actorRole: auth.rawRoles[0] ?? null,
    actorDept: auth.deptName,
    action,
    resourceType: 'data_warehouse',
    resourceId,
    result: 'success',
    detail,
  });
}

/* ------------------------------ 触发加工 ------------------------------ */

export interface PipelineRunSummary {
  mode: RunMode;
  jobs: Array<{ jobCode: JobCode; rowsRead: number; rowsWritten: number }>;
}

function summarize(mode: RunMode, results: JobResult[]): PipelineRunSummary {
  return {
    mode,
    jobs: results.map((r) => ({
      jobCode: r.jobCode,
      rowsRead: r.rowsRead,
      rowsWritten: r.rowsWritten,
    })),
  };
}

export async function triggerPipeline(
  auth: AuthView,
  mode: RunMode,
): Promise<PipelineRunSummary> {
  if (mode !== 'full' && mode !== 'incremental') {
    throw badRequest('mode 必须是 full 或 incremental');
  }
  const results = await runLakehousePipeline(mode);
  await audit(auth, 'data_warehouse.pipeline', mode, {
    jobs: results.map((r) => r.jobCode),
  });
  return summarize(mode, results);
}

export async function triggerJob(
  auth: AuthView,
  jobCode: JobCode,
): Promise<PipelineRunSummary> {
  const valid: JobCode[] = ['dwd_visit', 'dwd_fee', 'dws_dept_daily', 'ads_hospital_daily'];
  if (!valid.includes(jobCode)) throw badRequest('未知作业: ' + String(jobCode));
  const result = await runSingleJob(jobCode);
  await audit(auth, 'data_warehouse.job', jobCode, {
    rowsWritten: result.rowsWritten,
  });
  return {
    mode: 'incremental',
    jobs: [
      {
        jobCode: result.jobCode,
        rowsRead: result.rowsRead,
        rowsWritten: result.rowsWritten,
      },
    ],
  };
}

/* ------------------------------ 运行历史 ------------------------------ */

export interface JobRunView {
  runId: string;
  jobCode: string;
  runMode: string;
  status: string;
  rowsRead: number;
  rowsWritten: number;
  watermarkFrom: string | null;
  watermarkTo: string | null;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export async function listJobRuns(
  _auth: AuthView,
  options?: { jobCode?: string; limit?: number },
): Promise<JobRunView[]> {
  const db = getDb();
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 200);
  const jobCode = options?.jobCode;
  const rows = (await db`
    SELECT run_id, job_code, run_mode, status, rows_read, rows_written,
           watermark_from, watermark_to, error_message, started_at, finished_at
    FROM meta.etl_job_runs
    WHERE ${jobCode ? db`job_code = ${jobCode}` : db`true`}
    ORDER BY started_at DESC
    LIMIT ${limit}
  `) as Record<string, unknown>[];
  return rows.map((r) => ({
    runId: String(r.run_id),
    jobCode: String(r.job_code),
    runMode: String(r.run_mode),
    status: String(r.status),
    rowsRead: Number(r.rows_read),
    rowsWritten: Number(r.rows_written),
    watermarkFrom: r.watermark_from ? String(r.watermark_from) : null,
    watermarkTo: r.watermark_to ? String(r.watermark_to) : null,
    errorMessage: r.error_message ? String(r.error_message) : null,
    startedAt: String(r.started_at),
    finishedAt: r.finished_at ? String(r.finished_at) : null,
  }));
}

/* ------------------------------ 血缘 ------------------------------ */

export interface LineageView {
  id: string;
  jobCode: string;
  sourceTable: string;
  targetTable: string;
  transformation: string | null;
}

export async function listLineage(_auth: AuthView): Promise<LineageView[]> {
  const db = getDb();
  const rows = (await db`
    SELECT id, job_code, source_table, target_table, transformation
    FROM meta.data_lineage
    ORDER BY job_code, source_table
  `) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: String(r.id),
    jobCode: String(r.job_code),
    sourceTable: String(r.source_table),
    targetTable: String(r.target_table),
    transformation: r.transformation ? String(r.transformation) : null,
  }));
}

/* ------------------------------ 指标查询 ------------------------------ */

export interface HospitalDailyMetricView {
  statDate: string;
  outpatientVisits: number;
  inpatientVisits: number;
  emergencyVisits: number;
  totalVisits: number;
  totalRevenue: number;
  avgFeePerVisit: number;
}

export async function getHospitalMetrics(
  _auth: AuthView,
  options?: { from?: string; to?: string; limit?: number },
): Promise<HospitalDailyMetricView[]> {
  const db = getDb();
  const limit = Math.min(Math.max(options?.limit ?? 60, 1), 366);
  const from = options?.from;
  const to = options?.to;
  const rows = (await db`
    SELECT stat_date, outpatient_visits, inpatient_visits, emergency_visits,
           total_visits, total_revenue, avg_fee_per_visit
    FROM ads.hospital_daily_metrics
    WHERE ${from ? db`stat_date >= ${from}::date` : db`true`}
      AND ${to ? db`stat_date <= ${to}::date` : db`true`}
    ORDER BY stat_date DESC
    LIMIT ${limit}
  `) as Record<string, unknown>[];
  return rows.map((r) => ({
    statDate: dateToIso(r.stat_date),
    outpatientVisits: Number(r.outpatient_visits),
    inpatientVisits: Number(r.inpatient_visits),
    emergencyVisits: Number(r.emergency_visits),
    totalVisits: Number(r.total_visits),
    totalRevenue: Number(r.total_revenue),
    avgFeePerVisit: Number(r.avg_fee_per_visit),
  }));
}

export interface DeptDailySummaryView {
  statDate: string;
  department: string;
  visitType: string;
  visitCount: number;
  feeTotal: number;
}

export async function getDeptSummary(
  _auth: AuthView,
  options?: { date?: string; limit?: number },
): Promise<DeptDailySummaryView[]> {
  const db = getDb();
  const limit = Math.min(Math.max(options?.limit ?? 100, 1), 500);
  const date = options?.date;
  const rows = (await db`
    SELECT stat_date, department, visit_type, visit_count, fee_total
    FROM dws.dept_daily_summary
    WHERE ${date ? db`stat_date = ${date}::date` : db`true`}
    ORDER BY stat_date DESC, visit_count DESC
    LIMIT ${limit}
  `) as Record<string, unknown>[];
  return rows.map((r) => ({
    statDate: dateToIso(r.stat_date),
    department: String(r.department),
    visitType: String(r.visit_type),
    visitCount: Number(r.visit_count),
    feeTotal: Number(r.fee_total),
  }));
}
