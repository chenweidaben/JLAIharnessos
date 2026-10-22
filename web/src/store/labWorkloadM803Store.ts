/**
 * 健澜科技 jlmedaios - 检验科 Zustand store（M803）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchLabWorkload,
  type LabWorkload,
} from '@/services/api/labWorkloadM803';

interface LabWorkloadM803State {
  items: LabWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useLabWorkloadM803Store = create<LabWorkloadM803State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchLabWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '检验工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
