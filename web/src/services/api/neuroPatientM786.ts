/**
 * 健澜科技 jlmedaios - 神经内科管理 API（M786）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface NeuroPatient {
  id: string;
  inpatientNo: string;
  patient: string;
  diagnosis: string;
  gcs: number;
  nihss: number;
  status: string;
  imaging: string;
  eeg: string;
  muscleStrength: string;
  records: { date: string; action: string; outcome: string }[];
  rehab: string;
}

const DEMO: NeuroPatient[] = [
  {
    id: 'NE-001',
    inpatientNo: 'ZY-261113',
    patient: '罗患者',
    diagnosis: '急性脑梗死（右侧基底节区）',
    gcs: 15,
    nihss: 8,
    status: '治疗中',
    imaging: '头颅 MRI DWI 示右侧基底节区新发梗死灶；MRA 示右侧 MCA M1 段狭窄。',
    eeg: '未见明显痫样放电。',
    muscleStrength: '左侧肢体肌力 IV 级，右侧 V 级；左侧巴氏征(+)。',
    records: [
      { date: '2026-10-20', action: '抗血小板 + 他汀 + 改善脑循环', outcome: 'NIHSS 由 10 降至 8' },
    ],
    rehab: 'Brunnstrom III 期，Barthel 50 分；已转康复科联合训练。',
  },
];

export interface NeuroListResult {
  items: NeuroPatient[];
  demo: boolean;
}

export async function fetchNeuroPatients(): Promise<NeuroListResult> {
  try {
    const res = await get<{ items: NeuroPatient[] }>('/clinical/neuro-patients');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
