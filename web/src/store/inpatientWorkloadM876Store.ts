/**
 * 健澜科技 jlmedaios - 住院 Zustand store（M876）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchInpatientWorkload,
  type InpatientWorkload,
} from '@/services/api/inpatientWorkloadM876';

interface InpatientWorkloadM876State {
  items: InpatientWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useInpatientWorkloadM876Store = create<InpatientWorkloadM876State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchInpatientWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '住院工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
