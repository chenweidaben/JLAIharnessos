/**
 * 健澜科技 jlmedaios - 肺功能检查管理 API（M842）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface PulmonaryFunctionWorkload {
  id: string;
  date: string;
  ventilation: number;
  diffusion: number;
  bronchodilator: number;
  cardiopulmonary: number;
  status: string;
  typeBreakdown: { name: string; count: number; abnormal: number }[];
  fev1Fvc: string;
  bronchoPositive: string;
  gold: string;
  reports: string;
}

const DEMO: PulmonaryFunctionWorkload[] = [
  {
    id: 'PF-842',
    date: '2026-10-22',
    ventilation: 40,
    diffusion: 12,
    bronchodilator: 10,
    cardiopulmonary: 4,
    status: '正常运行',
    typeBreakdown: [
      { name: '通气功能', count: 40, abnormal: 18 },
      { name: '弥散功能', count: 12, abnormal: 6 },
      { name: '支气管舒张试验', count: 10, abnormal: 4 },
      { name: '运动心肺（CPET）', count: 4, abnormal: 1 },
    ],
    fev1Fvc: 'FEV1/FVC 平均 68.5%；<70% 占 45%（慢阻肺可疑）。',
    bronchoPositive: '支气管舒张试验阳性 4/10（阳性率 40%）。',
    gold: 'GOLD 1 级 8 例；GOLD 2 级 12 例；GOLD 3 级 4 例；GOLD 4 级 0 例。',
    reports: '报告及时率 100%；24h 内出具。',
  },
];

export interface PulmonaryFunctionWorkloadListResult {
  items: PulmonaryFunctionWorkload[];
  demo: boolean;
}

export async function fetchPulmonaryFunctionWorkload(): Promise<PulmonaryFunctionWorkloadListResult> {
  try {
    const res = await get<{ items: PulmonaryFunctionWorkload[] }>('/pulmonary-function/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
