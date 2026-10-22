/**
 * 健澜科技 jlmedaios - 儿科管理 API（M782）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface PediatricPatient {
  id: string;
  inpatientNo: string;
  child: string;
  ageMonth: number;
  weightKg: number;
  diagnosis: string;
  status: string;
  growth: string;
  feeding: string;
  vaccines: { date: string; name: string; result: string }[];
  records: { date: string; action: string; outcome: string }[];
}

const DEMO: PediatricPatient[] = [
  {
    id: 'PD-001',
    inpatientNo: 'ZY-261109',
    child: '陈患儿',
    ageMonth: 18,
    weightKg: 11.5,
    diagnosis: '急性支气管肺炎',
    status: '治疗中',
    growth: '体重 P50，身高 P40，发育正常。',
    feeding: '混合喂养，已添加辅食，食欲可。',
    vaccines: [
      { date: '2026-09-01', name: '麻腮风（第 2 剂）', result: '已完成' },
    ],
    records: [
      { date: '2026-10-20', action: '头孢类抗感染 + 雾化', outcome: '体温正常，咳嗽减轻' },
    ],
  },
];

export interface PediatricListResult {
  items: PediatricPatient[];
  demo: boolean;
}

export async function fetchPediatricPatients(): Promise<PediatricListResult> {
  try {
    const res = await get<{ items: PediatricPatient[] }>('/clinical/pediatric-patients');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
