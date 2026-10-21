/**
 * 健澜科技 jlmedaios - 满意度统计 Zustand store（M618，P11）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchSatisfactionStats,
  type SatisfactionStats,
} from '@/services/api/satisfactionStatsM618';

interface SatisfactionStatsM618State {
  stats: SatisfactionStats | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useSatisfactionStatsM618Store = create<SatisfactionStatsM618State>((set) => ({
  stats: null,
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchSatisfactionStats();
      set({ stats: res, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '满意度统计加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
