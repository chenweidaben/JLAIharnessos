/* ============================================================================
 * 健澜科技杠OS - 数据湖仓类型定义（M5-D）
 *
 * 对应后端 src/bff/aggregators/lakehouseAggregator.ts 的视图结构。
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

export type RunMode = 'full' | 'incremental';

export type JobCode =
  | 'dwd_visit'
  | 'dwd_fee'
  | 'dws_dept_daily'
  | 'ads_hospital_daily';

/** 作业运行批次。 */
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

/** 数据血缘。 */
export interface LineageView {
  id: string;
  jobCode: string;
  sourceTable: string;
  targetTable: string;
  transformation: string | null;
}

/** 院级日指标（ADS）。 */
export interface HospitalDailyMetricView {
  statDate: string;
  outpatientVisits: number;
  inpatientVisits: number;
  emergencyVisits: number;
  totalVisits: number;
  totalRevenue: number;
  avgFeePerVisit: number;
}

/** 科室日汇总（DWS）。 */
export interface DeptDailySummaryView {
  statDate: string;
  department: string;
  visitType: string;
  visitCount: number;
  feeTotal: number;
}

/** pipeline 触发结果。 */
export interface PipelineRunSummary {
  mode: RunMode;
  jobs: Array<{ jobCode: JobCode; rowsRead: number; rowsWritten: number }>;
}
