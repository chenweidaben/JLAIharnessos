/**
 * 健澜科技 jlmedaios - 儿科 Zustand store（M850）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchPediatricsWorkloadM850,
  type PediatricsWorkloadM850,
} from '@/services/api/pediatricsWorkloadM850';

interface PediatricsWorkloadM850State {
  items: PediatricsWorkloadM850[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const usePediatricsWorkloadM850Store = create<PediatricsWorkloadM850State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchPediatricsWorkloadM850();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '儿科工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
