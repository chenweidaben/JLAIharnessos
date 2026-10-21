/**
 * 健澜科技 jlmedaios - 在线问诊 Zustand store（M539，P0）
 *
 * 三态：loading / acting / error / demo；提交成功或降级演示记录后前置到历史列表。
 * 写操作失败不吞错：error 由页面 Alert 统一展示，禁止页面内 JSON.stringify。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchOnlineConsults,
  submitOnlineConsult,
  type OnlineConsultRecord,
  type OnlineConsultSubmitInput,
  type OnlineConsultSubmitResult,
} from '@/services/api/onlineConsultForm';

interface OnlineConsultFormState {
  records: OnlineConsultRecord[];
  loading: boolean;
  acting: boolean;
  error: string | null;
  demo: boolean;
  lastResult: OnlineConsultSubmitResult | null;
  load: (patientId?: string) => Promise<void>;
  submit: (input: OnlineConsultSubmitInput) => Promise<OnlineConsultSubmitResult>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useOnlineConsultFormStore = create<OnlineConsultFormState>((set) => ({
  records: [],
  loading: false,
  acting: false,
  error: null,
  demo: false,
  lastResult: null,

  load: async (patientId) => {
    set({ loading: true, error: null });
    try {
      const res = await fetchOnlineConsults(patientId);
      set({ records: res.data, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '在线问诊记录加载失败') });
    }
  },

  submit: async (input) => {
    set({ acting: true, error: null });
    try {
      const result = await submitOnlineConsult(input);
      set((state) => ({
        records: [result.record, ...state.records],
        lastResult: result,
        demo: state.demo || result.demo,
        acting: false,
      }));
      return result;
    } catch (e) {
      set({ acting: false, error: errMsg(e, '在线问诊发起失败') });
      throw e;
    }
  },

  clearError: () => set({ error: null }),
}));
