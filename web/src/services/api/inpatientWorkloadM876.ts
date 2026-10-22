/**
 * 健澜科技 jlmedaios - 住院管理 API（M876）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface InpatientWorkload {
  id: string;
  date: string;
  openBeds: number;
  occupiedBeds: number;
  bedOccupancyRate: number;
  averageLOS: number;
  surgeries: number;
  status: string;
  wardBreakdown: { name: string; open: number; occupied: number }[];
  turnover: string;
  los: string;
  criticalPatients: string;
  deaths: string;
}

const DEMO: InpatientWorkload[] = [
  {
    id: 'IP-876',
    date: '2026-10-22',
    openBeds: 1200,
    occupiedBeds: 1080,
    bedOccupancyRate: 90.0,
    averageLOS: 8.5,
    surgeries: 32,
    status: '正常运行',
    wardBreakdown: [
      { name: '内科病区', open: 400, occupied: 372 },
      { name: '外科病区', open: 400, occupied: 360 },
      { name: '妇产科病区', open: 150, occupied: 135 },
      { name: '儿科病区', open: 100, occupied: 88 },
      { name: 'ICU', open: 60, occupied: 55 },
      { name: '其他病区', open: 90, occupied: 70 },
    ],
    turnover: '床位周转率：今日新入 120 / 出院 110；床位周转次数 22.5 次/年。',
    los: '平均住院日：8.5 天（目标 ≤9 天，达标）；术前平均住院日 2.3 天。',
    criticalPatients: '危重患者数：今日危重 68 例（占在院 6.3%）；特级护理 22 例。',
    deaths: '院内死亡数：今日 2 例（均为肿瘤晚期/多器官衰竭）；病死率 0.19%。',
  },
];

export interface InpatientWorkloadListResult {
  items: InpatientWorkload[];
  demo: boolean;
}

export async function fetchInpatientWorkload(): Promise<InpatientWorkloadListResult> {
  try {
    const res = await get<{ items: InpatientWorkload[] }>('/inpatient/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
