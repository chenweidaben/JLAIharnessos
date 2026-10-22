/**
 * 健澜科技 jlmedaios - 职业健康 Zustand store（M910）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchOccupationalHealthWorkload,
  type OccupationalHealthWorkload,
} from '@/services/api/occupationalHealthWorkloadM910';

interface OccupationalHealthWorkloadM910State {
  items: OccupationalHealthWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useOccupationalHealthWorkloadM910Store = create<OccupationalHealthWorkloadM910State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchOccupationalHealthWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '职业健康工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
