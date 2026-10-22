/**
 * 健澜科技 jlmedaios - 投诉 Zustand store（M902）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchComplaintWorkload,
  type ComplaintWorkload,
} from '@/services/api/complaintWorkloadM902';

interface ComplaintWorkloadM902State {
  items: ComplaintWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useComplaintWorkloadM902Store = create<ComplaintWorkloadM902State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchComplaintWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '投诉工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
