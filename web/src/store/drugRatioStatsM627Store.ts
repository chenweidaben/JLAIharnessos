/**
 * 健澜科技 jlmedaios - 药占比/耗占比 Zustand store（M627，P13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import { fetchDrugRatioStats, type DrugRatioStats } from '@/services/api/drugRatioStatsM627';

interface DrugRatioStatsM627State {
  stats: DrugRatioStats | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useDrugRatioStatsM627Store = create<DrugRatioStatsM627State>((set) => ({
  stats: null,
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchDrugRatioStats();
      set({ stats: res, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '药占比/耗占比加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
