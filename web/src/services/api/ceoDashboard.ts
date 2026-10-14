/**
 * 健澜科技 jlmedaios - 院长数据驾驶舱 API 服务（院长版）
 *
 * GET /api/v1/ceo-dashboard：六大核心指标卡（演示数据 demo:true）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { get } from '../request';

/** 指标健康度：good 正常 / warn 预警 / danger 超标 */
export type CeoMetricStatus = 'good' | 'warn' | 'danger';

export type CeoMetricKey =
  | 'bedOccupancy'
  | 'outpatientDaily'
  | 'inpatientDaily'
  | 'drgSettlement'
  | 'qcPassRate'
  | 'antibioticUse';

/** 单张核心指标卡 */
export interface CeoMetric {
  key: CeoMetricKey;
  title: string;
  value: number;
  unit: string;
  status: CeoMetricStatus;
  detail: string;
}

/** 院长版驾驶舱视图 */
export interface CeoDashboardView {
  demo: boolean;
  generatedAt: string;
  metrics: CeoMetric[];
}

/** 拉取院长版驾驶舱六大核心指标 */
export function fetchCeoDashboard(): Promise<CeoDashboardView> {
  return get<CeoDashboardView>('/ceo-dashboard');
}
