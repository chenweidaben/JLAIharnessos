/**
 * 健澜科技 jlmedaios - 肺功能室管理 API（M812）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface PulmonaryFunctionWorkload {
  id: string;
  date: string;
  examType: string;
  studies: number;
  abnormal: number;
  status: string;
  typeBreakdown: { name: string; count: number; abnormal: number }[];
  fev1FvcRatio: string;
  diagnosis: string;
}

const DEMO: PulmonaryFunctionWorkload[] = [
  {
    id: 'PF-001',
    date: '2026-10-22',
    examType: '综合',
    studies: 42,
    abnormal: 18,
    status: '正常运行',
    typeBreakdown: [
      { name: '通气功能', count: 24, abnormal: 10 },
      { name: '弥散功能', count: 12, abnormal: 5 },
      { name: '支气管激发试验', count: 6, abnormal: 3 },
    ],
    fev1FvcRatio: '异常组平均 FEV1/FVC 62%；重度阻塞 4 例。',
    diagnosis: 'COPD 10 例、哮喘 4 例、间质性肺病 3 例、其它 1 例。',
  },
];

export interface PulmonaryFunctionListResult {
  items: PulmonaryFunctionWorkload[];
  demo: boolean;
}

export async function fetchPulmonaryFunctionWorkload(): Promise<PulmonaryFunctionListResult> {
  try {
    const res = await get<{ items: PulmonaryFunctionWorkload[] }>('/pulmonary/function-workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
