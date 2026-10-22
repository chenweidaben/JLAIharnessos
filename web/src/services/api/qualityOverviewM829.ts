/**
 * 健澜科技 jlmedaios - 医疗质量驾驶舱 API（M829）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface QualityOverview {
  id: string;
  gradeAChart: number;
  round3WardRound: number;
  criticalValueTimely: number;
  infectionRate: number;
  trend: { date: string; score: number }[];
  topDepartments: { name: string; score: number }[];
  bottomDepartments: { name: string; score: number }[];
  adverseEvents: { type: string; count: number }[];
}

const DEMO: QualityOverview[] = [
  {
    id: 'MQ-001',
    gradeAChart: 96.8,
    round3WardRound: 98.5,
    criticalValueTimely: 99.2,
    infectionRate: 1.85,
    trend: [
      { date: '09-23', score: 94.2 },
      { date: '09-30', score: 94.8 },
      { date: '10-07', score: 95.1 },
      { date: '10-14', score: 95.6 },
      { date: '10-21', score: 96.0 },
    ],
    topDepartments: [
      { name: '心内科', score: 97.8 },
      { name: '神经外科', score: 97.2 },
      { name: '骨科', score: 96.9 },
      { name: '普外科', score: 96.5 },
      { name: '妇产科', score: 96.2 },
    ],
    bottomDepartments: [
      { name: '皮肤科', score: 89.2 },
      { name: '眼科', score: 90.5 },
      { name: '耳鼻喉科', score: 91.8 },
    ],
    adverseEvents: [
      { type: '跌倒', count: 4 },
      { type: '压疮', count: 2 },
      { type: '用药错误', count: 1 },
      { type: '输血反应', count: 0 },
    ],
  },
];

export interface QualityOverviewResult {
  items: QualityOverview[];
  demo: boolean;
}

export async function fetchQualityOverview(): Promise<QualityOverviewResult> {
  try {
    const res = await get<{ items: QualityOverview[] }>('/dashboard/quality-overview');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
