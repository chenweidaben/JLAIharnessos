/**
 * 健澜科技 jlmedaios - 口腔科管理 API（M780）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface DentalPatient {
  id: string;
  caseNo: string;
  patient: string;
  diagnosis: string;
  tooth: string;
  treatment: string;
  status: string;
  oralExam: string;
  xray: string;
  records: { date: string; action: string; outcome: string }[];
  prostheticPlan: string;
}

const DEMO: DentalPatient[] = [
  {
    id: 'DT-001',
    caseNo: 'KC-261101',
    patient: '钱患者',
    diagnosis: '36 远中邻颌面深龋伴牙髓炎',
    tooth: '36',
    treatment: '根管治疗 + 全冠修复',
    status: '治疗中',
    oralExam: '36 合面可见龋坏，探痛(+)，叩(±)，冷测迟缓痛。',
    xray: '根尖片示 36 髓腔开放，根尖周膜增宽。',
    records: [
      { date: '2026-10-20', action: '36 根管预备 + 封药', outcome: '无不适' },
    ],
    prostheticPlan: '根管治疗完成后行二氧化锆全冠修复。',
  },
];

export interface DentalListResult {
  items: DentalPatient[];
  demo: boolean;
}

export async function fetchDentalPatients(): Promise<DentalListResult> {
  try {
    const res = await get<{ items: DentalPatient[] }>('/clinical/dental-patients');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
