/**
 * 健澜科技 jlmedaios - 内分泌科管理 API（M787）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface EndoPatient {
  id: string;
  inpatientNo: string;
  patient: string;
  diagnosis: string;
  fastingGlucose: number;
  hba1c: number;
  status: string;
  glucoseCurve: string;
  thyroid: string;
  complications: string;
  medications: { name: string; dose: string; start: string }[];
  dietAdvice: string;
}

const DEMO: EndoPatient[] = [
  {
    id: 'EN-001',
    inpatientNo: 'ZY-261114',
    patient: '高患者',
    diagnosis: '2 型糖尿病，糖尿病周围神经病变',
    fastingGlucose: 8.5,
    hba1c: 8.2,
    status: '治疗中',
    glucoseCurve: '空腹 8.5，餐后 2h 12.3，睡前 9.1（mmol/L）。',
    thyroid: 'TSH 1.8，FT3/FT4 正常。',
    complications: '四肢末端麻木 1 年；10g 单丝觉减退；尿白蛋白/肌酐比值 35 mg/g（A2 期）。',
    medications: [
      { name: '二甲双胍', dose: '0.5g tid', start: '2026-01-10' },
      { name: '达格列净', dose: '10mg qd', start: '2026-10-15' },
    ],
    dietAdvice: '每日总热量 1800 kcal，主食 200g，低盐低脂，分餐 4 次。',
  },
];

export interface EndoListResult {
  items: EndoPatient[];
  demo: boolean;
}

export async function fetchEndoPatients(): Promise<EndoListResult> {
  try {
    const res = await get<{ items: EndoPatient[] }>('/clinical/endo-patients');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
