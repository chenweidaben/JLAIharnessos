/**
 * 健澜科技 jlmedaios - 门诊收费管理 API（M723）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type BillStatus = 'unpaid' | 'paid' | 'refunded';
export type PayMethod = 'cash' | 'wechat' | 'alipay' | 'insurance' | 'card';

export interface OutpatientBill {
  id: string;
  billNo: string;
  patientId: string;
  dept: string;
  totalFee: number;
  payMethod: PayMethod;
  status: BillStatus;
  items: { name: string; qty: number; price: number }[];
  invoiceNo: string;
}

export const BILL_STATUS_META: Record<BillStatus, { label: string; color: string }> = {
  unpaid: { label: '未缴费', color: 'orange' },
  paid: { label: '已缴费', color: 'green' },
  refunded: { label: '已退费', color: 'red' },
};

export const PAY_METHOD_META: Record<PayMethod, string> = {
  cash: '现金',
  wechat: '微信',
  alipay: '支付宝',
  insurance: '医保个账',
  card: '银行卡',
};

const DEMO: OutpatientBill[] = [
  {
    id: 'OB-001',
    billNo: 'FEE-26102201',
    patientId: 'P10002',
    dept: '呼吸内科',
    totalFee: 156.5,
    payMethod: 'wechat',
    status: 'paid',
    items: [
      { name: '普通门诊诊查费', qty: 1, price: 25 },
      { name: '胸部 DR（正位）', qty: 1, price: 78 },
      { name: '阿莫西林克拉维酸钾', qty: 2, price: 26.75 },
    ],
    invoiceNo: 'INV-26102201',
  },
  {
    id: 'OB-002',
    billNo: 'FEE-26102202',
    patientId: 'P10008',
    dept: '心内科',
    totalFee: 88.0,
    payMethod: 'insurance',
    status: 'unpaid',
    items: [
      { name: '普通门诊诊查费', qty: 1, price: 25 },
      { name: '心电图', qty: 1, price: 63 },
    ],
    invoiceNo: '—',
  },
];

export interface BillListResult {
  items: OutpatientBill[];
  demo: boolean;
}

export async function fetchOutpatientBills(): Promise<BillListResult> {
  try {
    const res = await get<{ items: OutpatientBill[] }>('/billing/outpatient-bills');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
