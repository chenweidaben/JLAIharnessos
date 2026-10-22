/**
 * 健澜科技 jlmedaios - 超声科管理（M870 升级字段） API
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface UltrasoundWorkloadM870 {
  id: string;
  date: string;
  abdomen: number;
  cardiovascular: number;
  obstetricsGynecology: number;
  interventional: number;
  status: string;
  categoryBreakdown: { name: string; count: number; positive: number }[];
  statBedside: string;
  biopsyRecords: string;
  positivity: string;
}

const DEMO: UltrasoundWorkloadM870[] = [
  {
    id: 'US-870',
    date: '2026-10-22',
    abdomen: 100,
    cardiovascular: 60,
    obstetricsGynecology: 80,
    interventional: 8,
    status: '正常运行',
    categoryBreakdown: [
      { name: '腹部超声', count: 100, positive: 42 },
      { name: '心血管超声', count: 60, positive: 28 },
      { name: '妇产超声', count: 80, positive: 26 },
      { name: '浅表（甲状腺/乳腺）', count: 30, positive: 12 },
      { name: '介入超声', count: 8, positive: 8 },
    ],
    statBedside: '急诊床旁超声（POCUS）：12 例（创伤 FAST 4 / 心功能评估 4 / 肺水 4）；平均响应时间 8min。',
    biopsyRecords: '超声引导下穿刺：甲状腺 FNA 4 例；肝穿刺 2 例；肾囊肿穿刺硬化 2 例。',
    positivity: '报告阳性率：腹部 42%；心血管 46.7%；妇产 32.5%；浅表 40%。',
  },
];

export interface UltrasoundWorkloadM870Result {
  items: UltrasoundWorkloadM870[];
  demo: boolean;
}

export async function fetchUltrasoundWorkloadM870(): Promise<UltrasoundWorkloadM870Result> {
  try {
    const res = await get<{ items: UltrasoundWorkloadM870[] }>('/ultrasound/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
