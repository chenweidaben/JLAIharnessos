/**
 * 健澜科技 jlmedaios - ICU 管理（M844 升级字段） API
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface IcuWorkloadM844 {
  id: string;
  date: string;
  occupied: number;
  admitted: number;
  discharged: number;
  deaths: number;
  status: string;
  bedUsage: string;
  severityScore: string;
  invasiveProcedures: { name: string; count: number }[];
  monitoring: string;
}

const DEMO: IcuWorkloadM844[] = [
  {
    id: 'ICU-844',
    date: '2026-10-22',
    occupied: 18,
    admitted: 4,
    discharged: 3,
    deaths: 1,
    status: '满床运行',
    bedUsage: '床位数 20；在床 18；空床 2；满床率 90%。',
    severityScore: 'APACHE II 平均 18.5；SOFA 平均 7.2；高危患者（APACHE≥20）8 例。',
    invasiveProcedures: [
      { name: '气管插管/机械通气', count: 12 },
      { name: '中心静脉置管', count: 10 },
      { name: '动脉置管', count: 8 },
      { name: 'CRRT', count: 3 },
      { name: '胃管/导尿管', count: 18 },
    ],
    monitoring: '监护指标：HR 平均 88 次/分；MAP 平均 72 mmHg；SpO2 平均 96%；体温 >38.5℃ 6 例。',
  },
];

export interface IcuWorkloadM844Result {
  items: IcuWorkloadM844[];
  demo: boolean;
}

export async function fetchIcuWorkloadM844(): Promise<IcuWorkloadM844Result> {
  try {
    const res = await get<{ items: IcuWorkloadM844[] }>('/icu/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
