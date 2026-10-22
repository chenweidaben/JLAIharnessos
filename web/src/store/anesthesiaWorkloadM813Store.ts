/**
 * 健澜科技 jlmedaios - 麻醉科 Zustand store（M813）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchAnesthesiaWorkload,
  type AnesthesiaWorkload,
} from '@/services/api/anesthesiaWorkloadM813';

interface AnesthesiaWorkloadM813State {
  items: AnesthesiaWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useAnesthesiaWorkloadM813Store = create<AnesthesiaWorkloadM813State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchAnesthesiaWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '麻醉工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
