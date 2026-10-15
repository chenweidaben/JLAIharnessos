/**
 * 健澜科技 jlmedaios - 全院数据驾驶舱 API 服务（院长版）
 *
 * GET /api/v1/ceo-dashboard：八大核心指标卡 + 24h 趋势（演示数据 demo:true）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { get } from '../request';

/** 指标健康度：good 正常 / warn 预警 / danger 超标 */
export type CeoMetricStatus = 'good' | 'warn' | 'danger';

export type CeoMetricKey =
  | 'outpatientDaily'
  | 'inpatientDaily'
  | 'surgeryDaily'
  | 'bedOccupancy'
  | 'drgSettlement'
  | 'qcPassRate'
  | 'antibioticUse'
  | 'patientSatisfaction';

/** 单张核心指标卡 */
export interface CeoMetric {
  key: CeoMetricKey;
  title: string;
  value: number;
  unit: string;
  status: CeoMetricStatus;
  detail: string;
}

/** 24h 趋势：单小时数据点（门诊/住院/手术三线） */
export interface CeoTrendPoint {
  hour: string;
  outpatient: number;
  inpatient: number;
  surgery: number;
}

/** 全院数据驾驶舱视图 */
export interface CeoDashboardView {
  demo: boolean;
  generatedAt: string;
  metrics: CeoMetric[];
  trend: CeoTrendPoint[];
}

/** 拉取全院数据驾驶舱八大指标 + 24h 趋势 */
export function fetchCeoDashboard(): Promise<CeoDashboardView> {
  return get<CeoDashboardView>('/ceo-dashboard');
}
