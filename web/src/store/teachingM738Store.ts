/**
 * 健澜科技 jlmedaios - 教学管理 Zustand store（M738）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchTeachingPlans,
  type TeachingPlan,
} from '@/services/api/teachingPlanM738';

interface TeachingM738State {
  items: TeachingPlan[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useTeachingM738Store = create<TeachingM738State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchTeachingPlans();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '教学计划加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
