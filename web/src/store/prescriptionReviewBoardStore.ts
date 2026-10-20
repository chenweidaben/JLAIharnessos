/**
 * 健澜科技 jlmedaios - 处方点评看板 Zustand store（M502）
 * 聚合 /prescription/* 三端点。BFF 不可用时由 service 层注入 DEMO 数据并打标 demo。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import {
  fetchFeedback,
  fetchReview,
  fetchStats,
  type FeedbackRow,
  type ReviewRow,
  type RxStats,
} from '@/services/api/prescriptionReviewBoard';

interface PrescriptionReviewBoardState {
  reviews: ReviewRow[];
  feedback: FeedbackRow[];
  stats: RxStats | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
}

export const usePrescriptionReviewBoardStore = create<PrescriptionReviewBoardState>((set) => ({
  reviews: [],
  feedback: [],
  stats: null,
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [r, f, s] = await Promise.all([
        fetchReview(),
        fetchFeedback(),
        fetchStats(),
      ]);
      set({
        reviews: r.data,
        feedback: f.data,
        stats: s.data,
        demo: r.demo || f.demo || s.demo,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '处方点评看板加载失败',
      });
    }
  },
}));
