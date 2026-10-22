/**
 * 健澜科技 jlmedaios - 人力资源 Zustand store（M893）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchHrWorkload,
  type HrWorkload,
} from '@/services/api/hrWorkloadM893';

interface HrWorkloadM893State {
  items: HrWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useHrWorkloadM893Store = create<HrWorkloadM893State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchHrWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, 'HR 工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
