/**
 * 健澜科技 jlmedaios - NRS-2002 入院营养风险筛查 Zustand store（M521-E，P0 首批）
 *
 * 三态：loading / error / demo；提交成功或降级演示记录后前置到历史列表。
 * 写操作失败不吞错：error 由页面 Alert 统一展示，禁止页面内 JSON.stringify。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchNutritionScreenings,
  submitNutritionScreening,
  type NutritionScreeningRecord,
  type NutritionSubmitInput,
  type NutritionSubmitResult,
} from '@/services/api/nutritionScreeningForm';

interface NutritionScreeningFormState {
  records: NutritionScreeningRecord[];
  loading: boolean;
  acting: boolean;
  error: string | null;
  demo: boolean;
  lastResult: NutritionSubmitResult | null;
  load: (visitId?: string) => Promise<void>;
  submit: (input: NutritionSubmitInput) => Promise<NutritionSubmitResult>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useNutritionScreeningFormStore = create<NutritionScreeningFormState>((set) => ({
  records: [],
  loading: false,
  acting: false,
  error: null,
  demo: false,
  lastResult: null,

  load: async (visitId) => {
    set({ loading: true, error: null });
    try {
      const res = await fetchNutritionScreenings(visitId);
      set({ records: res.data, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '营养筛查记录加载失败') });
    }
  },

  submit: async (input) => {
    set({ acting: true, error: null });
    try {
      const result = await submitNutritionScreening(input);
      set((state) => ({
        records: [result.record, ...state.records],
        lastResult: result,
        demo: state.demo || result.demo,
        acting: false,
      }));
      return result;
    } catch (e) {
      set({ acting: false, error: errMsg(e, '营养风险筛查登记失败') });
      throw e;
    }
  },

  clearError: () => set({ error: null }),
}));
