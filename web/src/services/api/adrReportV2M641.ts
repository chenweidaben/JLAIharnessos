/**
 * 健澜科技 jlmedaios - ADR 药品不良反应 v2 API（M641，配套 M557）
 *
 * 对接 BFF：GET /api/v1/adr/reports + POST /api/v1/adr/reports
 *   （未注册则 DEMO 兜底，打标 demo:true；POST 不做成功兜底）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

export type AdrSeverity = 'mild' | 'moderate' | 'severe';
export type AdrStatus = 'draft' | 'submitted' | 'evaluated';

export interface AdrReport {
  id: string;
  patientId: string;
  drugName: string;
  reaction: string;
  severity: AdrSeverity;
  status: AdrStatus;
  reportedAt: string;
  reporter: string;
}

export interface AdrCreateInput {
  patientId: string;
  drugName: string;
  reaction: string;
  severity: AdrSeverity;
  reporter: string;
}

export const ADR_SEVERITY_META: Record<AdrSeverity, { label: string; color: string }> = {
  mild: { label: '轻度', color: 'green' },
  moderate: { label: '中度', color: 'orange' },
  severe: { label: '重度', color: 'red' },
};

export const ADR_STATUS_META: Record<AdrStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  submitted: { label: '已上报', color: 'blue' },
  evaluated: { label: '已评价', color: 'purple' },
};

const DEMO_REPORTS: AdrReport[] = [
  { id: 'ADR-001', patientId: 'P10001', drugName: '阿托伐他汀钙片', reaction: '肌肉酸痛（CK 升高）', severity: 'moderate', status: 'evaluated', reportedAt: '2026-10-18T09:00:00+08:00', reporter: '李医师' },
  { id: 'ADR-002', patientId: 'P10004', drugName: '阿莫西林胶囊', reaction: '皮疹', severity: 'mild', status: 'submitted', reportedAt: '2026-10-20T14:00:00+08:00', reporter: '王药师' },
  { id: 'ADR-003', patientId: 'P10009', drugName: '华法林钠片', reaction: '牙龈出血', severity: 'severe', status: 'submitted', reportedAt: '2026-10-21T10:00:00+08:00', reporter: '陈医师' },
];

export interface AdrListResult {
  items: AdrReport[];
  totalCount: number;
  demo: boolean;
}

export async function fetchAdrReports(patientId: string): Promise<AdrListResult> {
  try {
    const res = await get<{ items: AdrReport[]; totalCount: number }>('/adr/reports', { patientId });
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_REPORTS.filter((r) => r.patientId === patientId), totalCount: 0, demo: true };
  }
}

export async function createAdrReport(input: AdrCreateInput): Promise<AdrReport> {
  return post<AdrReport>('/adr/reports', { ...input, status: 'submitted' });
}
