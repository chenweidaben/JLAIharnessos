/**
 * 健澜科技 jlmedaios - 医疗质量驾驶舱 Zustand store（M829）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchQualityOverview,
  type QualityOverview,
} from '@/services/api/qualityOverviewM829';

interface QualityOverviewM829State {
  items: QualityOverview[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useQualityOverviewM829Store = create<QualityOverviewM829State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchQualityOverview();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '质量驾驶舱加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
