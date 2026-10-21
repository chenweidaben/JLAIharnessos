/**
 * 健澜科技 jlmedaios - 疼痛 NRS 0–10 评估 Zustand store（M521-B，P0 首批）
 *
 * 三态：loading / acting / error / demo；提交成功或降级演示记录后前置到历史列表。
 * 写操作失败不吞错：error 由页面 Alert 统一展示，禁止页面内 JSON.stringify。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchPainAssessments,
  submitPainAssessment,
  type PainAssessmentRecord,
  type PainAssessmentSubmitInput,
  type PainAssessmentSubmitResult,
} from '@/services/api/painAssessmentForm';

interface PainAssessmentFormState {
  records: PainAssessmentRecord[];
  loading: boolean;
  acting: boolean;
  error: string | null;
  demo: boolean;
  lastResult: PainAssessmentSubmitResult | null;
  load: (visitId?: string) => Promise<void>;
  submit: (input: PainAssessmentSubmitInput) => Promise<PainAssessmentSubmitResult>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const usePainAssessmentFormStore = create<PainAssessmentFormState>((set) => ({
  records: [],
  loading: false,
  acting: false,
  error: null,
  demo: false,
  lastResult: null,

  load: async (visitId) => {
    set({ loading: true, error: null });
    try {
      const res = await fetchPainAssessments(visitId);
      set({ records: res.data, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '疼痛评估记录加载失败') });
    }
  },

  submit: async (input) => {
    set({ acting: true, error: null });
    try {
      const result = await submitPainAssessment(input);
      set((state) => ({
        records: [result.record, ...state.records],
        lastResult: result,
        demo: state.demo || result.demo,
        acting: false,
      }));
      return result;
    } catch (e) {
      set({ acting: false, error: errMsg(e, '疼痛评估登记失败') });
      throw e;
    }
  },

  clearError: () => set({ error: null }),
}));
