/**
 * 健澜科技 jlmedaios - 院长驾驶舱 API（M828）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface HospitalOverview {
  id: string;
  todayOutpatient: number;
  inpatients: number;
  todaySurgeries: number;
  bedOccupancy: number;
  outpatientTrend: { date: string; count: number }[];
  avgLodDays: number;
  avgCost: number;
  satisfaction: number;
  todos: { type: string; count: number; urgent: number }[];
}

const DEMO: HospitalOverview[] = [
  {
    id: 'HOD-001',
    todayOutpatient: 2480,
    inpatients: 1280,
    todaySurgeries: 68,
    bedOccupancy: 92.5,
    outpatientTrend: [
      { date: '10-16', count: 2280 },
      { date: '10-17', count: 2310 },
      { date: '10-18', count: 2150 },
      { date: '10-19', count: 2390 },
      { date: '10-20', count: 2420 },
      { date: '10-21', count: 2350 },
      { date: '10-22', count: 2480 },
    ],
    avgLodDays: 8.6,
    avgCost: 12580,
    satisfaction: 96.2,
    todos: [
      { type: '待审批', count: 12, urgent: 3 },
      { type: '危急值', count: 5, urgent: 5 },
      { type: '投诉', count: 2, urgent: 1 },
    ],
  },
];

export interface HospitalOverviewResult {
  items: HospitalOverview[];
  demo: boolean;
}

export async function fetchHospitalOverview(): Promise<HospitalOverviewResult> {
  try {
    const res = await get<{ items: HospitalOverview[] }>('/dashboard/hospital-overview');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
