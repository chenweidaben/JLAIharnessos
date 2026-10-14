/**
 * 健澜科技 jlmedaios - 合理用药实时审查 store（AI 第八剑客）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getDrugReview, scanDrugReview, type DrugReviewResult } from '@/services/api/drugReview';

interface DrugReviewState {
  visitId: string;
  result: DrugReviewResult | null;
  loading: boolean;
  scanning: boolean;
  error: string | null;
  setVisitId: (v: string) => void;
  load: () => Promise<void>;
  scan: () => Promise<void>;
}

export const useDrugReviewStore = create<DrugReviewState>((set, get) => ({
  visitId: '',
  result: null,
  loading: false,
  scanning: false,
  error: null,

  setVisitId: (v) => set({ visitId: v }),

  load: async () => {
    const { visitId } = get();
    if (!visitId.trim()) { set({ result: null }); return; }
    set({ loading: true, error: null });
    try {
      set({ result: await getDrugReview(visitId.trim()) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败' });
    } finally {
      set({ loading: false });
    }
  },

  scan: async () => {
    const { visitId } = get();
    if (!visitId.trim()) { set({ error: '请输入就诊号 visitId' }); return; }
    set({ scanning: true, error: null });
    try {
      set({ result: await scanDrugReview(visitId.trim()) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '审查失败' });
    } finally {
      set({ scanning: false });
    }
  },
}));
