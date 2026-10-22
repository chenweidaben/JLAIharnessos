/**
 * 健澜科技 jlmedaios - 康复科管理（M846 升级字段） API
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface RehabilitationWorkloadM846 {
  id: string;
  date: string;
  assessments: number;
  pt: number;
  ot: number;
  st: number;
  status: string;
  typeBreakdown: { name: string; count: number }[];
  functionalScores: string;
  treatmentRecords: string;
  efficacy: string;
}

const DEMO: RehabilitationWorkloadM846[] = [
  {
    id: 'RH-846',
    date: '2026-10-22',
    assessments: 18,
    pt: 60,
    ot: 24,
    st: 12,
    status: '正常运行',
    typeBreakdown: [
      { name: '物理治疗（PT）', count: 60 },
      { name: '作业治疗（OT）', count: 24 },
      { name: '言语治疗（ST）', count: 12 },
      { name: '康复工程/支具', count: 6 },
    ],
    functionalScores: 'FIM 平均 72.5（↑6.2 vs 入组）；Barthel 平均 65（↑8）；Fugl-Meyer 平均 52（↑10）。',
    treatmentRecords: '关节活动度训练 42 例；肌力训练 36 例；平衡/步态训练 28 例；吞咽训练 8 例。',
    efficacy: '显效 12 例；有效 20 例；无效 2 例；总有效率 94.1%。',
  },
];

export interface RehabilitationWorkloadM846Result {
  items: RehabilitationWorkloadM846[];
  demo: boolean;
}

export async function fetchRehabilitationWorkloadM846(): Promise<RehabilitationWorkloadM846Result> {
  try {
    const res = await get<{ items: RehabilitationWorkloadM846[] }>('/rehabilitation/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
