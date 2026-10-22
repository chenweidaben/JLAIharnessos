/**
 * 健澜科技 jlmedaios - 体温单 Zustand store（M693）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchTemperatureSheets,
  type TemperatureSheet,
} from '@/services/api/temperatureSheetM693';

interface TemperatureSheetM693State {
  items: TemperatureSheet[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useTemperatureSheetM693Store = create<TemperatureSheetM693State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchTemperatureSheets();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '体温单加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
