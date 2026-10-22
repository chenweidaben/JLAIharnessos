/**
 * 健澜科技 jlmedaios - 检验科管理 API（M803）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface LabWorkload {
  id: string;
  date: string;
  section: string;
  specimens: number;
  qualified: number;
  unqualified: number;
  status: string;
  itemsBreakdown: { item: string; count: number }[];
  unqualifiedReasons: { reason: string; count: number }[];
  qcRecords: string;
  equipment: string;
}

const DEMO: LabWorkload[] = [
  {
    id: 'LB-001',
    date: '2026-10-22',
    section: '生化免疫组',
    specimens: 1850,
    qualified: 1822,
    unqualified: 28,
    status: '正常运行',
    itemsBreakdown: [
      { item: '生化常规', count: 980 },
      { item: '免疫发光', count: 520 },
      { item: '特种蛋白', count: 350 },
    ],
    unqualifiedReasons: [
      { reason: '标本溶血', count: 15 },
      { reason: '标本凝块', count: 8 },
      { reason: '量不足', count: 5 },
    ],
    qcRecords: '室内质控：生化项目 CV 均 <2%；室间质评：本月 PT 100%。',
    equipment: '7600-020 生化仪运行正常；ARCHITECT i2000SR 发光仪待保养。',
  },
];

export interface LabWorkloadListResult {
  items: LabWorkload[];
  demo: boolean;
}

export async function fetchLabWorkload(): Promise<LabWorkloadListResult> {
  try {
    const res = await get<{ items: LabWorkload[] }>('/lab/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
