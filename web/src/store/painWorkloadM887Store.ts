/**
 * 健澜科技 jlmedaios - 疼痛科 Zustand store（M887）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchPainWorkloadM887,
  type PainWorkloadM887,
} from '@/services/api/painWorkloadM887';

interface PainWorkloadM887State {
  items: PainWorkloadM887[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const usePainWorkloadM887Store = create<PainWorkloadM887State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchPainWorkloadM887();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '疼痛工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
