/**
 * 健澜科技 jlmedaios - 医保费用审核 Zustand store（M725）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchCostAudits,
  type CostAudit,
} from '@/services/api/costAuditM725';

interface CostAuditM725State {
  items: CostAudit[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useCostAuditM725Store = create<CostAuditM725State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchCostAudits();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '医保审核加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
