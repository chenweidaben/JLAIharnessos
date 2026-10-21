/**
 * 健澜科技 jlmedaios - 药品库存管理 API（M610，P0）
 *
 * 注：drugInventory.ts（库存预警）为既有模块，本文件按 M610 独立命名避让。
 *
 * 对接真实 BFF：
 *   GET  /api/v1/pharmacy/inventory             库存列表（m200：{drugs:[{name,spec,stock,price,batch,expiry,status}], totalCount}）
 *   GET  /api/v1/pharmacy/inventory/:drugId/stock 单药批次库存（兜底降级）
 *   POST /api/v1/pharmacy/inventory/receive     入库（m598：batchNumber 唯一，重复 → 409）
 *
 * GET 类失败降级本地 DEMO 镜像并打标 demo:true；写接口失败抛后端 message，不吞错。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

export interface DrugInventoryItem {
  drugId?: string;
  name: string;
  spec: string;
  stock: number;
  price: number;
  batch: string;
  expiry: string;
  status: '正常' | '偏低' | '偏高';
}

export interface DrugStockDetail {
  drugId: string;
  batches: Array<{ batchNumber: string; quantity: number; expiryDate: string }>;
}

export interface ReceiveInput {
  drugName: string;
  spec: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  unitPrice: number;
}

export const INVENTORY_STATUS_META: Record<DrugInventoryItem['status'], { label: string; color: string }> = {
  正常: { label: '正常', color: 'green' },
  偏低: { label: '偏低', color: 'orange' },
  偏高: { label: '偏高', color: 'blue' },
};

/** 近效期阈值（天） */
export const EXPIRY_WARN_DAYS = 90;

export function daysToExpiry(expiry: string): number {
  const ms = Date.parse(expiry);
  if (Number.isNaN(ms)) return Number.POSITIVE_INFINITY;
  return Math.round((ms - Date.now()) / 86_400_000);
}

export function isExpiringSoon(item: DrugInventoryItem): boolean {
  return daysToExpiry(item.expiry) <= EXPIRY_WARN_DAYS;
}

/** DEMO 镜像（与 m200 种子一致） */
const DEMO_DRUGS: DrugInventoryItem[] = [
  { drugId: 'D-001', name: '阿司匹林肠溶片', spec: '100mg*30片', stock: 1500, price: 12.5, batch: 'B20261001', expiry: '2027-10-01', status: '正常' },
  { drugId: 'D-002', name: '阿托伐他汀钙片', spec: '20mg*7片', stock: 800, price: 28.0, batch: 'B20260915', expiry: '2027-09-15', status: '正常' },
  { drugId: 'D-003', name: '阿莫西林胶囊', spec: '0.25g*24粒', stock: 50, price: 8.5, batch: 'B20260820', expiry: '2027-08-20', status: '偏低' },
  { drugId: 'D-004', name: '头孢克肟分散片', spec: '100mg*6片', stock: 1200, price: 35.0, batch: 'B20260901', expiry: '2027-09-01', status: '正常' },
  { drugId: 'D-005', name: '低分子肝素钠注射液', spec: '4000IU*0.4ml', stock: 300, price: 45.0, batch: 'B20261005', expiry: '2027-10-05', status: '正常' },
  { drugId: 'D-006', name: '甲硝唑片', spec: '0.2g*100片', stock: 120, price: 5.0, batch: 'B20260501', expiry: new Date(Date.now() + 45 * 86_400_000).toISOString().slice(0, 10), status: '正常' },
  { drugId: 'D-007', name: '奥美拉唑肠溶胶囊', spec: '20mg*14粒', stock: 2000, price: 18.0, batch: 'B20260910', expiry: '2027-09-10', status: '偏高' },
  { drugId: 'D-008', name: '氯化钾缓释片', spec: '0.5g*100片', stock: 100, price: 6.0, batch: 'B20260801', expiry: '2027-08-01', status: '偏低' },
];

export interface InventoryListResult {
  items: DrugInventoryItem[];
  totalCount: number;
  demo: boolean;
}

export async function fetchDrugInventory(): Promise<InventoryListResult> {
  try {
    const res = await get<{ drugs: DrugInventoryItem[]; totalCount: number }>('/pharmacy/inventory');
    return { items: res.drugs, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_DRUGS, totalCount: DEMO_DRUGS.length, demo: true };
  }
}

export async function fetchDrugStock(drugId: string): Promise<DrugStockDetail> {
  try {
    return await get<DrugStockDetail>(`/pharmacy/inventory/${drugId}/stock`);
  } catch {
    const d = DEMO_DRUGS.find((x) => x.drugId === drugId) ?? DEMO_DRUGS[0];
    return {
      drugId,
      batches: [{ batchNumber: d.batch, quantity: d.stock, expiryDate: d.expiry }],
    };
  }
}

/** 入库：非 2xx 抛后端 message，不做 DEMO 成功兜底 */
export async function receiveDrugStock(input: ReceiveInput): Promise<{ batchNumber: string; quantity: number }> {
  return post<{ batchNumber: string; quantity: number }>('/pharmacy/inventory/receive', input);
}
