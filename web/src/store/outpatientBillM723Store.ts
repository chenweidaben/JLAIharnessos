/**
 * 健澜科技 jlmedaios - 门诊收费管理 Zustand store（M723）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchOutpatientBills,
  type OutpatientBill,
} from '@/services/api/outpatientBillM723';

interface OutpatientBillM723State {
  items: OutpatientBill[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useOutpatientBillM723Store = create<OutpatientBillM723State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchOutpatientBills();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '门诊收费加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
