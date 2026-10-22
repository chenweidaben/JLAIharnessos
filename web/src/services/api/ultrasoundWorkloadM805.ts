/**
 * 健澜科技 jlmedaios - 超声科管理 API（M805）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface UltrasoundWorkload {
  id: string;
  date: string;
  examType: string;
  studies: number;
  positive: number;
  reportSla: string;
  status: string;
  typeBreakdown: { name: string; count: number; positive: number }[];
  positivityRate: string;
  reportTimeliness: string;
  imageQuality: string;
}

const DEMO: UltrasoundWorkload[] = [
  {
    id: 'US-001',
    date: '2026-10-22',
    examType: '综合',
    studies: 240,
    positive: 96,
    reportSla: '常规 30min / 急诊 15min',
    status: '正常运行',
    typeBreakdown: [
      { name: '腹部超声', count: 100, positive: 42 },
      { name: '心血管超声', count: 60, positive: 28 },
      { name: '妇产超声', count: 80, positive: 26 },
    ],
    positivityRate: '总体阳性率 40.0%；心血管阳性率 46.7% 最高。',
    reportTimeliness: '当日已报告 238/240，及时率 99.2%。',
    imageQuality: '随机抽查 20 份图文报告，甲级 18 / 乙级 2 / 丙级 0。',
  },
];

export interface UltrasoundWorkloadListResult {
  items: UltrasoundWorkload[];
  demo: boolean;
}

export async function fetchUltrasoundWorkload(): Promise<UltrasoundWorkloadListResult> {
  try {
    const res = await get<{ items: UltrasoundWorkload[] }>('/ultrasound/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
