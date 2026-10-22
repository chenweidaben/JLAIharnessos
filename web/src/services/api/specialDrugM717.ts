/**
 * 健澜科技 jlmedaios - 特殊药品管理 API（M717）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type SpecialCategory = 'narcotic' | 'psychotropic1' | 'psychotropic2';

export interface SpecialDrugLedger {
  id: string;
  drugName: string;
  category: SpecialCategory;
  batchNo: string;
  stockQty: number;
  expiryDate: string;
  dailyConsumption: string[];
  doubleCheck: string;
  vialRecycled: string;
}

export const SPECIAL_CATEGORY_META: Record<SpecialCategory, { label: string; color: string }> = {
  narcotic: { label: '麻醉药品', color: 'red' },
  psychotropic1: { label: '第一类精神药品', color: 'volcano' },
  psychotropic2: { label: '第二类精神药品', color: 'orange' },
};

const DEMO: SpecialDrugLedger[] = [
  {
    id: 'SD-001',
    drugName: '盐酸吗啡注射液 10mg',
    category: 'narcotic',
    batchNo: 'M260315',
    stockQty: 18,
    expiryDate: '2027-03-14',
    dailyConsumption: ['10-20: 消耗 2 支（ZY-2601 癌痛）', '10-21: 消耗 1 支（ZY-2599 术后）'],
    doubleCheck: '药师甲 + 药师乙 双人复核签字',
    vialRecycled: '空安瓿 3 支已回收销毁，登记在册。',
  },
  {
    id: 'SD-002',
    drugName: '盐酸哌甲酯片 10mg',
    category: 'psychotropic1',
    batchNo: 'P260508',
    stockQty: 60,
    expiryDate: '2027-05-07',
    dailyConsumption: ['10-20: 消耗 4 片', '10-21: 消耗 4 片'],
    doubleCheck: '药师甲 + 药师丙 双人复核签字',
    vialRecycled: '口服药无空安瓿，凭处方批号核销。',
  },
];

export interface LedgerListResult {
  items: SpecialDrugLedger[];
  demo: boolean;
}

export async function fetchSpecialDrugs(): Promise<LedgerListResult> {
  try {
    const res = await get<{ items: SpecialDrugLedger[] }>('/pharmacy/special-drugs');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
