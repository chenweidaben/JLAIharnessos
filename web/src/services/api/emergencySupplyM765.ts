/**
 * 健澜科技 jlmedaios - 应急物资储备管理 API（M765）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type SupplyStatus = 'normal' | 'low' | 'expiring' | 'expired';

export interface EmergencySupply {
  id: string;
  code: string;
  name: string;
  spec: string;
  qty: number;
  expiryDate: string;
  status: SupplyStatus;
  movements: { date: string; type: string; qty: number }[];
  warning: string;
}

export const SUPPLY_STATUS_META: Record<SupplyStatus, { label: string; color: string }> = {
  normal: { label: '正常', color: 'green' },
  low: { label: '低库存', color: 'orange' },
  expiring: { label: '近效期', color: 'volcano' },
  expired: { label: '已过期', color: 'red' },
};

const DEMO: EmergencySupply[] = [
  {
    id: 'ES-001',
    code: 'EM-001',
    name: '医用防护口罩（N95）',
    spec: '盒（20 只）',
    qty: 5000,
    expiryDate: '2027-06-30',
    status: 'normal',
    movements: [
      { date: '2026-10-01', type: '入库', qty: 2000 },
      { date: '2026-10-15', type: '出库', qty: 500 },
    ],
    warning: '安全库存 3000 盒，当前库存充足。',
  },
];

export interface SupplyListResult {
  items: EmergencySupply[];
  demo: boolean;
}

export async function fetchEmergencySupplies(): Promise<SupplyListResult> {
  try {
    const res = await get<{ items: EmergencySupply[] }>('/public-health/emergency-supplies');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
