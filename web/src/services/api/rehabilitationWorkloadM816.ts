/**
 * 健澜科技 jlmedaios - 康复科管理 API（M816）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface RehabilitationWorkload {
  id: string;
  date: string;
  sessions: number;
  pt: number;
  ot: number;
  st: number;
  status: string;
  typeBreakdown: { name: string; count: number }[];
  functional: string;
  plan: string;
  outcome: string;
}

const DEMO: RehabilitationWorkload[] = [
  {
    id: 'RE-001',
    date: '2026-10-22',
    sessions: 186,
    pt: 100,
    ot: 56,
    st: 30,
    status: '正常运行',
    typeBreakdown: [
      { name: '物理治疗（PT）', count: 100 },
      { name: '作业治疗（OT）', count: 56 },
      { name: '言语治疗（ST）', count: 30 },
    ],
    functional: '在治患者 FIM 平均 72 分；Barthel 指数平均 55 分（入院时 38 分）。',
    plan: '卒中后偏瘫：下肢肌力训练 + 平衡训练 + 作业治疗；目标 4 周内独立步行。',
    outcome: '本周 6 例患者 FIM 提升 ≥10 分；2 例达到出院标准。',
  },
];

export interface RehabilitationWorkloadListResult {
  items: RehabilitationWorkload[];
  demo: boolean;
}

export async function fetchRehabilitationWorkload(): Promise<RehabilitationWorkloadListResult> {
  try {
    const res = await get<{ items: RehabilitationWorkload[] }>('/rehabilitation/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
