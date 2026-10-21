/**
 * 健澜科技 jlmedaios - Barthel 指数 ADL Zustand store（M521-G，P0）
 *
 * 三态：loading / acting / error / demo；提交成功或降级演示记录后前置到历史列表。
 * 写操作失败不吞错：error 由页面 Alert 统一展示，禁止页面内 JSON.stringify。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchBarthelRecords,
  submitBarthel,
  type BarthelRecord,
  type BarthelSubmitInput,
  type BarthelSubmitResult,
} from '@/services/api/barthelIndexForm';

interface BarthelIndexFormState {
  records: BarthelRecord[];
  loading: boolean;
  acting: boolean;
  error: string | null;
  demo: boolean;
  lastResult: BarthelSubmitResult | null;
  load: (visitId?: string) => Promise<void>;
  submit: (input: BarthelSubmitInput) => Promise<BarthelSubmitResult>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useBarthelIndexFormStore = create<BarthelIndexFormState>((set) => ({
  records: [],
  loading: false,
  acting: false,
  error: null,
  demo: false,
  lastResult: null,

  load: async (visitId) => {
    set({ loading: true, error: null });
    try {
      const res = await fetchBarthelRecords(visitId);
      set({ records: res.data, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, 'Barthel 评估记录加载失败') });
    }
  },

  submit: async (input) => {
    set({ acting: true, error: null });
    try {
      const result = await submitBarthel(input);
      set((state) => ({
        records: [result.record, ...state.records],
        lastResult: result,
        demo: state.demo || result.demo,
        acting: false,
      }));
      return result;
    } catch (e) {
      set({ acting: false, error: errMsg(e, 'Barthel 评估登记失败') });
      throw e;
    }
  },

  clearError: () => set({ error: null }),
}));
