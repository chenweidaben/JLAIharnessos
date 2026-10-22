/**
 * 健澜科技 jlmedaios - 消毒灭菌效果监测 Zustand store（M705）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchDisinfectionTests,
  type DisinfectionTest,
} from '@/services/api/disinfectionTestM705';

interface DisinfectionTestM705State {
  items: DisinfectionTest[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useDisinfectionTestM705Store = create<DisinfectionTestM705State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchDisinfectionTests();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '消毒监测加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
