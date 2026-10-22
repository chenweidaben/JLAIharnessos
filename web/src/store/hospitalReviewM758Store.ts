/**
 * 健澜科技 jlmedaios - 医院评审 Zustand store（M758）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchHospitalReviews,
  type HospitalReview,
} from '@/services/api/hospitalReviewM758';

interface HospitalReviewM758State {
  items: HospitalReview[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useHospitalReviewM758Store = create<HospitalReviewM758State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchHospitalReviews();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '评审任务加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
