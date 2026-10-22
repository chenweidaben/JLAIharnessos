/**
 * 健澜科技 jlmedaios - 出院随访 Zustand store（M901）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchFollowupWorkload,
  type FollowupWorkload,
} from '@/services/api/followupWorkloadM901';

interface FollowupWorkloadM901State {
  items: FollowupWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useFollowupWorkloadM901Store = create<FollowupWorkloadM901State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchFollowupWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '出院随访工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
