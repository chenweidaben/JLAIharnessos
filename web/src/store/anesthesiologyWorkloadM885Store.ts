/**
 * 健澜科技 jlmedaios - 麻醉科 Zustand store（M885）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchAnesthesiologyWorkloadM885,
  type AnesthesiologyWorkloadM885,
} from '@/services/api/anesthesiologyWorkloadM885';

interface AnesthesiologyWorkloadM885State {
  items: AnesthesiologyWorkloadM885[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useAnesthesiologyWorkloadM885Store = create<AnesthesiologyWorkloadM885State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchAnesthesiologyWorkloadM885();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '麻醉工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
