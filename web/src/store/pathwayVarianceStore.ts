/**
 * 健澜科技 jlmedaios - 临床路径变异管理 store（213）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import {
  listPathwayVariance,
  createPathwayVariance,
  type PathwayVarianceListResult,
  type CreatePathwayVarianceInput,
} from '@/services/api/pathwayVariance';

interface PathwayVarianceState {
  visitId: string;
  result: PathwayVarianceListResult | null;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  setVisitId: (v: string) => void;
  load: () => Promise<void>;
  record: (input: CreatePathwayVarianceInput) => Promise<boolean>;
}

export const usePathwayVarianceStore = create<PathwayVarianceState>((set, get) => ({
  visitId: '',
  result: null,
  loading: false,
  submitting: false,
  error: null,

  setVisitId: (v) => set({ visitId: v }),

  load: async () => {
    const { visitId } = get();
    set({ loading: true, error: null });
    try {
      set({ result: await listPathwayVariance(visitId.trim() || undefined) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败' });
    } finally {
      set({ loading: false });
    }
  },

  record: async (input) => {
    set({ submitting: true, error: null });
    try {
      await createPathwayVariance(input);
      await get().load();
      return true;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '登记失败' });
      return false;
    } finally {
      set({ submitting: false });
    }
  },
}));
