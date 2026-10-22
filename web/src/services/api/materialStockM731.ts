/**
 * 健澜科技 jlmedaios - 耗材库存管理 API（M731）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type StockStatus = 'normal' | 'low' | 'expiring' | 'expired';

export interface MaterialStock {
  id: string;
  code: string;
  name: string;
  spec: string;
  qty: number;
  expiryDate: string;
  status: StockStatus;
  unitPrice: number;
  supplier: string;
  movements: { date: string; type: string; qty: number }[];
}

export const STOCK_STATUS_META: Record<StockStatus, { label: string; color: string }> = {
  normal: { label: '正常', color: 'green' },
  low: { label: '低库存', color: 'orange' },
  expiring: { label: '近效期', color: 'volcano' },
  expired: { label: '已过期', color: 'red' },
};

const DEMO: MaterialStock[] = [
  {
    id: 'MS-001',
    code: 'MAT-001001',
    name: '一次性使用静脉留置针',
    spec: '24G × 0.75in',
    qty: 1200,
    expiryDate: '2027-06-30',
    status: 'normal',
    unitPrice: 3.5,
    supplier: '山东威高集团',
    movements: [
      { date: '2026-10-20', type: '入库', qty: 2000 },
      { date: '2026-10-22', type: '出库', qty: 800 },
    ],
  },
  {
    id: 'MS-002',
    code: 'MAT-001002',
    name: '一次性使用注射器',
    spec: '5ml',
    qty: 180,
    expiryDate: '2026-12-15',
    status: 'low',
    unitPrice: 0.35,
    supplier: '江苏鱼跃医疗',
    movements: [
      { date: '2026-10-21', type: '出库', qty: 500 },
    ],
  },
];

export interface StockListResult {
  items: MaterialStock[];
  demo: boolean;
}

export async function fetchMaterialInventory(): Promise<StockListResult> {
  try {
    const res = await get<{ items: MaterialStock[] }>('/materials/inventory');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
