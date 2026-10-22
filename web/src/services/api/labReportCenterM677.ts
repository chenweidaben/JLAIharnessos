/**
 * 健澜科技 jlmedaios - 检验报告中心 API（M677）
 *
 * 对接 BFF：GET /api/v1/lab/reports（DEMO 兜底）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type ReportStatus = 'pending' | 'reviewed' | 'flagged';
export type AbnormalFlag = 'normal' | 'high' | 'low' | 'critically_high' | 'critically_low';

export interface LabReportItem {
  name: string;
  value: string;
  unit: string;
  refRange: string;
  flag: AbnormalFlag;
}

export interface LabReport {
  id: string;
  reportNo: string;
  patientId: string;
  dept: string;
  panel: string;
  status: ReportStatus;
  reportedAt: string;
  items: LabReportItem[];
}

export const REPORT_STATUS_META: Record<ReportStatus, { label: string; color: string }> = {
  pending: { label: '待审核', color: 'orange' },
  reviewed: { label: '已审核', color: 'green' },
  flagged: { label: '已标危', color: 'red' },
};

export const FLAG_META: Record<AbnormalFlag, { label: string; color: string }> = {
  normal: { label: '正常', color: 'default' },
  high: { label: '↑ 偏高', color: 'orange' },
  low: { label: '↓ 偏低', color: 'orange' },
  critically_high: { label: '↑↑ 危急', color: 'red' },
  critically_low: { label: '↓↓ 危急', color: 'red' },
};

const DEMO_REPORTS: LabReport[] = [
  {
    id: 'LR-001',
    reportNo: 'LAB-2610001',
    patientId: 'P10001',
    dept: '呼吸科',
    panel: '血气分析',
    status: 'flagged',
    reportedAt: '2026-10-22T08:30:00+08:00',
    items: [
      { name: 'pH', value: '7.32', unit: '', refRange: '7.35-7.45', flag: 'low' },
      { name: 'PaCO2', value: '58', unit: 'mmHg', refRange: '35-45', flag: 'critically_high' },
      { name: 'PaO2', value: '52', unit: 'mmHg', refRange: '80-100', flag: 'critically_low' },
      { name: 'HCO3-', value: '28', unit: 'mmol/L', refRange: '22-27', flag: 'high' },
    ],
  },
  {
    id: 'LR-002',
    reportNo: 'LAB-2610002',
    patientId: 'P10005',
    dept: '心内科',
    panel: '心肌酶谱',
    status: 'reviewed',
    reportedAt: '2026-10-22T09:00:00+08:00',
    items: [
      { name: 'cTnI', value: '0.08', unit: 'ng/mL', refRange: '<0.04', flag: 'high' },
      { name: 'CK-MB', value: '12', unit: 'U/L', refRange: '<10', flag: 'high' },
      { name: 'BNP', value: '320', unit: 'pg/mL', refRange: '<100', flag: 'high' },
    ],
  },
];

export interface ReportListResult {
  items: LabReport[];
  demo: boolean;
}

export async function fetchLabReports(): Promise<ReportListResult> {
  try {
    const res = await get<{ items: LabReport[] }>('/lab/reports');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO_REPORTS, demo: true };
  }
}
