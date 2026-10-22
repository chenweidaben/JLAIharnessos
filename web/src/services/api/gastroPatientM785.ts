/**
 * 健澜科技 jlmedaios - 消化内科管理 API（M785）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface GastroPatient {
  id: string;
  inpatientNo: string;
  patient: string;
  diagnosis: string;
  symptom: string;
  status: string;
  endoscopy: string;
  hPylori: string;
  ultrasound: string;
  records: { date: string; action: string; outcome: string }[];
}

const DEMO: GastroPatient[] = [
  {
    id: 'GA-001',
    inpatientNo: 'ZY-261112',
    patient: '黄患者',
    diagnosis: '十二指肠球部溃疡（A1 期）',
    symptom: '反复发作上腹痛 3 月，空腹痛伴夜间痛',
    status: '治疗中',
    endoscopy: '十二指肠球部前壁可见 0.8cm 溃疡，底覆白苔，周围充血水肿。',
    hPylori: 'C13 呼气试验 DOB 8.6，Hp 阳性。',
    ultrasound: '肝胆胰脾未见明显异常。',
    records: [
      { date: '2026-10-20', action: 'PPI 四联根除 Hp（14 天）', outcome: '腹痛缓解' },
    ],
  },
];

export interface GastroListResult {
  items: GastroPatient[];
  demo: boolean;
}

export async function fetchGastroPatients(): Promise<GastroListResult> {
  try {
    const res = await get<{ items: GastroPatient[] }>('/clinical/gastro-patients');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
