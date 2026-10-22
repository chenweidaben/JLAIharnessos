/**
 * 健澜科技 jlmedaios - 输血科 Zustand store（M878）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchBloodBankWorkload,
  type BloodBankWorkload,
} from '@/services/api/bloodBankWorkloadM878';

interface BloodBankWorkloadM878State {
  items: BloodBankWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useBloodBankWorkloadM878Store = create<BloodBankWorkloadM878State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchBloodBankWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '输血科工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
