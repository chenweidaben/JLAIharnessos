/**
 * 健澜科技 jlmedaios - 互联互通测评清单 Zustand store（M657）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchInteropChecklist,
  type InteropCheckItem,
} from '@/services/api/interopChecklistM657';

interface InteropChecklistM657State {
  items: InteropCheckItem[];
  totalScore: number;
  maxScore: number;
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useInteropChecklistM657Store = create<InteropChecklistM657State>((set) => ({
  items: [],
  totalScore: 0,
  maxScore: 0,
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchInteropChecklist();
      set({ items: res.items, totalScore: res.totalScore, maxScore: res.maxScore, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '测评清单加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
