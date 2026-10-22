/**
 * 健澜科技 jlmedaios - CSSD 管理（M879 升级字段） API
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface CssdWorkloadM879 {
  id: string;
  date: string;
  received: number;
  cleaned: number;
  packed: number;
  sterilized: number;
  distributed: number;
  status: string;
  categoryBreakdown: { name: string; count: number }[];
  sterilizationBreakdown: { name: string; count: number }[];
  biologicMonitoring: string;
  traceability: string;
}

const DEMO: CssdWorkloadM879[] = [
  {
    id: 'CSSD-879',
    date: '2026-10-22',
    received: 320,
    cleaned: 318,
    packed: 316,
    sterilized: 315,
    distributed: 312,
    status: '正常运行',
    categoryBreakdown: [
      { name: '手术器械包', count: 180 },
      { name: '内镜器械', count: 12 },
      { name: '牙科器械', count: 30 },
      { name: '换药碗/治疗盘', count: 98 },
    ],
    sterilizationBreakdown: [
      { name: '压力蒸汽灭菌', count: 280 },
      { name: '环氧乙烷（EO）', count: 20 },
      { name: '低温等离子（PLASMA）', count: 15 },
    ],
    biologicMonitoring: '生物监测：BI 阴性合格 18/18 批次；PCD 挑战测试 100% 合格；B-D 试验每日 1 次合格。',
    traceability: '追溯记录：条码追溯覆盖率 100%；今日追溯查询 6 次（均为术后感染回溯）；不合格包 1 件（湿包，已返工）。',
  },
];

export interface CssdWorkloadM879Result {
  items: CssdWorkloadM879[];
  demo: boolean;
}

export async function fetchCssdWorkloadM879(): Promise<CssdWorkloadM879Result> {
  try {
    const res = await get<{ items: CssdWorkloadM879[] }>('/cssd/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
