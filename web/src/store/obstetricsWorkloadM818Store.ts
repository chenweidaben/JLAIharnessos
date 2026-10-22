/**
 * 健澜科技 jlmedaios - 产科 Zustand store（M818）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchObstetricsWorkload,
  type ObstetricsWorkload,
} from '@/services/api/obstetricsWorkloadM818';

interface ObstetricsWorkloadM818State {
  items: ObstetricsWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useObstetricsWorkloadM818Store = create<ObstetricsWorkloadM818State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchObstetricsWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '产科工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
