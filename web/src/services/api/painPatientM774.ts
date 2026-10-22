/**
 * 健澜科技 jlmedaios - 疼痛科管理 API（M774）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface PainPatient {
  id: string;
  inpatientNo: string;
  patient: string;
  location: string;
  vas: number;
  treatment: string;
  status: string;
  assessment: string;
  treatmentRecords: { date: string; action: string; vas: number }[];
}

const DEMO: PainPatient[] = [
  {
    id: 'PT-001',
    inpatientNo: 'ZY-261102',
    patient: '李患者',
    location: '腰椎 L4/L5 右侧神经根',
    vas: 7,
    treatment: '神经阻滞 + 口服塞来昔布',
    status: '治疗中',
    assessment: 'VAS 7 分，NRS 7，影响睡眠及行走。',
    treatmentRecords: [
      { date: '2026-10-20', action: '椎间孔神经阻滞', vas: 7 },
      { date: '2026-10-22', action: '随访', vas: 3 },
    ],
  },
];

export interface PainListResult {
  items: PainPatient[];
  demo: boolean;
}

export async function fetchPainPatients(): Promise<PainListResult> {
  try {
    const res = await get<{ items: PainPatient[] }>('/clinical/pain-patients');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
