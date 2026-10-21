/**
 * 健澜科技 jlmedaios - 门诊量统计 Zustand store（M623，P13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchOutpatientStats,
  type OutpatientStats,
} from '@/services/api/outpatientStatsM623';

interface OutpatientStatsM623State {
  stats: OutpatientStats | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useOutpatientStatsM623Store = create<OutpatientStatsM623State>((set) => ({
  stats: null,
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchOutpatientStats();
      set({ stats: res, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '门诊量统计加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
