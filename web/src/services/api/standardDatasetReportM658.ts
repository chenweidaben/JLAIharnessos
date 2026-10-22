/**
 * 健澜科技 jlmedaios - 标准数据集上报 API（M658，配套 M584）
 *
 * 对接 BFF：GET /api/v1/standard-datasets/reports
 *   （未注册则 DEMO 兜底，打标 demo:true）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type DatasetStatus = 'reported' | 'pending' | 'failed' | 'partial';

export interface StandardDatasetReport {
  id: string;
  datasetName: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  period: string;
  recordCount: number;
  status: DatasetStatus;
  compliancePct: number;
  lastReportedAt: string;
}

export const DATASET_STATUS_META: Record<DatasetStatus, { label: string; color: string }> = {
  reported: { label: '已上报', color: 'green' },
  partial: { label: '部分上报', color: 'orange' },
  pending: { label: '待上报', color: 'default' },
  failed: { label: '上报失败', color: 'red' },
};

const DEMO_REPORTS: StandardDatasetReport[] = [
  { id: 'DS-001', datasetName: '住院病案首页数据集', frequency: 'monthly', period: '2026-09', recordCount: 1280, status: 'reported', compliancePct: 99.2, lastReportedAt: '2026-10-15T08:00:00+08:00' },
  { id: 'DS-002', datasetName: '电子病历共享文档数据集', frequency: 'daily', period: '2026-10-22', recordCount: 412, status: 'reported', compliancePct: 98.5, lastReportedAt: '2026-10-22T06:00:00+08:00' },
  { id: 'DS-003', datasetName: '医学检验结果数据集', frequency: 'daily', period: '2026-10-22', recordCount: 1520, status: 'partial', compliancePct: 86.0, lastReportedAt: '2026-10-22T06:30:00+08:00' },
  { id: 'DS-004', datasetName: '护理操作数据集', frequency: 'weekly', period: '2026-W42', recordCount: 3200, status: 'pending', compliancePct: 0, lastReportedAt: '2026-10-13T08:00:00+08:00' },
];

export interface DatasetListResult {
  items: StandardDatasetReport[];
  totalCount: number;
  demo: boolean;
}

export async function fetchStandardDatasetReports(): Promise<DatasetListResult> {
  try {
    const res = await get<{ items: StandardDatasetReport[]; totalCount: number }>('/standard-datasets/reports');
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_REPORTS, totalCount: DEMO_REPORTS.length, demo: true };
  }
}
