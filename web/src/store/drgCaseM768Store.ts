/**
 * 健澜科技 jlmedaios - DRG 分组 Zustand store（M768）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchDrgCases,
  type DrgCase,
} from '@/services/api/drgCaseM768';

interface DrgCaseM768State {
  items: DrgCase[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useDrgCaseM768Store = create<DrgCaseM768State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchDrgCases();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, 'DRG 病例加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
