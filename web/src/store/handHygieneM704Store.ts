/**
 * 健澜科技 jlmedaios - 手卫生依从性监测 Zustand store（M704）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchHandHygieneObservations,
  type HandHygieneObservation,
} from '@/services/api/handHygieneM704';

interface HandHygieneM704State {
  items: HandHygieneObservation[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useHandHygieneM704Store = create<HandHygieneM704State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchHandHygieneObservations();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '手卫生监测加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
