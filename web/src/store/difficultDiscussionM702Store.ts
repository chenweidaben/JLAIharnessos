/**
 * 健澜科技 jlmedaios - 疑难病例讨论 Zustand store（M702）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchDifficultDiscussions,
  type DifficultDiscussion,
} from '@/services/api/difficultDiscussionM702';

interface DifficultDiscussionM702State {
  items: DifficultDiscussion[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useDifficultDiscussionM702Store = create<DifficultDiscussionM702State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchDifficultDiscussions();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '疑难讨论加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
