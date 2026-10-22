/**
 * 健澜科技 jlmedaios - 门诊 Zustand store（M875）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchOutpatientWorkload,
  type OutpatientWorkload,
} from '@/services/api/outpatientWorkloadM875';

interface OutpatientWorkloadM875State {
  items: OutpatientWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useOutpatientWorkloadM875Store = create<OutpatientWorkloadM875State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchOutpatientWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '门诊工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
