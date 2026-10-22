/**
 * 健澜科技 jlmedaios - 护理管理驾驶舱 Zustand store（M831）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchNursingOverview,
  type NursingOverview,
} from '@/services/api/nursingOverviewM831';

interface NursingOverviewM831State {
  items: NursingOverview[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useNursingOverviewM831Store = create<NursingOverviewM831State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchNursingOverview();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '护理驾驶舱加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
