/**
 * 健澜科技 jlmedaios - 护理敏感指标（NQI）看板 store
 * Copyright (c) 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getNqiTrend } from '@/services/api/nursingNqi';
import type { NqiTrendData } from '@/types/nursingNqi';

interface NursingNqiState {
  data: NqiTrendData | null;
  loading: boolean;
  error: string | null;
  fetchTrend: () => Promise<void>;
}

export const useNursingNqiStore = create<NursingNqiState>((set) => ({
  data: null,
  loading: false,
  error: null,
  fetchTrend: async () => {
    set({ loading: true, error: null });
    try {
      set({ data: await getNqiTrend() });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '护理敏感指标加载失败' });
    } finally {
      set({ loading: false });
    }
  },
}));
