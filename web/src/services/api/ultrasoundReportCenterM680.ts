/**
 * 健澜科技 jlmedaios - 超声报告中心 API（M680）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type ReportStatus = 'pending' | 'reviewed' | 'flagged';

export interface UltrasoundReport {
  id: string;
  accessionNo: string;
  patientId: string;
  dept: string;
  bodyPart: string;
  device: string;
  status: ReportStatus;
  findings: string;
  impression: string;
  sonographer: string;
  reportedAt: string;
}

export const REPORT_STATUS_META: Record<ReportStatus, { label: string; color: string }> = {
  pending: { label: '待审核', color: 'orange' },
  reviewed: { label: '已审核', color: 'green' },
  flagged: { label: '已标危', color: 'red' },
};

const DEMO: UltrasoundReport[] = [
  {
    id: 'US-001',
    accessionNo: 'US-2610001',
    patientId: 'P10021',
    dept: '消化科',
    bodyPart: '腹部',
    device: 'GE Voluson E10',
    status: 'reviewed',
    findings: '肝脏大小正常，回声均匀；胆囊 6×3cm，壁不厚；胰脾未见异常；双肾大小正常。',
    impression: '肝胆胰脾双肾超声未见明显异常。',
    sonographer: '王医师',
    reportedAt: '2026-10-22T09:00:00+08:00',
  },
];

export interface ReportListResult {
  items: UltrasoundReport[];
  demo: boolean;
}

export async function fetchUltrasoundReports(): Promise<ReportListResult> {
  try {
    const res = await get<{ items: UltrasoundReport[] }>('/ultrasound/reports');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
