/**
 * 健澜科技 jlmedaios - 物资管理 API（M896）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface MaterialsWorkload {
  id: string;
  date: string;
  inboundBatches: number;
  outboundBatches: number;
  inventoryAmount: number;
  lowStock: number;
  expired: number;
  status: string;
  categoryBreakdown: { name: string; amount: number }[];
  turnover: string;
  lowStockAlert: string;
  highValueTraceability: string;
  supplierEvaluation: string;
}

const DEMO: MaterialsWorkload[] = [
  {
    id: 'MT-896',
    date: '2026-10-22',
    inboundBatches: 24,
    outboundBatches: 48,
    inventoryAmount: 680,
    lowStock: 8,
    expired: 0,
    status: '正常运行',
    categoryBreakdown: [
      { name: '医用耗材', amount: 480 },
      { name: '办公用品', amount: 40 },
      { name: '被服类', amount: 60 },
      { name: '消毒用品', amount: 100 },
    ],
    turnover: '库存周转率：本月 3.2 次/月（目标 ≥3 次）；库存周转天数 9.4 天。',
    lowStockAlert: '低库存预警：8 项（注射器/输液器/纱布/手套等）；已自动生成补货申请。',
    highValueTraceability: '高值耗材追溯：本月高值耗材（支架/关节/起搏器）使用 42 件；UDI 追溯率 100%；一物一码全覆盖。',
    supplierEvaluation: '供应商评价：本月考核 24 家供应商；A 级 18 家；B 级 5 家；C 级 1 家（限期整改）；淘汰 0 家。',
  },
];

export interface MaterialsWorkloadListResult {
  items: MaterialsWorkload[];
  demo: boolean;
}

export async function fetchMaterialsWorkload(): Promise<MaterialsWorkloadListResult> {
  try {
    const res = await get<{ items: MaterialsWorkload[] }>('/materials/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
