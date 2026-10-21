/**
 * 健澜科技 jlmedaios - 住院床位统计 Zustand store（M624，P13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchInpatientStats,
  type InpatientStats,
} from '@/services/api/inpatientStatsM624';

interface InpatientStatsM624State {
  stats: InpatientStats | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useInpatientStatsM624Store = create<InpatientStatsM624State>((set) => ({
  stats: null,
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchInpatientStats();
      set({ stats: res, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '住院床位统计加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
