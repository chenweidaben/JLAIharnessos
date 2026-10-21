/**
 * 健澜科技 jlmedaios - 手术量统计 Zustand store（M625，P13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import { fetchSurgeryStats, type SurgeryStats } from '@/services/api/surgeryStatsM625';

interface SurgeryStatsM625State {
  stats: SurgeryStats | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useSurgeryStatsM625Store = create<SurgeryStatsM625State>((set) => ({
  stats: null,
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchSurgeryStats();
      set({ stats: res, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '手术量统计加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
