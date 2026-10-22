/**
 * 健澜科技 jlmedaios - 产科 Zustand store（M848）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchObstetricsWorkloadM848,
  type ObstetricsWorkloadM848,
} from '@/services/api/obstetricsWorkloadM848';

interface ObstetricsWorkloadM848State {
  items: ObstetricsWorkloadM848[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useObstetricsWorkloadM848Store = create<ObstetricsWorkloadM848State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchObstetricsWorkloadM848();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '产科工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
