/**
 * 健澜科技 jlmedaios - 病案首页质控 Zustand store（M710）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchHomepageQuality,
  type HomepageQuality,
} from '@/services/api/homepageQualityM710';

interface HomepageQualityM710State {
  items: HomepageQuality[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useHomepageQualityM710Store = create<HomepageQualityM710State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchHomepageQuality();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '首页质控加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
