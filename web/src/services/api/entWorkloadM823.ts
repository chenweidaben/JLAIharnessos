/**
 * 健澜科技 jlmedaios - 耳鼻喉科管理 API（M823）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface EntWorkload {
  id: string;
  date: string;
  outpatient: number;
  surgeries: number;
  nasalEndoscopy: number;
  earEndoscopy: number;
  status: string;
  diseaseBreakdown: { name: string; count: number }[];
  surgeryRecords: string;
  hearingTest: string;
  followup: string;
}

const DEMO: EntWorkload[] = [
  {
    id: 'EN-001',
    date: '2026-10-22',
    outpatient: 130,
    surgeries: 6,
    nasalEndoscopy: 28,
    earEndoscopy: 18,
    status: '正常运行',
    diseaseBreakdown: [
      { name: '鼻炎/鼻窦炎', count: 56 },
      { name: '中耳炎', count: 24 },
      { name: '扁桃体炎', count: 22 },
      { name: '声带息肉', count: 8 },
    ],
    surgeryRecords: '鼻内镜下鼻息肉切除 2 例；扁桃体切除 2 例；声带息肉摘除 2 例。',
    hearingTest: '纯音测听 42 人次；声导抗 30 人次；感音神经性聋 8 例。',
    followup: '术后 1 周/1 月门诊复查内镜与听力。',
  },
];

export interface EntWorkloadListResult {
  items: EntWorkload[];
  demo: boolean;
}

export async function fetchEntWorkload(): Promise<EntWorkloadListResult> {
  try {
    const res = await get<{ items: EntWorkload[] }>('/ent/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
