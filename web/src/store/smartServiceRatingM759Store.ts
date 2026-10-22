/**
 * 健澜科技 jlmedaios - 智慧服务评级 Zustand store（M759）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchSmartServiceRating,
  type SmartServiceIndicator,
} from '@/services/api/smartServiceRatingM759';

interface SmartServiceRatingM759State {
  items: SmartServiceIndicator[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useSmartServiceRatingM759Store = create<SmartServiceRatingM759State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchSmartServiceRating();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '智慧服务评级加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
