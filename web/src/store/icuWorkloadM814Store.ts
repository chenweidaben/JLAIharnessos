/**
 * 健澜科技 jlmedaios - ICU Zustand store（M814）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchIcuWorkload,
  type IcuWorkload,
} from '@/services/api/icuWorkloadM814';

interface IcuWorkloadM814State {
  items: IcuWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useIcuWorkloadM814Store = create<IcuWorkloadM814State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchIcuWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, 'ICU 工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
