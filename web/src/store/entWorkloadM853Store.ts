/**
 * 健澜科技 jlmedaios - 耳鼻喉科 Zustand store（M853）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchEntWorkloadM853,
  type EntWorkloadM853,
} from '@/services/api/entWorkloadM853';

interface EntWorkloadM853State {
  items: EntWorkloadM853[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useEntWorkloadM853Store = create<EntWorkloadM853State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchEntWorkloadM853();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '耳鼻喉工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
