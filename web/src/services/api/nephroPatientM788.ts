/**
 * 健澜科技 jlmedaios - 肾内科管理 API（M788）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface NephroPatient {
  id: string;
  inpatientNo: string;
  patient: string;
  diagnosis: string;
  egfr: number;
  creatinine: number;
  status: string;
  kidneyFunction: string;
  urineProtein: string;
  kidneyUltrasound: string;
  dialysisRecords: { date: string; mode: string; outcome: string }[];
  medications: { name: string; dose: string; start: string }[];
}

const DEMO: NephroPatient[] = [
  {
    id: 'NK-001',
    inpatientNo: 'ZY-261115',
    patient: '蒋患者',
    diagnosis: '慢性肾脏病 4 期（CKD 4），糖尿病肾病',
    egfr: 22,
    creatinine: 380,
    status: '治疗中',
    kidneyFunction: 'eGFR 22 mL/min/1.73m²，Scr 380 μmol/L，BUN 18 mmol/L，K 5.6 mmol/L。',
    urineProtein: '24h 尿蛋白定量 2.8 g。',
    kidneyUltrasound: '双肾缩小（左 8.6cm，右 8.4cm），皮质回声增强。',
    dialysisRecords: [
      { date: '2026-10-20', mode: '血液透析 4h', outcome: 'Kt/V 1.4，超滤 2.5kg' },
    ],
    medications: [
      { name: '沙库巴曲缬沙坦', dose: '100mg bid', start: '2026-09-01' },
      { name: '碳酸氢钠', dose: '1.0g tid', start: '2026-10-01' },
    ],
  },
];

export interface NephroListResult {
  items: NephroPatient[];
  demo: boolean;
}

export async function fetchNephroPatients(): Promise<NephroListResult> {
  try {
    const res = await get<{ items: NephroPatient[] }>('/clinical/nephro-patients');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
