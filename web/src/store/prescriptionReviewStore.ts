/**
 * 健澜科技 jlmedaios - 处方点评 store
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import {
  getPrescriptionReviewHome,
  submitPrescriptionReview,
  type PendingPrescription,
  type PrescriptionReview,
  type ReviewStats,
} from '@/services/api/prescriptionReview';

interface PrescriptionReviewState {
  pending: PendingPrescription[];
  recent: PrescriptionReview[];
  stats: ReviewStats | null;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  load: () => Promise<void>;
  submit: (input: { prescriptionId: string; result: PrescriptionReview['result']; comment?: string }) => Promise<void>;
}

export const usePrescriptionReviewStore = create<PrescriptionReviewState>((set, get) => ({
  pending: [],
  recent: [],
  stats: null,
  loading: false,
  submitting: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const home = await getPrescriptionReviewHome();
      set({ pending: home.pending, recent: home.recent, stats: home.stats });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败' });
    } finally {
      set({ loading: false });
    }
  },

  submit: async (input) => {
    set({ submitting: true, error: null });
    try {
      await submitPrescriptionReview(input);
      // 提交成功后刷新列表与统计
      const home = await getPrescriptionReviewHome();
      set({ pending: home.pending, recent: home.recent, stats: home.stats });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '点评提交失败' });
    } finally {
      set({ submitting: false });
    }
  },
}));
