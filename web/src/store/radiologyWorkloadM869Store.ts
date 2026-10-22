/**
 * 健澜科技 jlmedaios - 放射科 Zustand store（M869）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchRadiologyWorkloadM869,
  type RadiologyWorkloadM869,
} from '@/services/api/radiologyWorkloadM869';

interface RadiologyWorkloadM869State {
  items: RadiologyWorkloadM869[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useRadiologyWorkloadM869Store = create<RadiologyWorkloadM869State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchRadiologyWorkloadM869();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '放射工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
