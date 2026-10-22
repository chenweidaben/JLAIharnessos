/**
 * 健澜科技 jlmedaios - 医疗服务价格管理 API（M727）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type PriceStatus = 'active' | 'suspended' | 'pending';
export type InsuranceCategory = '甲类' | '乙类' | '丙类';

export interface ServicePriceItem {
  id: string;
  code: string;
  name: string;
  price: number;
  unit: string;
  status: PriceStatus;
  insuranceCategory: InsuranceCategory;
  description: string;
  priceHistory: { date: string; price: string }[];
}

export const PRICE_STATUS_META: Record<PriceStatus, { label: string; color: string }> = {
  active: { label: '执行中', color: 'green' },
  suspended: { label: '暂停', color: 'red' },
  pending: { label: '待生效', color: 'orange' },
};

const DEMO: ServicePriceItem[] = [
  {
    id: 'PI-001',
    code: '110100001',
    name: '普通门诊诊查费',
    price: 25,
    unit: '次',
    status: 'active',
    insuranceCategory: '甲类',
    description: '普通门诊主任医师以下医师诊查。',
    priceHistory: [
      { date: '2024-06-01', price: '20 元' },
      { date: '2026-01-01', price: '25 元' },
    ],
  },
  {
    id: 'PI-002',
    code: '120400002',
    name: '胸部 CT 平扫',
    price: 180,
    unit: '部位',
    status: 'active',
    insuranceCategory: '乙类',
    description: '胸部 X 线计算机体层成像平扫。',
    priceHistory: [
      { date: '2024-06-01', price: '200 元' },
      { date: '2026-01-01', price: '180 元' },
    ],
  },
];

export interface PriceListResult {
  items: ServicePriceItem[];
  demo: boolean;
}

export async function fetchServicePriceItems(): Promise<PriceListResult> {
  try {
    const res = await get<{ items: ServicePriceItem[] }>('/pricing/service-items');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
