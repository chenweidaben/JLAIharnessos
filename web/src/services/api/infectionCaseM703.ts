/**
 * 健澜科技 jlmedaios - 院感病例监测 API（M703）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type ReportStatus = 'draft' | 'reported' | 'verified';

export interface InfectionCase {
  id: string;
  caseNo: string;
  patientId: string;
  site: string;
  diagnosedAt: string;
  status: ReportStatus;
  pathogen: string;
  antibiotics: string;
  outcome: string;
}

export const REPORT_STATUS_META: Record<ReportStatus, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  reported: { label: '已上报', color: 'orange' },
  verified: { label: '已核实', color: 'green' },
};

const DEMO: InfectionCase[] = [
  {
    id: 'IC-001',
    caseNo: 'GR-261001',
    patientId: 'P10005',
    site: '呼吸机相关肺炎（VAP）',
    diagnosedAt: '2026-10-18',
    status: 'verified',
    pathogen: '肺炎克雷伯菌（ESBL+）',
    antibiotics: '美罗培南 1g q8h',
    outcome: '好转脱机',
  },
  {
    id: 'IC-002',
    caseNo: 'GR-261002',
    patientId: 'P10011',
    site: '导尿管相关尿路感染（CAUTI）',
    diagnosedAt: '2026-10-21',
    status: 'reported',
    pathogen: '大肠埃希菌',
    antibiotics: '头孢呋辛 1.5g q8h',
    outcome: '治疗中',
  },
];

export interface CaseListResult {
  items: InfectionCase[];
  demo: boolean;
}

export async function fetchInfectionCases(): Promise<CaseListResult> {
  try {
    const res = await get<{ items: InfectionCase[] }>('/infection/cases');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
