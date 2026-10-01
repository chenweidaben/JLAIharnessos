/**
 * 健澜科技 jlmedaios - 互联网在线支付 类型定义（M3-M）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type OnlinePaymentStatus =
  | 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';
export type PaymentChannel = 'wechat' | 'alipay' | 'bank_card' | 'mock';
export type EInvoiceStatus = 'issued' | 'reversed';

export interface OnlinePaymentView {
  id: string;
  payNo: string;
  sourceType: 'internet_prescription';
  sourceId: string;
  patientId: string;
  accountId: string;
  amount: string;
  medicarePaid: string;
  selfPaid: string;
  channel: string;
  status: OnlinePaymentStatus;
  idempotencyKey: string;
  channelTxnNo: string | null;
  paidBy: string | null;
  paidAt: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EInvoiceView {
  id: string;
  invoiceNo: string;
  paymentId: string;
  patientId: string;
  sourceType: 'internet_prescription';
  sourceId: string;
  amount: string;
  medicarePaid: string;
  selfPaid: string;
  status: EInvoiceStatus;
  reversalOf: string | null;
  reversedAt: string | null;
  issuedBy: string | null;
  issuedAt: string;
  createdAt: string;
}

export interface PaymentCreateResult {
  payment: OnlinePaymentView;
  invoice: EInvoiceView | null;
  rx: { id: string; rxNo: string; status: string; totalFee: string | null };
}

export interface PaymentRefundResult {
  payment: OnlinePaymentView;
  invoice: EInvoiceView | null;
}
