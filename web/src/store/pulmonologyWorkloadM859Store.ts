/**
 * 健澜科技 jlmedaios - 呼吸内科 Zustand store（M859）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchPulmonologyWorkload,
  type PulmonologyWorkload,
} from '@/services/api/pulmonologyWorkloadM859';

interface PulmonologyWorkloadM859State {
  items: PulmonologyWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const usePulmonologyWorkloadM859Store = create<PulmonologyWorkloadM859State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchPulmonologyWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '呼吸工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
