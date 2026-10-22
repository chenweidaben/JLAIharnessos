/**
 * 健澜科技 jlmedaios - 院感 Zustand store（M892）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchInfectionWorkload,
  type InfectionWorkload,
} from '@/services/api/infectionWorkloadM892';

interface InfectionWorkloadM892State {
  items: InfectionWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useInfectionWorkloadM892Store = create<InfectionWorkloadM892State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchInfectionWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '院感工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
