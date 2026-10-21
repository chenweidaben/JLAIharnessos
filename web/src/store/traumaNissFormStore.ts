/**
 * 健澜科技 jlmedaios - 创伤 NISS 评分 Zustand store（M534，P0）
 *
 * 三态：loading / acting / error / demo；提交成功或降级演示记录后前置到历史列表。
 * 写操作失败不吞错：error 由页面 Alert 统一展示，禁止页面内 JSON.stringify。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchTraumaNiss,
  submitTraumaNiss,
  type TraumaNissRecord,
  type TraumaNissSubmitInput,
  type TraumaNissSubmitResult,
} from '@/services/api/traumaNissForm';

interface TraumaNissFormState {
  records: TraumaNissRecord[];
  loading: boolean;
  acting: boolean;
  error: string | null;
  demo: boolean;
  lastResult: TraumaNissSubmitResult | null;
  load: (visitId?: string) => Promise<void>;
  submit: (input: TraumaNissSubmitInput) => Promise<TraumaNissSubmitResult>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useTraumaNissFormStore = create<TraumaNissFormState>((set) => ({
  records: [],
  loading: false,
  acting: false,
  error: null,
  demo: false,
  lastResult: null,

  load: async (visitId) => {
    set({ loading: true, error: null });
    try {
      const res = await fetchTraumaNiss(visitId);
      set({ records: res.data, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, 'NISS 评分记录加载失败') });
    }
  },

  submit: async (input) => {
    set({ acting: true, error: null });
    try {
      const result = await submitTraumaNiss(input);
      set((state) => ({
        records: [result.record, ...state.records],
        lastResult: result,
        demo: state.demo || result.demo,
        acting: false,
      }));
      return result;
    } catch (e) {
      set({ acting: false, error: errMsg(e, 'NISS 评分登记失败') });
      throw e;
    }
  },

  clearError: () => set({ error: null }),
}));
