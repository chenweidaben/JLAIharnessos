/**
 * 健澜科技 jlmedaios - 消毒供应中心 API（M835）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface CssdWorkload {
  id: string;
  date: string;
  packages: number;
  instruments: number;
  sterilizationBatches: number;
  unqualifiedPackages: number;
  status: string;
  processBreakdown: { step: string; count: number }[];
  batchRecords: { batchNo: string; method: string; result: string }[];
  biologicMonitoring: string;
  traceability: string;
}

const DEMO: CssdWorkload[] = [
  {
    id: 'CS-001',
    date: '2026-10-22',
    packages: 420,
    instruments: 3850,
    sterilizationBatches: 18,
    unqualifiedPackages: 2,
    status: '正常运行',
    processBreakdown: [
      { step: '回收', count: 420 },
      { step: '清洗', count: 420 },
      { step: '包装', count: 418 },
      { step: '灭菌', count: 418 },
      { step: '发放', count: 418 },
    ],
    batchRecords: [
      { batchNo: 'PS-20261022-03', method: '压力蒸汽', result: '合格' },
      { batchNo: 'EO-20261022-01', method: '环氧乙烷', result: '合格' },
      { batchNo: 'LP-20261022-02', method: '低温等离子', result: '合格' },
    ],
    biologicMonitoring: 'BD 试验 18/18 合格；生物指示剂（嗜热脂肪杆菌）18/18 阴性。',
    traceability: '追溯条码 418 包全部关联至使用科室与手术患者；不合格 2 包已拦截重新处理。',
  },
];

export interface CssdWorkloadListResult {
  items: CssdWorkload[];
  demo: boolean;
}

export async function fetchCssdWorkload(): Promise<CssdWorkloadListResult> {
  try {
    const res = await get<{ items: CssdWorkload[] }>('/cssd/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
