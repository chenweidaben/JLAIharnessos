/**
 * 健澜科技 jlmedaios - 死亡病例讨论 Zustand store（M701）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchDeathDiscussions,
  type DeathDiscussion,
} from '@/services/api/deathDiscussionM701';

interface DeathDiscussionM701State {
  items: DeathDiscussion[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useDeathDiscussionM701Store = create<DeathDiscussionM701State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchDeathDiscussions();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '死亡讨论加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
