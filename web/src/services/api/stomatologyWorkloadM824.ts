/**
 * 健澜科技 jlmedaios - 口腔科管理 API（M824）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface StomatologyWorkload {
  id: string;
  date: string;
  outpatient: number;
  fillings: number;
  extractions: number;
  rootCanal: number;
  status: string;
  treatmentBreakdown: { name: string; count: number }[];
  periodontal: string;
  imaging: string;
  prosthesis: string;
  followup: string;
}

const DEMO: StomatologyWorkload[] = [
  {
    id: 'ST-001',
    date: '2026-10-22',
    outpatient: 140,
    fillings: 32,
    extractions: 14,
    rootCanal: 18,
    status: '正常运行',
    treatmentBreakdown: [
      { name: '补牙（充填）', count: 32 },
      { name: '拔牙', count: 14 },
      { name: '根管治疗', count: 18 },
      { name: '牙周洁治', count: 26 },
      { name: '义齿修复', count: 8 },
    ],
    periodontal: '牙周检查 40 人次；牙周炎 22 例（轻度 14 / 中度 8）。',
    imaging: '根尖片 30 张；全景片 12 张；CBCT 4 例。',
    prosthesis: '烤瓷冠 4 例；活动义齿 3 例；种植 1 例。',
    followup: '根管治疗 1 周后复查；修复 3 月/6 月复诊。',
  },
];

export interface StomatologyWorkloadListResult {
  items: StomatologyWorkload[];
  demo: boolean;
}

export async function fetchStomatologyWorkload(): Promise<StomatologyWorkloadListResult> {
  try {
    const res = await get<{ items: StomatologyWorkload[] }>('/stomatology/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
