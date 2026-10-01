/**
 * 健澜科技 jlmedaios - 互联网在线支付 API 服务（M3-M）
 *
 * 全部走真实 BFF 请求（相对路径），绝不内置假数据。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { get, post } from '@/api/client';
import type {
  OnlinePaymentView,
  EInvoiceView,
  PaymentCreateResult,
  PaymentRefundResult,
} from '../../types/internetPayment';
import type { EPrescriptionView } from '../../types/internetPrescription';

export interface CreatePaymentPayload {
  prescriptionId: string;
  channel: string;
  idempotencyKey: string;
}

export interface RefundPayload {
  paymentId: string;
  reason: string;
}

export const internetPaymentApi = {
  /** 患者：发起支付（mock 渠道下单即完成；真实渠道转 processing） */
  create: (patientId: string, payload: CreatePaymentPayload) =>
    post<PaymentCreateResult>(`/internet/payment/create?patientId=${encodeURIComponent(patientId)}`, payload),

  /** 患者：取消在途支付单 */
  cancel: (patientId: string, paymentId: string) =>
    post<{ payment: OnlinePaymentView }>(
      `/internet/payment/cancel?patientId=${encodeURIComponent(patientId)}`,
      { paymentId },
    ),

  /** 财务/药师：冲正（票据冲红 + 处方回 returned） */
  refund: (payload: RefundPayload) =>
    post<PaymentRefundResult>('/internet/payment/refund', payload),

  /** 患者：我的实名患者 ID（就诊人档案实名后才有 patient_id） */
  patientProfile: () =>
    get<{ accountId: string; patientId: string }>('/internet/payment/patient-profile'),

  /** 患者：可支付处方（已审方通过、尚未支付） */
  payable: (patientId: string) =>
    get<{ payable: EPrescriptionView[] }>(
      `/internet/payment/payable?patientId=${encodeURIComponent(patientId)}`,
    ),

  /** 患者：我的支付单 */
  my: (patientId: string) =>
    get<{ payments: OnlinePaymentView[] }>(
      `/internet/payment/my?patientId=${encodeURIComponent(patientId)}`,
    ),

  /** 患者：我的电子票据 */
  myInvoices: (patientId: string) =>
    get<{ invoices: EInvoiceView[] }>(
      `/internet/payment/my-invoices?patientId=${encodeURIComponent(patientId)}`,
    ),

  /** 财务：支付队列 */
  financeQueue: (status?: string) =>
    get<{ payments: OnlinePaymentView[] }>(
      `/internet/payment/finance-queue${status ? `?status=${status}` : ''}`,
    ),

  /** 财务：票据台账 */
  financeInvoices: (status?: string) =>
    get<{ invoices: EInvoiceView[] }>(
      `/internet/payment/finance-invoices${status ? `?status=${status}` : ''}`,
    ),
};
