/**
 * 健澜科技 jlmedaios - 呼吸内科管理 API（M784）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface PulmPatient {
  id: string;
  inpatientNo: string;
  patient: string;
  diagnosis: string;
  spo2: number;
  oxygen: string;
  status: string;
  pulmonaryFunction: string;
  chestCt: string;
  bloodGas: string;
  ventilatorParams: string;
  records: { date: string; action: string; outcome: string }[];
}

const DEMO: PulmPatient[] = [
  {
    id: 'PU-001',
    inpatientNo: 'ZY-261111',
    patient: '曹患者',
    diagnosis: '慢性阻塞性肺疾病急性加重（AECOPD）伴 II 型呼衰',
    spo2: 88,
    oxygen: '无创呼吸机 BiPAP，IPAP 18 / EPAP 6，FiO2 35%',
    status: '治疗中',
    pulmonaryFunction: 'FEV1/FVC 52%，FEV1 占预计值 38%（GOLD 4 级）。',
    chestCt: '双肺纹理增多，肺气肿征，右下肺斑片影。',
    bloodGas: 'pH 7.32，PaCO2 62 mmHg，PaO2 55 mmHg。',
    ventilatorParams: 'BiPAP 模式，呼吸频率 16，潮气量 450 mL。',
    records: [
      { date: '2026-10-20', action: '支气管扩张剂 + 糖皮质激素雾化', outcome: 'SpO2 提升至 92%' },
    ],
  },
];

export interface PulmListResult {
  items: PulmPatient[];
  demo: boolean;
}

export async function fetchPulmPatients(): Promise<PulmListResult> {
  try {
    const res = await get<{ items: PulmPatient[] }>('/clinical/pulm-patients');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
