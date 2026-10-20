/**
 * 健澜科技 jlmedaios - 药学管理看板 API（M484）
 * 对接 BFF /api/v1/pharmacy/* ：
 *   /pharmacy/inventory         库存
 *   /pharmacy/prescription-review 处方点评
 *   /pharmacy/special-drug      麻精药品台账
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface InventoryRow {
  id: string;
  name: string;
  spec: string;
  stock: number;
  unit: string;
  expiry: string;
  amount: number; // 库存金额
  demo?: boolean;
}

export interface PrescriptionReviewRow {
  id: string;
  dept: string;
  reviewed: number;
  irrational: number;
  irrationalRate: number; // %
  demo?: boolean;
}

export interface SpecialDrugRow {
  id: string;
  name: string;
  batch: string;
  used: number;
  unit: string;
  dualLock: boolean;
  demo?: boolean;
}

const DEMO_INVENTORY: InventoryRow[] = [
  { id: 'i-1', name: '头孢呋辛钠', spec: '1.5g*10', stock: 4200, unit: '支', expiry: '2027-03-31', amount: 84000, demo: true },
  { id: 'i-2', name: '阿莫西林胶囊', spec: '0.25g*24', stock: 8600, unit: '盒', expiry: '2026-11-30', amount: 43000, demo: true },
  { id: 'i-3', name: '阿托伐他汀钙片', spec: '20mg*7', stock: 5200, unit: '盒', expiry: '2026-10-28', amount: 104000, demo: true },
  { id: 'i-4', name: '0.9% 氯化钠注射液', spec: '500ml', stock: 24000, unit: '瓶', expiry: '2027-08-31', amount: 72000, demo: true },
  { id: 'i-5', name: '布地奈德雾化液', spec: '1mg*5', stock: 1800, unit: '支', expiry: '2026-12-15', amount: 36000, demo: true },
];

const DEMO_REVIEW: PrescriptionReviewRow[] = [
  { id: 'r-1', dept: '心内科', reviewed: 420, irrational: 12, irrationalRate: 2.86, demo: true },
  { id: 'r-2', dept: '呼吸内科', reviewed: 380, irrational: 22, irrationalRate: 5.79, demo: true },
  { id: 'r-3', dept: '普外科', reviewed: 360, irrational: 15, irrationalRate: 4.17, demo: true },
  { id: 'r-4', dept: '儿科', reviewed: 320, irrational: 28, irrationalRate: 8.75, demo: true },
  { id: 'r-5', dept: '神经内科', reviewed: 280, irrational: 8, irrationalRate: 2.86, demo: true },
];

const DEMO_SPECIAL: SpecialDrugRow[] = [
  { id: 'sd-1', name: '盐酸吗啡注射液', batch: 'M240801', used: 86, unit: '支', dualLock: true, demo: true },
  { id: 'sd-2', name: '枸橼酸芬太尼', batch: 'F240715', used: 52, unit: '支', dualLock: true, demo: true },
  { id: 'sd-3', name: '盐酸哌替啶注射液', batch: 'P240620', used: 30, unit: '支', dualLock: true, demo: true },
  { id: 'sd-4', name: '地西泮片', batch: 'D240901', used: 120, unit: '片', dualLock: true, demo: true },
  { id: 'sd-5', name: '盐酸氯胺酮注射液', batch: 'K240810', used: 18, unit: '支', dualLock: false, demo: true },
];

async function safeGet<T>(url: string, fallback: T[]): Promise<{ data: T[]; demo: boolean }> {
  try {
    const res = await get<{ items?: T[] } | T[]>(url);
    const items = Array.isArray(res) ? (res as T[]) : ((res as { items?: T[] })?.items ?? []);
    if (items.length > 0) return { data: items, demo: false };
    return { data: fallback, demo: true };
  } catch {
    return { data: fallback, demo: true };
  }
}

export const fetchInventory = () =>
  safeGet<InventoryRow>('/pharmacy/inventory', DEMO_INVENTORY);
export const fetchPrescriptionReview = () =>
  safeGet<PrescriptionReviewRow>('/pharmacy/prescription-review', DEMO_REVIEW);
export const fetchSpecialDrug = () =>
  safeGet<SpecialDrugRow>('/pharmacy/special-drug', DEMO_SPECIAL);
