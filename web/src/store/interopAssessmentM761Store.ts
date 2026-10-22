/**
 * 健澜科技 jlmedaios - 互联互通测评 Zustand store（M761）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchInteropAssessment,
  type InteropIndicator,
} from '@/services/api/interopAssessmentM761';

interface InteropAssessmentM761State {
  items: InteropIndicator[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useInteropAssessmentM761Store = create<InteropAssessmentM761State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchInteropAssessment();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '互联互通测评加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
