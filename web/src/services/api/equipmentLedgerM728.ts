/**
 * 健澜科技 jlmedaios - 医疗设备台账管理 API（M728）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type EquipStatus = 'active' | 'idle' | 'repair' | 'scrapped';

export interface EquipmentLedger {
  id: string;
  assetNo: string;
  name: string;
  model: string;
  dept: string;
  purchasedAt: string;
  status: EquipStatus;
  specs: string;
  supplier: string;
  warrantyUntil: string;
  usageRecords: { date: string; content: string }[];
}

export const EQUIP_STATUS_META: Record<EquipStatus, { label: string; color: string }> = {
  active: { label: '在用', color: 'green' },
  idle: { label: '闲置', color: 'blue' },
  repair: { label: '维修中', color: 'orange' },
  scrapped: { label: '已报废', color: 'red' },
};

const DEMO: EquipmentLedger[] = [
  {
    id: 'EQ-001',
    assetNo: 'EQ-2023-0001',
    name: '1.5T 磁共振成像系统',
    model: 'Siemens Magnetom Amira',
    dept: '放射科',
    purchasedAt: '2023-06-01',
    status: 'active',
    specs: '场强 1.5T，梯度 45mT/m。',
    supplier: '西门子医疗',
    warrantyUntil: '2028-06-01',
    usageRecords: [
      { date: '2026-10-20', content: '完成 32 例扫描，运行正常。' },
    ],
  },
  {
    id: 'EQ-002',
    assetNo: 'EQ-2022-0188',
    name: '多参数监护仪',
    model: 'Philips IntelliVue MX450',
    dept: 'ICU',
    purchasedAt: '2022-03-15',
    status: 'repair',
    specs: '可监测 ECG/SpO2/NIBP/TEMP。',
    supplier: '飞利浦医疗',
    warrantyUntil: '2027-03-15',
    usageRecords: [
      { date: '2026-10-21', content: 'SpO2 模块故障，送修。' },
    ],
  },
];

export interface LedgerListResult {
  items: EquipmentLedger[];
  demo: boolean;
}

export async function fetchEquipmentLedger(): Promise<LedgerListResult> {
  try {
    const res = await get<{ items: EquipmentLedger[] }>('/equipment/ledger');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
