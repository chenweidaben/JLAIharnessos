/**
 * 健澜科技 jlmedaios - 医疗质量指标 Zustand store（M626，P13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import { fetchQualityStats, type QualityStats } from '@/services/api/qualityStatsM626';

interface QualityStatsM626State {
  stats: QualityStats | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useQualityStatsM626Store = create<QualityStatsM626State>((set) => ({
  stats: null,
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchQualityStats();
      set({ stats: res, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '医疗质量指标加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
