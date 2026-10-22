/**
 * 健澜科技 jlmedaios - 泌尿外科 Zustand store（M867）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchUrologyWorkload,
  type UrologyWorkload,
} from '@/services/api/urologyWorkloadM867';

interface UrologyWorkloadM867State {
  items: UrologyWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useUrologyWorkloadM867Store = create<UrologyWorkloadM867State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchUrologyWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '泌尿外科工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
