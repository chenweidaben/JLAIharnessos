/**
 * 健澜科技 jlmedaios - 妇科管理 API（M819）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface GynecologyWorkload {
  id: string;
  date: string;
  outpatient: number;
  inpatient: number;
  surgeries: number;
  laparoscopic: number;
  status: string;
  surgeryBreakdown: { name: string; count: number }[];
  pathology: string;
  followup: string;
}

const DEMO: GynecologyWorkload[] = [
  {
    id: 'GY-001',
    date: '2026-10-22',
    outpatient: 186,
    inpatient: 24,
    surgeries: 10,
    laparoscopic: 6,
    status: '正常运行',
    surgeryBreakdown: [
      { name: '腹腔镜下子宫肌瘤剔除', count: 3 },
      { name: '腹腔镜下卵巢囊肿剥除', count: 3 },
      { name: '经腹全子宫切除', count: 2 },
      { name: '宫腔镜下息肉切除', count: 2 },
    ],
    pathology: '子宫肌瘤 3 例（平滑肌瘤）；卵巢囊肿 3 例（浆液性囊腺瘤 2 / 巧囊 1）；子宫内膜息肉 2 例。',
    followup: '术后 1 周门诊复诊；1 月/3 月复查超声与病理结果。',
  },
];

export interface GynecologyWorkloadListResult {
  items: GynecologyWorkload[];
  demo: boolean;
}

export async function fetchGynecologyWorkload(): Promise<GynecologyWorkloadListResult> {
  try {
    const res = await get<{ items: GynecologyWorkload[] }>('/gynecology/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
