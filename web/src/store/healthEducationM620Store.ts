/**
 * 健澜科技 jlmedaios - 健康教育 Zustand store（M620，P12）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import { fetchHealthArticles, type HealthArticle } from '@/services/api/healthEducationM620';

interface HealthEducationM620State {
  items: HealthArticle[];
  category: string;
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: (category?: string) => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useHealthEducationM620Store = create<HealthEducationM620State>((set, get) => ({
  items: [],
  category: '',
  loading: false,
  error: null,
  demo: false,

  load: async (category) => {
    const cat = category ?? get().category;
    set({ loading: true, error: null, category: cat });
    try {
      const res = await fetchHealthArticles(cat || undefined);
      set({ items: res.items, demo: res.demo || get().demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '健康教育文章加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
