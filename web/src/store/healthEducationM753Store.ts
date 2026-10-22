/**
 * 健澜科技 jlmedaios - 健康教育 Zustand store（M753）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchHealthEducation,
  type HealthEducation,
} from '@/services/api/healthEducationM753';

interface HealthEducationM753State {
  items: HealthEducation[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useHealthEducationM753Store = create<HealthEducationM753State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchHealthEducation();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '健康教育加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
