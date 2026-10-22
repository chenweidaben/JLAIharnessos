/**
 * 健澜科技 jlmedaios - 运营管理驾驶舱 API（M830）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface OperationsOverview {
  id: string;
  revenue: number;
  drugRatio: number;
  consumableRatio: number;
  insuranceDenyRate: number;
  monthlyTrend: { month: string; revenue: number }[];
  deptRanking: { name: string; revenue: number }[];
  costStructure: { item: string; ratio: number }[];
}

const DEMO: OperationsOverview[] = [
  {
    id: 'OP-001',
    revenue: 48200,
    drugRatio: 28.5,
    consumableRatio: 18.2,
    insuranceDenyRate: 0.85,
    monthlyTrend: [
      { month: '2025-11', revenue: 38500 },
      { month: '2025-12', revenue: 42200 },
      { month: '2026-01', revenue: 39800 },
      { month: '2026-02', revenue: 36500 },
      { month: '2026-03', revenue: 41200 },
      { month: '2026-04', revenue: 43500 },
      { month: '2026-05', revenue: 44800 },
      { month: '2026-06', revenue: 46200 },
      { month: '2026-07', revenue: 45500 },
      { month: '2026-08', revenue: 47200 },
      { month: '2026-09', revenue: 48000 },
      { month: '2026-10', revenue: 48200 },
    ],
    deptRanking: [
      { name: '心内科', revenue: 5800 },
      { name: '骨科', revenue: 5200 },
      { name: '神经外科', revenue: 4800 },
      { name: '普外科', revenue: 4200 },
      { name: '妇产科', revenue: 3800 },
    ],
    costStructure: [
      { item: '人员经费', ratio: 42 },
      { item: '药品', ratio: 28.5 },
      { item: '卫生耗材', ratio: 18.2 },
      { item: '设备折旧', ratio: 6.5 },
      { item: '其它', ratio: 4.8 },
    ],
  },
];

export interface OperationsOverviewResult {
  items: OperationsOverview[];
  demo: boolean;
}

export async function fetchOperationsOverview(): Promise<OperationsOverviewResult> {
  try {
    const res = await get<{ items: OperationsOverview[] }>('/dashboard/operations-overview');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
