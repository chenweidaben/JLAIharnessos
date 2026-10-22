/**
 * 健澜科技 jlmedaios - 神经内科 Zustand store（M861）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchNeurologyWorkload,
  type NeurologyWorkload,
} from '@/services/api/neurologyWorkloadM861';

interface NeurologyWorkloadM861State {
  items: NeurologyWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useNeurologyWorkloadM861Store = create<NeurologyWorkloadM861State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchNeurologyWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '神内工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
