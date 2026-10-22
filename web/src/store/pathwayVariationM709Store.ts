/**
 * 健澜科技 jlmedaios - 临床路径变异分析 Zustand store（M709）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchPathwayVariations,
  type PathwayVariation,
} from '@/services/api/pathwayVariationM709';

interface PathwayVariationM709State {
  items: PathwayVariation[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const usePathwayVariationM709Store = create<PathwayVariationM709State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchPathwayVariations();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '路径变异加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
