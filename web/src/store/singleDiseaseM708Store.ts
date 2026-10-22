/**
 * 健澜科技 jlmedaios - 单病种质量管理 Zustand store（M708）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchSingleDiseases,
  type SingleDisease,
} from '@/services/api/singleDiseaseM708';

interface SingleDiseaseM708State {
  items: SingleDisease[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useSingleDiseaseM708Store = create<SingleDiseaseM708State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchSingleDiseases();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '单病种加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
