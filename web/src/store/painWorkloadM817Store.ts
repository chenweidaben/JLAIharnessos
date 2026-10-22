/**
 * 健澜科技 jlmedaios - 疼痛科 Zustand store（M817）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchPainWorkload,
  type PainWorkload,
} from '@/services/api/painWorkloadM817';

interface PainWorkloadM817State {
  items: PainWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const usePainWorkloadM817Store = create<PainWorkloadM817State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchPainWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '疼痛工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
