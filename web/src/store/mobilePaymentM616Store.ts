/**
 * 健澜科技 jlmedaios - 移动缴费 Zustand store（M616，P11）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  createPayment,
  fetchPayments,
  fetchPendingBills,
  type PendingBill,
  type PaymentCreateInput,
  type PaymentRecord,
} from '@/services/api/mobilePaymentM616';

interface MobilePaymentM616State {
  patientId: string;
  bills: PendingBill[];
  payments: PaymentRecord[];
  loading: boolean;
  acting: boolean;
  error: string | null;
  demo: boolean;
  load: (patientId?: string) => Promise<void>;
  pay: (input: PaymentCreateInput) => Promise<boolean>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useMobilePaymentM616Store = create<MobilePaymentM616State>((set, get) => ({
  patientId: 'P10001',
  bills: [],
  payments: [],
  loading: false,
  acting: false,
  error: null,
  demo: false,

  load: async (patientId) => {
    const pid = (patientId ?? get().patientId).trim() || 'P10001';
    set({ patientId: pid, loading: true, error: null });
    try {
      const [bills, pay] = await Promise.all([fetchPendingBills(pid), fetchPayments(pid)]);
      set({ bills, payments: pay.items, demo: pay.demo || get().demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '账单加载失败') });
    }
  },

  pay: async (input) => {
    set({ acting: true, error: null });
    try {
      await createPayment(input);
      set({ acting: false });
      await get().load(input.patientId);
      return true;
    } catch (e) {
      set({ acting: false, error: errMsg(e, '支付失败') });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
