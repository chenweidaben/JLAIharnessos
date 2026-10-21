/**
 * 健澜科技 jlmedaios - 产后访视 Zustand store（M538，P0）
 *
 * 三态：loading / acting / error / demo；提交成功或降级演示记录后前置到历史列表。
 * 写操作失败不吞错：error 由页面 Alert 统一展示，禁止页面内 JSON.stringify。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchPostpartumVisits,
  submitPostpartumVisit,
  type PostpartumVisitRecord,
  type PostpartumVisitSubmitInput,
  type PostpartumVisitSubmitResult,
} from '@/services/api/postpartumVisitForm';

interface PostpartumVisitFormState {
  records: PostpartumVisitRecord[];
  loading: boolean;
  acting: boolean;
  error: string | null;
  demo: boolean;
  lastResult: PostpartumVisitSubmitResult | null;
  load: (visitId?: string) => Promise<void>;
  submit: (input: PostpartumVisitSubmitInput) => Promise<PostpartumVisitSubmitResult>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const usePostpartumVisitFormStore = create<PostpartumVisitFormState>((set) => ({
  records: [],
  loading: false,
  acting: false,
  error: null,
  demo: false,
  lastResult: null,

  load: async (visitId) => {
    set({ loading: true, error: null });
    try {
      const res = await fetchPostpartumVisits(visitId);
      set({ records: res.data, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '产后访视记录加载失败') });
    }
  },

  submit: async (input) => {
    set({ acting: true, error: null });
    try {
      const result = await submitPostpartumVisit(input);
      set((state) => ({
        records: [result.record, ...state.records],
        lastResult: result,
        demo: state.demo || result.demo,
        acting: false,
      }));
      return result;
    } catch (e) {
      set({ acting: false, error: errMsg(e, '产后访视登记失败') });
      throw e;
    }
  },

  clearError: () => set({ error: null }),
}));
