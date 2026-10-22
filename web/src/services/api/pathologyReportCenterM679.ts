/**
 * 健澜科技 jlmedaios - 病理报告中心 API（M679）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type ReportStatus = 'pending' | 'reviewed' | 'flagged';

export interface PathologyReport {
  id: string;
  specimenNo: string;
  patientId: string;
  dept: string;
  bodyPart: string;
  sampleType: string;
  status: ReportStatus;
  gross: string;
  microscopic: string;
  diagnosis: string;
  ihc: string;
  pathologist: string;
  reportedAt: string;
}

export const REPORT_STATUS_META: Record<ReportStatus, { label: string; color: string }> = {
  pending: { label: '待审核', color: 'orange' },
  reviewed: { label: '已审核', color: 'green' },
  flagged: { label: '已标危', color: 'red' },
};

const DEMO: PathologyReport[] = [
  {
    id: 'PATH-001',
    specimenNo: 'PTH-2610001',
    patientId: 'P10011',
    dept: '普外科',
    bodyPart: '结肠',
    sampleType: '手术切除标本',
    status: 'reviewed',
    gross: '灰白组织一块，大小 3×2×1cm，切面灰白质韧。',
    microscopic: '腺上皮异型增生，核大深染，可见核分裂象。',
    diagnosis: '（结肠）中分化腺癌，侵及浆膜层。',
    ihc: 'CK7(-), CK20(+), CDX-2(+), Ki-67 70%+, P53(突变型)',
    pathologist: '陈医师',
    reportedAt: '2026-10-22T11:00:00+08:00',
  },
];

export interface ReportListResult {
  items: PathologyReport[];
  demo: boolean;
}

export async function fetchPathologyReports(): Promise<ReportListResult> {
  try {
    const res = await get<{ items: PathologyReport[] }>('/pathology/reports');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
