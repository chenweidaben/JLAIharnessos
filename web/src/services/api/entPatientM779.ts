/**
 * 健澜科技 jlmedaios - 耳鼻喉科管理 API（M779）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface EntPatient {
  id: string;
  inpatientNo: string;
  patient: string;
  diagnosis: string;
  site: string;
  treatment: string;
  status: string;
  endoscopy: string;
  hearing: string;
  records: { date: string; action: string; outcome: string }[];
}

const DEMO: EntPatient[] = [
  {
    id: 'EN-001',
    inpatientNo: 'ZY-261107',
    patient: '郑患者',
    diagnosis: '慢性鼻窦炎伴鼻息肉（双侧）',
    site: '鼻腔 / 鼻窦',
    treatment: '鼻内镜下鼻窦开放 + 鼻息肉切除',
    status: '术后',
    endoscopy: '双侧中鼻道息肉样新生物，脓性分泌物；鼻中隔轻度偏曲。',
    hearing: '纯音测听示双耳轻度传导性聋（气导 25 dB）。',
    records: [
      { date: '2026-10-19', action: '鼻内镜手术', outcome: '术后恢复良好' },
    ],
  },
];

export interface EntListResult {
  items: EntPatient[];
  demo: boolean;
}

export async function fetchEntPatients(): Promise<EntListResult> {
  try {
    const res = await get<{ items: EntPatient[] }>('/clinical/ent-patients');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
