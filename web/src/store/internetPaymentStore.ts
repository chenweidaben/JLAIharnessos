/**
 * 健澜科技 jlmedaios - 互联网在线支付 Store（M3-M）
 *
 * 健康门禁：BFF/DB 断链时明确提示，不以缓存冒充支付/票据结果。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { create } from 'zustand';
import { systemApi } from '../services/api/system';
import { internetPaymentApi } from '../services/api/internetPayment';
import type {
  OnlinePaymentView,
  EInvoiceView,
  PaymentCreateResult,
  PaymentRefundResult,
} from '../types/internetPayment';
import type { EPrescriptionView } from '../types/internetPrescription';

interface InternetPaymentState {
  healthOk: boolean;
  healthMsg: string;
  checking: boolean;
  loading: boolean;
  submitting: boolean;
  myPayments: OnlinePaymentView[];
  myInvoices: EInvoiceView[];
  payableRx: EPrescriptionView[];
  financeQueue: OnlinePaymentView[];
  financeInvoices: EInvoiceView[];
  checkHealth: () => Promise<void>;
  loadMy: (patientId: string) => Promise<void>;
  loadFinance: (status?: string) => Promise<void>;
  createPayment: (patientId: string, prescriptionId: string) => Promise<PaymentCreateResult>;
  cancelPayment: (patientId: string, paymentId: string) => Promise<OnlinePaymentView>;
  refundPayment: (paymentId: string, reason: string) => Promise<PaymentRefundResult>;
  reset: () => void;
}

const initialState = {
  healthOk: false,
  healthMsg: '',
  checking: false,
  loading: false,
  submitting: false,
  myPayments: [] as OnlinePaymentView[],
  myInvoices: [] as EInvoiceView[],
  payableRx: [] as EPrescriptionView[],
  financeQueue: [] as OnlinePaymentView[],
  financeInvoices: [] as EInvoiceView[],
};

export const useInternetPaymentStore = create<InternetPaymentState>((set, get) => ({
  ...initialState,

  checkHealth: async () => {
    if (get().checking) return;
    set({ checking: true });
    try {
      const h = (await systemApi.health()) as {
        status?: string;
        db?: string;
        data?: { db?: string };
      };
      const ok = h?.db === 'up' || h?.data?.db === 'up' || h?.status === 'healthy';
      set({ healthOk: ok, healthMsg: ok ? '' : '服务暂不可用，请稍后重试' });
    } catch {
      set({ healthOk: false, healthMsg: '服务暂不可用，请稍后重试' });
    } finally {
      set({ checking: false });
    }
  },

  loadMy: async (patientId) => {
    if (!patientId) return;
    set({ loading: true });
    try {
      const [payments, invoices, payable] = await Promise.all([
        internetPaymentApi.my(patientId),
        internetPaymentApi.myInvoices(patientId),
        internetPaymentApi.payable(patientId),
      ]);
      set({
        myPayments: payments.payments ?? [],
        myInvoices: invoices.invoices ?? [],
        payableRx: payable.payable ?? [],
      });
    } finally {
      set({ loading: false });
    }
  },

  loadFinance: async (status) => {
    set({ loading: true });
    try {
      const [queue, invoices] = await Promise.all([
        internetPaymentApi.financeQueue(status),
        internetPaymentApi.financeInvoices(status),
      ]);
      set({ financeQueue: queue.payments ?? [], financeInvoices: invoices.invoices ?? [] });
    } finally {
      set({ loading: false });
    }
  },

  createPayment: async (patientId, prescriptionId) => {
    set({ submitting: true });
    try {
      const result = await internetPaymentApi.create(patientId, {
        prescriptionId,
        channel: 'mock',
        idempotencyKey:
          'fe-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      });
      await get().loadMy(patientId);
      return result;
    } finally {
      set({ submitting: false });
    }
  },

  cancelPayment: async (patientId, paymentId) => {
    set({ submitting: true });
    try {
      const r = await internetPaymentApi.cancel(patientId, paymentId);
      await get().loadMy(patientId);
      return r.payment;
    } finally {
      set({ submitting: false });
    }
  },

  refundPayment: async (paymentId, reason) => {
    set({ submitting: true });
    try {
      const r = await internetPaymentApi.refund({ paymentId, reason });
      await get().loadFinance();
      return r;
    } finally {
      set({ submitting: false });
    }
  },

  reset: () => set({ ...initialState }),
}));
