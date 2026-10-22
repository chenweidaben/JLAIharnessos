/**
 * 健澜科技 jlmedaios - 传染病上报管理 API（M763）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type ReportStatus = 'draft' | 'submitted' | 'reviewed' | 'rejected';

export interface InfectiousReport {
  id: string;
  reportNo: string;
  patient: string;
  disease: string;
  category: string;
  reportedAt: string;
  status: ReportStatus;
  diagnosis: string;
  epiHistory: string;
  reviews: { time: string; by: string; result: string }[];
}

export const REPORT_STATUS_META: Record<ReportStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  submitted: { label: '已上报', color: 'blue' },
  reviewed: { label: '已审核', color: 'green' },
  rejected: { label: '已退回', color: 'red' },
};

const DEMO: InfectiousReport[] = [
  {
    id: 'IR-001',
    reportNo: 'CR-261001',
    patient: '张患者',
    disease: '新型冠状病毒感染',
    category: '乙类',
    reportedAt: '2026-10-22 10:15',
    status: 'reviewed',
    diagnosis: 'RT-PCR 阳性，CT 显示双肺磨玻璃影。',
    epiHistory: '近 14 天无外出旅行史，家庭聚集性发病 1 例。',
    reviews: [
      { time: '2026-10-22 11:00', by: '院感科 王科长', result: '审核通过，已上报区 CDC' },
    ],
  },
];

export interface ReportListResult {
  items: InfectiousReport[];
  demo: boolean;
}

export async function fetchInfectiousReports(): Promise<ReportListResult> {
  try {
    const res = await get<{ items: InfectiousReport[] }>('/public-health/infectious-reports');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
