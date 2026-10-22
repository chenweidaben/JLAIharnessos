/**
 * 健澜科技 jlmedaios - 影像报告中心 API（M678）
 *
 * 对接 BFF：GET /api/v1/radiology/reports（DEMO 兜底）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type ReportStatus = 'pending' | 'reviewed' | 'flagged';

export interface RadiologyReport {
  id: string;
  accessionNo: string;
  patientId: string;
  dept: string;
  modality: string;
  bodyPart: string;
  status: ReportStatus;
  findings: string;
  impression: string;
  radiologist: string;
  reportedAt: string;
}

export const REPORT_STATUS_META: Record<ReportStatus, { label: string; color: string }> = {
  pending: { label: '待审核', color: 'orange' },
  reviewed: { label: '已审核', color: 'green' },
  flagged: { label: '已标危', color: 'red' },
};

const DEMO: RadiologyReport[] = [
  {
    id: 'RAD-001',
    accessionNo: 'XR-2610001',
    patientId: 'P10001',
    dept: '呼吸科',
    modality: '胸部 CT',
    bodyPart: '胸部',
    status: 'reviewed',
    findings: '双肺纹理增多，右肺下叶见斑片影，边界模糊；气管支气管通畅；纵隔淋巴结无肿大。',
    impression: '右肺下叶感染性病变，建议治疗后复查。',
    radiologist: '李医师',
    reportedAt: '2026-10-22T09:30:00+08:00',
  },
  {
    id: 'RAD-002',
    accessionNo: 'XR-2610002',
    patientId: 'P10005',
    dept: '心内科',
    modality: '冠脉 CTA',
    bodyPart: '心脏冠脉',
    status: 'flagged',
    findings: '左前降支近段 80% 狭窄，左旋支中段 50% 狭窄；左室射血分数 55%。',
    impression: '左前降支重度狭窄，建议急诊 PCI。',
    radiologist: '王主任',
    reportedAt: '2026-10-22T10:00:00+08:00',
  },
];

export interface ReportListResult {
  items: RadiologyReport[];
  demo: boolean;
}

export async function fetchRadiologyReports(): Promise<ReportListResult> {
  try {
    const res = await get<{ items: RadiologyReport[] }>('/radiology/reports');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
