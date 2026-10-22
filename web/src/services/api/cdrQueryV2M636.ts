/**
 * 健澜科技 jlmedaios - CDR 临床数据中心 v2 API（M636，配套 M609）
 *
 * 对接 BFF：
 *   GET /api/v1/cdr/patient/:id/overview  患者全景概览
 *   GET /api/v1/cdr/query                 通用查询（按 entity）
 *   GET /api/v1/cdr/stats                 数据量统计
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface CdrPatientOverview {
  patientId: string;
  name: string;
  gender: string;
  age: number;
  visitCount: number;
  labCount: number;
  medCount: number;
  diagnosisCount: number;
}

export interface CdrStats {
  patientCount: number;
  encounterCount: number;
  observationCount: number;
  medicationCount: number;
}

export interface CdrQueryRow {
  id: string;
  entity: string;
  key: string;
  value: string;
  capturedAt: string;
}

const DEMO_OVERVIEW: CdrPatientOverview = {
  patientId: 'P10001',
  name: '张某某',
  gender: '男',
  age: 58,
  visitCount: 12,
  labCount: 86,
  medCount: 24,
  diagnosisCount: 6,
};

const DEMO_STATS: CdrStats = {
  patientCount: 158000,
  encounterCount: 486000,
  observationCount: 22400000,
  medicationCount: 9800000,
};

const DEMO_QUERY: CdrQueryRow[] = [
  { id: 'Q-001', entity: 'Patient', key: 'name', value: '张某某', capturedAt: '2026-10-20T10:00:00+08:00' },
  { id: 'Q-002', entity: 'Observation', key: 'BP', value: '165/102', capturedAt: '2026-10-20T10:05:00+08:00' },
  { id: 'Q-003', entity: 'Medication', key: 'amlodipine', value: '5mg qd', capturedAt: '2026-10-20T10:10:00+08:00' },
];

export async function fetchCdrOverview(patientId: string): Promise<CdrPatientOverview & { demo: boolean }> {
  try {
    const res = await get<CdrPatientOverview>(`/cdr/patient/${patientId}/overview`);
    return { ...res, demo: false };
  } catch {
    return { ...DEMO_OVERVIEW, patientId, demo: true };
  }
}

export async function fetchCdrQuery(entity: string): Promise<{ items: CdrQueryRow[]; demo: boolean }> {
  try {
    const res = await get<{ items: CdrQueryRow[] }>('/cdr/query', { entity });
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO_QUERY.filter((r) => r.entity === entity || !entity), demo: true };
  }
}

export async function fetchCdrStats(): Promise<CdrStats & { demo: boolean }> {
  try {
    const res = await get<CdrStats>('/cdr/stats');
    return { ...res, demo: false };
  } catch {
    return { ...DEMO_STATS, demo: true };
  }
}
