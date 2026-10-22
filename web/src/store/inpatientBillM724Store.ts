/**
 * 健澜科技 jlmedaios - 住院结算管理 Zustand store（M724）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchInpatientBills,
  type InpatientBill,
} from '@/services/api/inpatientBillM724';

interface InpatientBillM724State {
  items: InpatientBill[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useInpatientBillM724Store = create<InpatientBillM724State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchInpatientBills();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '住院结算加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
