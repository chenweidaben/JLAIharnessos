/**
 * 健澜科技 jlmedaios - 内镜报告中心 API（M681）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type ReportStatus = 'pending' | 'reviewed' | 'flagged';

export interface EndoscopyReport {
  id: string;
  accessionNo: string;
  patientId: string;
  dept: string;
  endoType: string;
  diagnosis: string;
  biopsySite: string;
  status: ReportStatus;
  findings: string;
  endoscopist: string;
  reportedAt: string;
}

export const REPORT_STATUS_META: Record<ReportStatus, { label: string; color: string }> = {
  pending: { label: '待审核', color: 'orange' },
  reviewed: { label: '已审核', color: 'green' },
  flagged: { label: '已标危', color: 'red' },
};

const DEMO: EndoscopyReport[] = [
  {
    id: 'ENDO-001',
    accessionNo: 'GD-2610001',
    patientId: 'P10031',
    dept: '消化科',
    endoType: '胃镜',
    diagnosis: '慢性萎缩性胃炎（C-2）',
    biopsySite: '胃窦',
    status: 'reviewed',
    findings: '食管黏膜光滑，齿状线清晰；胃窦黏膜变薄，血管透见，散在糜烂灶 2 处；十二指肠球部未见异常。',
    endoscopist: '李主任',
    reportedAt: '2026-10-22T09:30:00+08:00',
  },
  {
    id: 'ENDO-002',
    accessionNo: 'GD-2610002',
    patientId: 'P10032',
    dept: '消化科',
    endoType: '肠镜',
    diagnosis: '结肠息肉（已切除）',
    biopsySite: '乙状结肠息肉',
    status: 'pending',
    findings: '乙状结肠见 0.8cm 有蒂息肉，NBI 呈 III 型 pit，已行 EMR 切除；余结肠黏膜正常。',
    endoscopist: '王医师',
    reportedAt: '2026-10-22T10:30:00+08:00',
  },
];

export interface ReportListResult {
  items: EndoscopyReport[];
  demo: boolean;
}

export async function fetchEndoscopyReports(): Promise<ReportListResult> {
  try {
    const res = await get<{ items: EndoscopyReport[] }>('/endoscopy/reports');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
