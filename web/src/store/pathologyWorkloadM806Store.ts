/**
 * 健澜科技 jlmedaios - 病理科 Zustand store（M806）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchPathologyWorkload,
  type PathologyWorkload,
} from '@/services/api/pathologyWorkloadM806';

interface PathologyWorkloadM806State {
  items: PathologyWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const usePathologyWorkloadM806Store = create<PathologyWorkloadM806State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchPathologyWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '病理工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
