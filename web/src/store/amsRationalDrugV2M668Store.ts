/**
 * 健澜科技 jlmedaios - AMS 合理用药 v2 Zustand store（M668）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import { fetchAmsReviews, type AmsReview } from '@/services/api/amsRationalDrugV2M668';

interface AmsRationalDrugV2M668State {
  items: AmsReview[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useAmsRationalDrugV2M668Store = create<AmsRationalDrugV2M668State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchAmsReviews();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, 'AMS 点评加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
