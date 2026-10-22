/**
 * 健澜科技 jlmedaios - 营养科 Zustand store（M880）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchNutritionWorkloadM880,
  type NutritionWorkloadM880,
} from '@/services/api/nutritionWorkloadM880';

interface NutritionWorkloadM880State {
  items: NutritionWorkloadM880[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useNutritionWorkloadM880Store = create<NutritionWorkloadM880State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchNutritionWorkloadM880();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '营养科工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
