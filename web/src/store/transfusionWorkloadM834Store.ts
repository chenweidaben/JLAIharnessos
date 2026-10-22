/**
 * 健澜科技 jlmedaios - 输血科 Zustand store（M834）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchTransfusionWorkload,
  type TransfusionWorkload,
} from '@/services/api/transfusionWorkloadM834';

interface TransfusionWorkloadM834State {
  items: TransfusionWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useTransfusionWorkloadM834Store = create<TransfusionWorkloadM834State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchTransfusionWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '输血工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
