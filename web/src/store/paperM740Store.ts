/**
 * 健澜科技 jlmedaios - 论文管理 Zustand store（M740）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchPapers,
  type Paper,
} from '@/services/api/paperM740';

interface PaperM740State {
  items: Paper[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const usePaperM740Store = create<PaperM740State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchPapers();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '论文加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
