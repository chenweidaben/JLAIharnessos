/**
 * 健澜科技 jlmedaios - 处方点评 v2 Zustand store（M661）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchPrescriptionReviews,
  type PrescriptionReview,
} from '@/services/api/prescriptionReviewV2M661';

interface PrescriptionReviewV2M661State {
  items: PrescriptionReview[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const usePrescriptionReviewV2M661Store = create<PrescriptionReviewV2M661State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchPrescriptionReviews();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '处方点评加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
