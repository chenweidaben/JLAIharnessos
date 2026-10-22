/**
 * 健澜科技 jlmedaios - 放疗科 Zustand store（M882）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchRadiationOncologyWorkloadM882,
  type RadiationOncologyWorkloadM882,
} from '@/services/api/radiationOncologyWorkloadM882';

interface RadiationOncologyWorkloadM882State {
  items: RadiationOncologyWorkloadM882[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useRadiationOncologyWorkloadM882Store = create<RadiationOncologyWorkloadM882State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchRadiationOncologyWorkloadM882();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '放疗工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
