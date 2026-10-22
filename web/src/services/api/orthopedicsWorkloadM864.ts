/**
 * 健澜科技 jlmedaios - 骨科管理 API（M864）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface OrthopedicsWorkload {
  id: string;
  date: string;
  outpatient: number;
  inpatient: number;
  surgeries: number;
  jointReplacement: number;
  spineSurgeries: number;
  status: string;
  surgeryBreakdown: { name: string; count: number }[];
  jointRecords: string;
  spineRecords: string;
  traumaRecords: string;
}

const DEMO: OrthopedicsWorkload[] = [
  {
    id: 'OR-864',
    date: '2026-10-22',
    outpatient: 280,
    inpatient: 42,
    surgeries: 22,
    jointReplacement: 6,
    spineSurgeries: 6,
    status: '正常运行',
    surgeryBreakdown: [
      { name: '关节置换（髋/膝）', count: 6 },
      { name: '脊柱手术（腰椎/颈椎）', count: 6 },
      { name: '创伤内固定（骨折）', count: 8 },
      { name: '关节镜（膝/肩）', count: 2 },
    ],
    jointRecords: '关节置换：全髋置换 4 例（THA）；全膝置换 2 例（TKA）。',
    spineRecords: '脊柱手术：腰椎减压融合（PLIF/TLIF）4 例；颈椎前路（ACDF）2 例。',
    traumaRecords: '创伤手术：锁骨/桡骨/胫骨骨折内固定 8 例；闭合复位 12 例。',
  },
];

export interface OrthopedicsWorkloadListResult {
  items: OrthopedicsWorkload[];
  demo: boolean;
}

export async function fetchOrthopedicsWorkload(): Promise<OrthopedicsWorkloadListResult> {
  try {
    const res = await get<{ items: OrthopedicsWorkload[] }>('/orthopedics/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
