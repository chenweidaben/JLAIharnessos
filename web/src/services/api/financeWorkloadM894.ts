/**
 * 健澜科技 jlmedaios - 财务管理 API（M894）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface FinanceWorkload {
  id: string;
  date: string;
  outpatientRevenue: number;
  inpatientRevenue: number;
  drugRevenue: number;
  examRevenue: number;
  totalCost: number;
  status: string;
  revenueBreakdown: { name: string; amount: number }[];
  costBreakdown: { name: string; amount: number }[];
  insuranceReimbursement: string;
  budgetExecution: string;
  debtRatio: string;
}

const DEMO: FinanceWorkload[] = [
  {
    id: 'FN-894',
    date: '2026-10-22',
    outpatientRevenue: 280,
    inpatientRevenue: 520,
    drugRevenue: 240,
    examRevenue: 180,
    totalCost: 680,
    status: '正常运行',
    revenueBreakdown: [
      { name: '门诊收入', amount: 280 },
      { name: '住院收入', amount: 520 },
      { name: '药品收入', amount: 240 },
      { name: '检查收入', amount: 180 },
      { name: '治疗收入', amount: 80 },
    ],
    costBreakdown: [
      { name: '人力成本', amount: 320 },
      { name: '耗材成本', amount: 180 },
      { name: '设备折旧', amount: 80 },
      { name: '后勤运行', amount: 100 },
    ],
    insuranceReimbursement: '医保回款：本月医保应收 4800 万；已回款 4200 万（87.5%）；逾期 600 万（主要 DRG 拒付）。',
    budgetExecution: '预算执行率：年度预算 6.5 亿；累计执行 4.8 亿（73.8%）；门诊预算结余 2.3%。',
    debtRatio: '资产负债率：42%（行业警戒线 50%，安全）；流动比率 1.8；速动比率 1.2。',
  },
];

export interface FinanceWorkloadListResult {
  items: FinanceWorkload[];
  demo: boolean;
}

export async function fetchFinanceWorkload(): Promise<FinanceWorkloadListResult> {
  try {
    const res = await get<{ items: FinanceWorkload[] }>('/finance/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
