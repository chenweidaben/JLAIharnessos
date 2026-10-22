/**
 * 健澜科技 jlmedaios - 口腔科管理 API（M854）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface DentistryWorkload {
  id: string;
  date: string;
  outpatient: number;
  filling: number;
  extraction: number;
  implant: number;
  orthodontics: number;
  status: string;
  treatmentBreakdown: { name: string; count: number }[];
  implantRecords: string;
  orthoRecords: string;
  oralSurgery: string;
  pedoDentistry: string;
}

const DEMO: DentistryWorkload[] = [
  {
    id: 'DT-854',
    date: '2026-10-22',
    outpatient: 140,
    filling: 42,
    extraction: 28,
    implant: 6,
    orthodontics: 12,
    status: '正常运行',
    treatmentBreakdown: [
      { name: '补牙（充填）', count: 42 },
      { name: '拔牙', count: 28 },
      { name: '根管治疗', count: 18 },
      { name: '洗牙/牙周', count: 32 },
      { name: '修复（冠/桥）', count: 12 },
      { name: '正畸', count: 12 },
    ],
    implantRecords: '种植牙记录：ITI 种植 4 颗；Nobel 种植 2 颗；上颌窦提升 1 例。',
    orthoRecords: '正畸记录：固定矫治（金属托槽）6 例；隐形矫治（Invisalign）4 例；保持器 2 例。',
    oralSurgery: '口腔颌面外科手术：阻生齿拔除 8 例；颌骨囊肿 1 例；涎腺手术 0 例。',
    pedoDentistry: '儿童牙病：乳牙充填 12 例；窝沟封闭 24 颗；早期矫治 2 例。',
  },
];

export interface DentistryWorkloadListResult {
  items: DentistryWorkload[];
  demo: boolean;
}

export async function fetchDentistryWorkload(): Promise<DentistryWorkloadListResult> {
  try {
    const res = await get<{ items: DentistryWorkload[] }>('/dentistry/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
