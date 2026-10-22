/**
 * 健澜科技 jlmedaios - 超声科 Zustand store（M840）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchUltrasoundWorkloadM840,
  type UltrasoundWorkloadM840,
} from '@/services/api/ultrasoundWorkloadM840';

interface UltrasoundWorkloadM840State {
  items: UltrasoundWorkloadM840[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useUltrasoundWorkloadM840Store = create<UltrasoundWorkloadM840State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchUltrasoundWorkloadM840();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '超声工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
