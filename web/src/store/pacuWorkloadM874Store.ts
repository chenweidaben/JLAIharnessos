/**
 * 健澜科技 jlmedaios - PACU Zustand store（M874）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchPacuWorkload,
  type PacuWorkload,
} from '@/services/api/pacuWorkloadM874';

interface PacuWorkloadM874State {
  items: PacuWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const usePacuWorkloadM874Store = create<PacuWorkloadM874State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchPacuWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, 'PACU 工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
