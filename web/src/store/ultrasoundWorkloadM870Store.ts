/**
 * 健澜科技 jlmedaios - 超声科 Zustand store（M870）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchUltrasoundWorkloadM870,
  type UltrasoundWorkloadM870,
} from '@/services/api/ultrasoundWorkloadM870';

interface UltrasoundWorkloadM870State {
  items: UltrasoundWorkloadM870[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useUltrasoundWorkloadM870Store = create<UltrasoundWorkloadM870State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchUltrasoundWorkloadM870();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '超声工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
