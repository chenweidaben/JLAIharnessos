/**
 * 健澜科技 jlmedaios - 超声科管理（M840 升级字段） API
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface UltrasoundWorkloadM840 {
  id: string;
  date: string;
  abdomen: number;
  cardiovascular: number;
  obstetricsGynecology: number;
  smallParts: number;
  status: string;
  typeBreakdown: { name: string; count: number; positive: number }[];
  reportTimeliness: string;
  positivity: string;
  interventional: { time: string; patient: string; procedure: string }[];
  imageQuality: string;
}

const DEMO: UltrasoundWorkloadM840[] = [
  {
    id: 'US-840',
    date: '2026-10-22',
    abdomen: 100,
    cardiovascular: 60,
    obstetricsGynecology: 80,
    smallParts: 30,
    status: '正常运行',
    typeBreakdown: [
      { name: '腹部超声', count: 100, positive: 42 },
      { name: '心血管超声', count: 60, positive: 28 },
      { name: '妇产超声', count: 80, positive: 26 },
      { name: '小器官超声', count: 30, positive: 12 },
    ],
    reportTimeliness: '常规 30min 及时率 99.2%；急诊 15min 及时率 100%。',
    positivity: '总体阳性率 40.0%；心血管 46.7%、腹部 42%、妇产 32.5%。',
    interventional: [
      { time: '10:30', patient: '华患者', procedure: '超声引导下甲状腺细针穿刺（FNA）' },
    ],
    imageQuality: '随机抽查 20 份图文报告：甲级 18 / 乙级 2 / 丙级 0。',
  },
];

export interface UltrasoundWorkloadM840Result {
  items: UltrasoundWorkloadM840[];
  demo: boolean;
}

export async function fetchUltrasoundWorkloadM840(): Promise<UltrasoundWorkloadM840Result> {
  try {
    const res = await get<{ items: UltrasoundWorkloadM840[] }>('/ultrasound/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
