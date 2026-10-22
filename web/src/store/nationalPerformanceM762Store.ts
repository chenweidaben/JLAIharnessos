/**
 * 健澜科技 jlmedaios - 三级公立医院绩效考核 Zustand store（M762）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchNationalPerformance,
  type NationalPerfIndicator,
} from '@/services/api/nationalPerformanceM762';

interface NationalPerformanceM762State {
  items: NationalPerfIndicator[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useNationalPerformanceM762Store = create<NationalPerformanceM762State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchNationalPerformance();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '国考指标加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
