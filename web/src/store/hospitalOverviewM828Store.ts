/**
 * 健澜科技 jlmedaios - 院长驾驶舱 Zustand store（M828）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchHospitalOverview,
  type HospitalOverview,
} from '@/services/api/hospitalOverviewM828';

interface HospitalOverviewM828State {
  items: HospitalOverview[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useHospitalOverviewM828Store = create<HospitalOverviewM828State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchHospitalOverview();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '院长驾驶舱加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
