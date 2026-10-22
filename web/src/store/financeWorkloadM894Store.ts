/**
 * 健澜科技 jlmedaios - 财务 Zustand store（M894）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchFinanceWorkload,
  type FinanceWorkload,
} from '@/services/api/financeWorkloadM894';

interface FinanceWorkloadM894State {
  items: FinanceWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useFinanceWorkloadM894Store = create<FinanceWorkloadM894State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchFinanceWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '财务工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
