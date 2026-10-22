/**
 * 健澜科技 jlmedaios - 住院结算管理 API（M724）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type InpatientSettleStatus = 'in_hospital' | 'settled' | 'refunded';

export interface InpatientBill {
  id: string;
  inpatientNo: string;
  patientId: string;
  depositTotal: number;
  totalFee: number;
  selfPay: number;
  status: InpatientSettleStatus;
  feeCategories: { name: string; amount: number }[];
  depositRecords: { time: string; amount: number; method: string }[];
}

export const SETTLE_STATUS_META: Record<InpatientSettleStatus, { label: string; color: string }> = {
  in_hospital: { label: '在院', color: 'processing' },
  settled: { label: '已结算', color: 'green' },
  refunded: { label: '已退费', color: 'red' },
};

const DEMO: InpatientBill[] = [
  {
    id: 'IB-001',
    inpatientNo: 'ZY-2601',
    patientId: 'P10002',
    depositTotal: 10000,
    totalFee: 28500,
    selfPay: 8500,
    status: 'settled',
    feeCategories: [
      { name: '床位费', amount: 1500 },
      { name: '诊疗费', amount: 3200 },
      { name: '药品费', amount: 12000 },
      { name: '手术费', amount: 8800 },
      { name: '检查检验费', amount: 3000 },
    ],
    depositRecords: [
      { time: '10-15 入院', amount: 5000, method: '现金' },
      { time: '10-18 补缴', amount: 5000, method: '微信' },
    ],
  },
];

export interface InpatientBillListResult {
  items: InpatientBill[];
  demo: boolean;
}

export async function fetchInpatientBills(): Promise<InpatientBillListResult> {
  try {
    const res = await get<{ items: InpatientBill[] }>('/billing/inpatient-bills');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
