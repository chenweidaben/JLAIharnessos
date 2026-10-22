/**
 * 健澜科技 jlmedaios - 消化内科 Zustand store（M860）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchGastroenterologyWorkload,
  type GastroenterologyWorkload,
} from '@/services/api/gastroenterologyWorkloadM860';

interface GastroenterologyWorkloadM860State {
  items: GastroenterologyWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useGastroenterologyWorkloadM860Store = create<GastroenterologyWorkloadM860State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchGastroenterologyWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '消化工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
