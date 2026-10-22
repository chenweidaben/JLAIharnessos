/**
 * 健澜科技 jlmedaios - 院感管理驾驶舱 Zustand store（M832）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchInfectionOverview,
  type InfectionOverview,
} from '@/services/api/infectionOverviewM832';

interface InfectionOverviewM832State {
  items: InfectionOverview[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useInfectionOverviewM832Store = create<InfectionOverviewM832State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchInfectionOverview();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '院感驾驶舱加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
