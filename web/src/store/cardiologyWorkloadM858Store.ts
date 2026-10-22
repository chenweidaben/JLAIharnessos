/**
 * 健澜科技 jlmedaios - 心血管内科 Zustand store（M858）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchCardiologyWorkload,
  type CardiologyWorkload,
} from '@/services/api/cardiologyWorkloadM858';

interface CardiologyWorkloadM858State {
  items: CardiologyWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useCardiologyWorkloadM858Store = create<CardiologyWorkloadM858State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchCardiologyWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '心血管工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
