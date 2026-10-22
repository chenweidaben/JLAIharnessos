/**
 * 健澜科技 jlmedaios - 放疗科 Zustand store（M809）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchRadiationOncologyWorkload,
  type RadiationOncologyPatient,
} from '@/services/api/radiationOncologyWorkloadM809';

interface RadiationOncologyWorkloadM809State {
  items: RadiationOncologyPatient[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useRadiationOncologyWorkloadM809Store = create<RadiationOncologyWorkloadM809State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchRadiationOncologyWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '放疗工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
