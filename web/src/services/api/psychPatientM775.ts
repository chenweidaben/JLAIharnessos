/**
 * 健澜科技 jlmedaios - 心理科管理 API（M775）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface PsychPatient {
  id: string;
  inpatientNo: string;
  patient: string;
  diagnosis: string;
  phq9: number;
  gad7: number;
  treatment: string;
  status: string;
  assessment: string;
  plan: string;
  consults: { date: string; mode: string; topic: string }[];
  medications: { name: string; dose: string; start: string }[];
}

const DEMO: PsychPatient[] = [
  {
    id: 'PS-001',
    inpatientNo: 'ZY-261103',
    patient: '赵患者',
    diagnosis: '中度抑郁发作伴焦虑',
    phq9: 15,
    gad7: 12,
    treatment: '认知行为治疗 + SSRI',
    status: '治疗中',
    assessment: 'PHQ-9=15（中度）；GAD-7=12（中度）；自杀风险低。',
    plan: '每周 1 次 CBT；舍曲林 50mg qd。',
    consults: [
      { date: '2026-10-20', mode: '面对面', topic: '睡眠与情绪' },
    ],
    medications: [
      { name: '盐酸舍曲林片', dose: '50mg qd', start: '2026-10-15' },
    ],
  },
];

export interface PsychListResult {
  items: PsychPatient[];
  demo: boolean;
}

export async function fetchPsychPatients(): Promise<PsychListResult> {
  try {
    const res = await get<{ items: PsychPatient[] }>('/clinical/psych-patients');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
