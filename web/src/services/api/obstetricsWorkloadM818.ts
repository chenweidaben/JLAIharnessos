/**
 * 健澜科技 jlmedaios - 产科管理 API（M818）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface ObstetricsWorkload {
  id: string;
  date: string;
  deliveries: number;
  vaginal: number;
  cesarean: number;
  episiotomy: number;
  status: string;
  modeBreakdown: { name: string; count: number }[];
  apgar: string;
  postpartumHemorrhage: string;
  asphyxiaResus: { time: string; baby: string; apgar1: number; action: string }[];
}

const DEMO: ObstetricsWorkload[] = [
  {
    id: 'OB-001',
    date: '2026-10-22',
    deliveries: 12,
    vaginal: 8,
    cesarean: 4,
    episiotomy: 3,
    status: '正常运行',
    modeBreakdown: [
      { name: '顺产（含侧切/无侧切）', count: 8 },
      { name: '剖宫产', count: 4 },
    ],
    apgar: '1 分钟 Apgar ≥8 分 11 例；4-7 分 1 例；<4 分 0 例。',
    postpartumHemorrhage: '产后出血（>500mL）2 例；均经宫缩剂 + 按摩纠正，未输血。',
    asphyxiaResus: [
      { time: '03:20', baby: '男婴 3200g', apgar1: 5, action: '清理呼吸道 + 正压通气 30s，5 分钟 Apgar 9 分' },
    ],
  },
];

export interface ObstetricsWorkloadListResult {
  items: ObstetricsWorkload[];
  demo: boolean;
}

export async function fetchObstetricsWorkload(): Promise<ObstetricsWorkloadListResult> {
  try {
    const res = await get<{ items: ObstetricsWorkload[] }>('/obstetrics/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
