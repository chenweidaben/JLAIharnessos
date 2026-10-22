/**
 * 健澜科技 jlmedaios - 药房库存管理 API（M687）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type StockStatus = 'normal' | 'low' | 'expiring' | 'expired';

export interface PharmacyStock {
  id: string;
  drugName: string;
  spec: string;
  batchNo: string;
  quantity: number;
  unit: string;
  expiryDate: string;
  status: StockStatus;
}

export const STOCK_STATUS_META: Record<StockStatus, { label: string; color: string }> = {
  normal: { label: '正常', color: 'green' },
  low: { label: '低库存', color: 'red' },
  expiring: { label: '近效期', color: 'orange' },
  expired: { label: '已过期', color: 'default' },
};

const DEMO: PharmacyStock[] = [
  { id: 'STK-001', drugName: '阿莫西林胶囊', spec: '0.25g×24s', batchNo: 'B20250901', quantity: 1200, unit: '盒', expiryDate: '2027-08-31', status: 'normal' },
  { id: 'STK-002', drugName: '头孢哌酮舒巴坦', spec: '3.0g/瓶', batchNo: 'B20250815', quantity: 18, unit: '瓶', expiryDate: '2026-12-31', status: 'low' },
  { id: 'STK-003', drugName: '莫西沙星注射液', spec: '0.4g/250ml', batchNo: 'B20241101', quantity: 80, unit: '瓶', expiryDate: '2026-12-01', status: 'expiring' },
  { id: 'STK-004', drugName: '生理盐水', spec: '500ml/瓶', batchNo: 'B20240101', quantity: 500, unit: '瓶', expiryDate: '2026-06-30', status: 'expired' },
];

export interface StockListResult {
  items: PharmacyStock[];
  demo: boolean;
}

export async function fetchPharmacyInventory(): Promise<StockListResult> {
  try {
    const res = await get<{ items: PharmacyStock[] }>('/pharmacy/inventory');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
