/**
 * 健澜科技 jlmedaios - 耳鼻喉科 Zustand store（M823）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchEntWorkload,
  type EntWorkload,
} from '@/services/api/entWorkloadM823';

interface EntWorkloadM823State {
  items: EntWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useEntWorkloadM823Store = create<EntWorkloadM823State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchEntWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '耳鼻喉工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
