/**
 * 健澜科技 jlmedaios - 心电图科 Zustand store（M807）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchEcgWorkload,
  type EcgWorkload,
} from '@/services/api/ecgWorkloadM807';

interface EcgWorkloadM807State {
  items: EcgWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useEcgWorkloadM807Store = create<EcgWorkloadM807State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchEcgWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '心电工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
