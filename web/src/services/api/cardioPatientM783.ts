/**
 * 健澜科技 jlmedaios - 心血管内科管理 API（M783）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type NyhaClass = 'I' | 'II' | 'III' | 'IV';

export const NYHA_META: Record<NyhaClass, { label: string; color: string }> = {
  I: { label: 'NYHA I', color: 'green' },
  II: { label: 'NYHA II', color: 'blue' },
  III: { label: 'NYHA III', color: 'orange' },
  IV: { label: 'NYHA IV', color: 'red' },
};

export interface CardioPatient {
  id: string;
  inpatientNo: string;
  patient: string;
  diagnosis: string;
  nyha: NyhaClass;
  status: string;
  ecg: string;
  echo: string;
  angiography: string;
  medications: { name: string; dose: string; start: string }[];
  procedures: { date: string; name: string; outcome: string }[];
}

const DEMO: CardioPatient[] = [
  {
    id: 'CA-001',
    inpatientNo: 'ZY-261110',
    patient: '许患者',
    diagnosis: '冠心病，急性非 ST 段抬高型心肌梗死',
    nyha: 'II',
    status: '术后',
    ecg: 'V1-V4 ST 段压低 0.1-0.2 mV，T 波倒置。',
    echo: 'LVEF 55%，左室壁运动节段性减弱，二尖瓣轻度反流。',
    angiography: 'LAD 近段 90% 狭窄，已行 PCI + 药物支架。',
    medications: [
      { name: '阿司匹林', dose: '100mg qd', start: '2026-10-15' },
      { name: '替格瑞洛', dose: '90mg bid', start: '2026-10-15' },
      { name: '瑞舒伐他汀', dose: '20mg qn', start: '2026-10-15' },
    ],
    procedures: [
      { date: '2026-10-16', name: '冠脉造影 + PCI（LAD 药物支架）', outcome: 'TIMI III 级，无并发症' },
    ],
  },
];

export interface CardioListResult {
  items: CardioPatient[];
  demo: boolean;
}

export async function fetchCardioPatients(): Promise<CardioListResult> {
  try {
    const res = await get<{ items: CardioPatient[] }>('/clinical/cardio-patients');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
