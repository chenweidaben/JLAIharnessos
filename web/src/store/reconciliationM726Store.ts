/**
 * 健澜科技 jlmedaios - 医保结算对账 Zustand store（M726）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchReconciliations,
  type Reconciliation,
} from '@/services/api/reconciliationM726';

interface ReconciliationM726State {
  items: Reconciliation[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useReconciliationM726Store = create<ReconciliationM726State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchReconciliations();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '医保对账加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
