/**
 * 健澜科技 jlmedaios - 营养科膳食管理 Zustand store（M692）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchMealOrders,
  type MealOrder,
} from '@/services/api/nutritionMealOrderM692';

interface NutritionMealOrderM692State {
  items: MealOrder[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useNutritionMealOrderM692Store = create<NutritionMealOrderM692State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchMealOrders();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '膳食医嘱加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
