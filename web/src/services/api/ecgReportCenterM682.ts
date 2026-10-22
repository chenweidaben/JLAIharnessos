/**
 * 健澜科技 jlmedaios - 心电检查报告中心 API（M682）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type ReportStatus = 'pending' | 'reviewed' | 'flagged';

export interface EcgReport {
  id: string;
  accessionNo: string;
  patientId: string;
  dept: string;
  heartRate: number;
  rhythm: string;
  ecgDiagnosis: string;
  status: ReportStatus;
  measurements: { name: string; value: string }[];
  reader: string;
  reportedAt: string;
}

export const REPORT_STATUS_META: Record<ReportStatus, { label: string; color: string }> = {
  pending: { label: '待审核', color: 'orange' },
  reviewed: { label: '已审核', color: 'green' },
  flagged: { label: '已标危', color: 'red' },
};

const DEMO: EcgReport[] = [
  {
    id: 'ECG-001',
    accessionNo: 'ECG-2610001',
    patientId: 'P10005',
    dept: '心内科',
    heartRate: 88,
    rhythm: '窦性心律',
    ecgDiagnosis: '窦性心律，ST-T 改变（II、III、aVF 导联 ST 段压低 0.1mV）。',
    status: 'flagged',
    measurements: [
      { name: '心率', value: '88 bpm' },
      { name: 'PR 间期', value: '160 ms' },
      { name: 'QRS 时限', value: '96 ms' },
      { name: 'QTc', value: '410 ms' },
      { name: '电轴', value: '+30°' },
    ],
    reader: '陈主任',
    reportedAt: '2026-10-22T09:15:00+08:00',
  },
  {
    id: 'ECG-002',
    accessionNo: 'ECG-2610002',
    patientId: 'P10008',
    dept: '体检中心',
    heartRate: 72,
    rhythm: '窦性心律',
    ecgDiagnosis: '窦性心律，心电图大致正常。',
    status: 'reviewed',
    measurements: [
      { name: '心率', value: '72 bpm' },
      { name: 'PR 间期', value: '150 ms' },
      { name: 'QRS 时限', value: '88 ms' },
      { name: 'QTc', value: '395 ms' },
    ],
    reader: '王医师',
    reportedAt: '2026-10-22T10:00:00+08:00',
  },
];

export interface ReportListResult {
  items: EcgReport[];
  demo: boolean;
}

export async function fetchEcgReports(): Promise<ReportListResult> {
  try {
    const res = await get<{ items: EcgReport[] }>('/ecg/reports');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
