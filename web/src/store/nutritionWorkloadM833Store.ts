/**
 * 健澜科技 jlmedaios - 营养科 Zustand store（M833）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchNutritionWorkload,
  type NutritionWorkload,
} from '@/services/api/nutritionWorkloadM833';

interface NutritionWorkloadM833State {
  items: NutritionWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useNutritionWorkloadM833Store = create<NutritionWorkloadM833State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchNutritionWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '营养工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
