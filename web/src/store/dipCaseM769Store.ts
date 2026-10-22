/**
 * 健澜科技 jlmedaios - DIP 分组 Zustand store（M769）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchDipCases,
  type DipCase,
} from '@/services/api/dipCaseM769';

interface DipCaseM769State {
  items: DipCase[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useDipCaseM769Store = create<DipCaseM769State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchDipCases();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, 'DIP 病例加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
