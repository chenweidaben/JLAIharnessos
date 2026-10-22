/**
 * 健澜科技 jlmedaios - 超声介入 Zustand store（M811）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchUltrasoundInterventionalCases,
  type UltrasoundInterventionalCase,
} from '@/services/api/ultrasoundInterventionalM811';

interface UltrasoundInterventionalM811State {
  items: UltrasoundInterventionalCase[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useUltrasoundInterventionalM811Store = create<UltrasoundInterventionalM811State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchUltrasoundInterventionalCases();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '超声介入加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
