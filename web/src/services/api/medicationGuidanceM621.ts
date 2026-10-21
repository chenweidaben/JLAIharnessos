/**
 * 健澜科技 jlmedaios - 用药指导 API（M621，P12 患者侧深度）
 *
 * 对接 BFF：GET /api/v1/medication/guidance（未注册则 DEMO 兜底，打标 demo:true）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface MedicationGuidance {
  id: string;
  drugName: string;
  spec: string;
  dosage: string;
  frequency: string;
  route: string;
  timing: string;
  precautions: string[];
  startDate: string;
  endDate: string | null;
}

const DEMO_GUIDANCE: MedicationGuidance[] = [
  {
    id: 'MG-001',
    drugName: '苯磺酸氨氯地平片',
    spec: '5mg×28 片',
    dosage: '5mg',
    frequency: '每日 1 次',
    route: '口服',
    timing: '晨起固定时间',
    precautions: ['不可自行停药', '注意踝部水肿', '定期监测血压'],
    startDate: '2026-10-15',
    endDate: null,
  },
  {
    id: 'MG-002',
    drugName: '阿司匹林肠溶片',
    spec: '100mg×30 片',
    dosage: '100mg',
    frequency: '每日 1 次',
    route: '口服',
    timing: '餐前半小时',
    precautions: ['不可掰开', '胃部不适随诊', '出血倾向立即就医'],
    startDate: '2026-10-15',
    endDate: null,
  },
  {
    id: 'MG-003',
    drugName: '阿托伐他汀钙片',
    spec: '20mg×7 片',
    dosage: '20mg',
    frequency: '每晚 1 次',
    route: '口服',
    timing: '睡前',
    precautions: ['定期复查肝功能', '肌肉酸痛随诊'],
    startDate: '2026-10-15',
    endDate: '2026-11-15',
  },
];

export async function fetchMedicationGuidance(patientId: string): Promise<{ items: MedicationGuidance[]; demo: boolean }> {
  try {
    const res = await get<{ items: MedicationGuidance[] }>('/medication/guidance', { patientId });
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO_GUIDANCE, demo: true };
  }
}
