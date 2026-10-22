/**
 * 健澜科技 jlmedaios - 风湿免疫科管理 API（M790）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface RheumPatient {
  id: string;
  inpatientNo: string;
  patient: string;
  diagnosis: string;
  jointCount: number;
  esr: number;
  crp: number;
  status: string;
  jointExam: string;
  autoantibodies: string;
  das28: number;
  plan: string;
  medications: { name: string; dose: string; start: string }[];
}

const DEMO: RheumPatient[] = [
  {
    id: 'RH-001',
    inpatientNo: 'ZY-261117',
    patient: '潘患者',
    diagnosis: '类风湿关节炎（活动期）',
    jointCount: 8,
    esr: 56,
    crp: 32,
    status: '治疗中',
    jointExam: '双手掌指、近端指间关节肿胀压痛 8 处，晨僵 90 min。',
    autoantibodies: 'RF 168 IU/mL（+），抗 CCP 抗体 240 RU/mL（强阳性）。',
    das28: 5.4,
    plan: 'MTX + 生物制剂（阿达木单抗）联合治疗。',
    medications: [
      { name: '甲氨蝶呤', dose: '15mg 每周', start: '2026-06-01' },
      { name: '阿达木单抗', dose: '40mg q2w 皮下', start: '2026-10-01' },
    ],
  },
];

export interface RheumListResult {
  items: RheumPatient[];
  demo: boolean;
}

export async function fetchRheumPatients(): Promise<RheumListResult> {
  try {
    const res = await get<{ items: RheumPatient[] }>('/clinical/rheum-patients');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
