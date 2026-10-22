/**
 * 健澜科技 jlmedaios - 绩效考核 Zustand store（M735）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchPerformance,
  type PerformanceRecord,
} from '@/services/api/performanceM735';

interface PerformanceM735State {
  items: PerformanceRecord[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const usePerformanceM735Store = create<PerformanceM735State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchPerformance();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '绩效加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
