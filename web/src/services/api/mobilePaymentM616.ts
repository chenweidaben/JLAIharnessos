/**
 * 健澜科技 jlmedaios - 移动缴费 API（M616，P11 智慧服务）
 *
 * 对接真实 BFF（m587）：GET /api/v1/payments（缴费记录）+ POST /api/v1/payments
 *   body: patientId/billId/amount/feeType/payMethod；amount 正数否则 400。
 * GET /pending-bills 未注册，本地 DEMO 账单兜底。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

export interface PendingBill {
  billId: string;
  itemName: string;
  feeType: 'registration' | 'examination' | 'medication' | 'treatment';
  amount: number;
  dueDate: string;
}

export interface PaymentRecord {
  id: string;
  patientId: string;
  billId: string;
  amount: number;
  feeType: PendingBill['feeType'];
  payMethod: 'wechat' | 'alipay' | 'unionpay';
  status: 'paid' | 'refunded';
  paidAt: string;
}

export interface PaymentCreateInput {
  patientId: string;
  billId: string;
  amount: number;
  feeType: PendingBill['feeType'];
  payMethod: PaymentRecord['payMethod'];
}

export const FEE_TYPE_META: Record<PendingBill['feeType'], string> = {
  registration: '挂号费',
  examination: '检查费',
  medication: '药品费',
  treatment: '治疗费',
};

const DEMO_BILLS: PendingBill[] = [
  { billId: 'BILL-20261020-01', itemName: '心内科门诊挂号', feeType: 'registration', amount: 25.0, dueDate: '2026-10-25' },
  { billId: 'BILL-20261020-02', itemName: '头颅 CT 平扫', feeType: 'examination', amount: 268.0, dueDate: '2026-10-25' },
  { billId: 'BILL-20261021-01', itemName: '阿司匹林肠溶片（1 盒）', feeType: 'medication', amount: 12.5, dueDate: '2026-10-26' },
];

export interface PaymentListResult {
  items: PaymentRecord[];
  totalCount: number;
  demo: boolean;
}

export async function fetchPendingBills(patientId: string): Promise<PendingBill[]> {
  try {
    return await get<PendingBill[]>('/pending-bills', { patientId });
  } catch {
    return DEMO_BILLS;
  }
}

export async function fetchPayments(patientId: string): Promise<PaymentListResult> {
  try {
    const res = await get<{ items: PaymentRecord[]; totalCount: number }>('/payments', { patientId });
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: [], totalCount: 0, demo: true };
  }
}

/** 支付：400/409 抛后端 message */
export async function createPayment(input: PaymentCreateInput): Promise<PaymentRecord> {
  return post<PaymentRecord>('/payments', input);
}
