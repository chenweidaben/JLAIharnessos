/**
 * 健澜科技 jlmedaios - 疼痛科管理（M847 升级字段） API
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface PainWorkloadM847 {
  id: string;
  date: string;
  outpatient: number;
  nerveBlock: number;
  needleKnife: number;
  rf: number;
  status: string;
  typeBreakdown: { name: string; count: number }[];
  vasRecords: string;
  treatmentRecords: string;
  efficacy: string;
}

const DEMO: PainWorkloadM847[] = [
  {
    id: 'PN-847',
    date: '2026-10-22',
    outpatient: 60,
    nerveBlock: 12,
    needleKnife: 8,
    rf: 4,
    status: '正常运行',
    typeBreakdown: [
      { name: '癌痛', count: 14 },
      { name: '腰腿痛', count: 28 },
      { name: '神经痛（带状疱疹后）', count: 12 },
      { name: '头痛/其他', count: 6 },
    ],
    vasRecords: '入组 VAS 平均 7.2；治疗后 VAS 平均 3.4；VAS 下降 ≥2 分 48 例（80%）。',
    treatmentRecords: '药物治疗 60 例；神经阻滞 12 例；小针刀 8 例；射频治疗 4 例。',
    efficacy: '显效 20 例；有效 28 例；无效 12 例；总有效率 80%。',
  },
];

export interface PainWorkloadM847Result {
  items: PainWorkloadM847[];
  demo: boolean;
}

export async function fetchPainWorkloadM847(): Promise<PainWorkloadM847Result> {
  try {
    const res = await get<{ items: PainWorkloadM847[] }>('/pain/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
