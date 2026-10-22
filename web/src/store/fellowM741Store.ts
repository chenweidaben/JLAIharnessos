/**
 * 健澜科技 jlmedaios - 进修医生管理 Zustand store（M741）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchFellows,
  type Fellow,
} from '@/services/api/fellowM741';

interface FellowM741State {
  items: Fellow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useFellowM741Store = create<FellowM741State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchFellows();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '进修医生加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
