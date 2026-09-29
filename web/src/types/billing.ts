/**
 * 健澜科技 jlmedaios - 收费结算前端类型（M3-B）
 * 与后端 billingRepo / billingAggregator 对齐。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type ChargeCategory =
  | 'registration' | 'consultation' | 'lab' | 'imaging'
  | 'treatment' | 'bed' | 'nursing' | 'surgery' | 'material' | 'other';

export type FeeCategory = ChargeCategory | 'drug';

export type FeeItemStatus = 'active' | 'settled' | 'refunded' | 'void';

export type SettlementStatus =
  | 'unpaid' | 'paid' | 'partially_refunded' | 'refunded' | 'void';

export type PaymentMethod =
  | 'cash' | 'wechat' | 'alipay' | 'bank_card' | 'insurance' | 'mixed';

export interface FeeItem {
  id: string;
  patientId: string;
  visitId: string;
  category: FeeCategory;
  itemCode: string | null;
  itemName: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  sourceType: string;
  sourceId: string | null;
  priceSource: 'catalog' | 'drug' | 'default' | 'manual';
  status: FeeItemStatus;
  settlementId: string | null;
  department: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settlement {
  id: string;
  settlementNo: string;
  patientId: string;
  visitId: string;
  department: string;
  status: SettlementStatus;
  version: number;
  paymentMethod: PaymentMethod;
  totalAmount: string;
  paidAmount: string;
  refundedAmount: string;
  paidBy: string | null;
  paidAt: string | null;
  voidedBy: string | null;
  voidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  settlementId: string;
  patientId: string;
  visitId: string;
  invoiceType: 'electronic' | 'paper';
  totalAmount: string;
  refundedAmount: string;
  status: 'issued' | 'void';
  issuedBy: string | null;
  issuedAt: string;
  voidedAt: string | null;
  createdAt: string;
}

export interface Refund {
  id: string;
  refundNo: string;
  settlementId: string;
  invoiceId: string | null;
  patientId: string;
  visitId: string;
  feeItemId: string;
  amount: string;
  reason: string;
  refundedBy: string | null;
  refundedAt: string;
  createdAt: string;
}

export interface GenerateStats {
  created: number;
  skipped: number;
  registration: number;
  consultation: number;
  orders: number;
  drugs: number;
  defaultPriced: number;
}

export interface OutstandingView {
  visit: {
    id: string;
    visitNo: string;
    visitType: string;
    department: string;
  };
  patient: { mrn: string; nameMasked: string } | null;
  items: FeeItem[];
  totalAmount: string;
}

export interface SettlementDetail {
  settlement: Settlement;
  items: FeeItem[];
  invoice: Invoice | null;
  refunds: Refund[];
  sagaLog: Array<{
    id: string;
    saga_id: string;
    step: string;
    direction: 'forward' | 'compensate';
    status: string;
    detail?: Record<string, unknown>;
    created_at: string;
  }>;
}

export interface QueueResult {
  items: Settlement[];
  total: number;
}

/* 中文标签 */
export const FEE_CATEGORY_LABEL: Record<FeeCategory, string> = {
  registration: '挂号',
  consultation: '诊查',
  lab: '检验',
  imaging: '检查',
  drug: '西药/中成药',
  treatment: '治疗',
  bed: '床位',
  nursing: '护理',
  surgery: '手术',
  material: '材料',
  other: '其他',
};

export const FEE_STATUS_LABEL: Record<FeeItemStatus, string> = {
  active: '待结算',
  settled: '已结算',
  refunded: '已退费',
  void: '已作废',
};

export const SETTLEMENT_STATUS_LABEL: Record<SettlementStatus, string> = {
  unpaid: '待支付',
  paid: '已支付',
  partially_refunded: '部分退费',
  refunded: '全额退费',
  void: '已作废',
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: '现金',
  wechat: '微信',
  alipay: '支付宝',
  bank_card: '银行卡',
  insurance: '医保',
  mixed: '混合支付',
};

/** 结算单状态徽标颜色 */
export const SETTLEMENT_STATUS_COLOR: Record<SettlementStatus, string> = {
  unpaid: 'orange',
  paid: 'green',
  partially_refunded: 'gold',
  refunded: 'red',
  void: 'default',
};

export const FEE_STATUS_COLOR: Record<FeeItemStatus, string> = {
  active: 'orange',
  settled: 'green',
  refunded: 'red',
  void: 'default',
};
