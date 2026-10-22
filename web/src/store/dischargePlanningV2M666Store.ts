/**
 * 健澜科技 jlmedaios - 出院计划 v2 Zustand store（M666）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchDischargePlans,
  type DischargePlan,
} from '@/services/api/dischargePlanningV2M666';

interface DischargePlanningV2M666State {
  items: DischargePlan[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useDischargePlanningV2M666Store = create<DischargePlanningV2M666State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchDischargePlans();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '出院计划加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
