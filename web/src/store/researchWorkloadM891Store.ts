/**
 * 健澜科技 jlmedaios - 科研 Zustand store（M891）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchResearchWorkload,
  type ResearchWorkload,
} from '@/services/api/researchWorkloadM891';

interface ResearchWorkloadM891State {
  items: ResearchWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useResearchWorkloadM891Store = create<ResearchWorkloadM891State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchResearchWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '科研工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
