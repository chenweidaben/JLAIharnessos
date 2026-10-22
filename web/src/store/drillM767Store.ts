/**
 * 健澜科技 jlmedaios - 应急演练 Zustand store（M767）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchDrills,
  type Drill,
} from '@/services/api/drillM767';

interface DrillM767State {
  items: Drill[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useDrillM767Store = create<DrillM767State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchDrills();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '演练加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
