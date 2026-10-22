/**
 * 健澜科技 jlmedaios - 妇科 Zustand store（M819）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchGynecologyWorkload,
  type GynecologyWorkload,
} from '@/services/api/gynecologyWorkloadM819';

interface GynecologyWorkloadM819State {
  items: GynecologyWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useGynecologyWorkloadM819Store = create<GynecologyWorkloadM819State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchGynecologyWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '妇科工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
