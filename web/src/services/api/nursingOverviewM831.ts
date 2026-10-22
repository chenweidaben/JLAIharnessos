/**
 * 健澜科技 jlmedaios - 护理管理驾驶舱 API（M831）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface NursingOverview {
  id: string;
  nurses: number;
  bedNurseRatio: number;
  adverseEventRate: number;
  fallRate: number;
  qualityTrend: { date: string; score: number }[];
  deptRanking: { name: string; score: number }[];
  trainingCompletion: number;
}

const DEMO: NursingOverview[] = [
  {
    id: 'NU-001',
    nurses: 860,
    bedNurseRatio: 0.42,
    adverseEventRate: 0.35,
    fallRate: 0.18,
    qualityTrend: [
      { date: '09-23', score: 94.5 },
      { date: '09-30', score: 95.0 },
      { date: '10-07', score: 95.3 },
      { date: '10-14', score: 95.8 },
      { date: '10-21', score: 96.2 },
    ],
    deptRanking: [
      { name: 'ICU', score: 98.5 },
      { name: '心内科', score: 97.2 },
      { name: '普外科', score: 96.8 },
      { name: '骨科', score: 96.0 },
      { name: '妇产科', score: 95.5 },
    ],
    trainingCompletion: 92.5,
  },
];

export interface NursingOverviewResult {
  items: NursingOverview[];
  demo: boolean;
}

export async function fetchNursingOverview(): Promise<NursingOverviewResult> {
  try {
    const res = await get<{ items: NursingOverview[] }>('/dashboard/nursing-overview');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
