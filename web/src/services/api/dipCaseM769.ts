/**
 * 健澜科技 jlmedaios - DIP 分组管理 API（M769）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface DipCase {
  id: string;
  inpatientNo: string;
  patient: string;
  mainDisease: string;
  score: number;
  cost: number;
  profit: number;
  diseases: string[];
  treatment: string;
  groupingProcess: string;
  costBreakdown: { item: string; amount: number }[];
}

const DEMO: DipCase[] = [
  {
    id: 'DP-001',
    inpatientNo: 'ZY-261002',
    patient: '李患者',
    mainDisease: '2 型糖尿病',
    score: 850,
    cost: 9800,
    profit: -300,
    diseases: ['2 型糖尿病', '糖尿病肾病'],
    treatment: '药物保守治疗',
    groupingProcess: '主病种 2 型糖尿病 + 治疗方式 保守治疗 → DIP 病种分值 850。',
    costBreakdown: [
      { item: '药品费', amount: 3200 },
      { item: '检查费', amount: 2800 },
      { item: '治疗费', amount: 2500 },
    ],
  },
];

export interface DipListResult {
  items: DipCase[];
  demo: boolean;
}

export async function fetchDipCases(): Promise<DipListResult> {
  try {
    const res = await get<{ items: DipCase[] }>('/insurance/dip-cases');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
