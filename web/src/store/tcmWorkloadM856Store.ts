/**
 * 健澜科技 jlmedaios - 中医科 Zustand store（M856）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchTcmWorkloadM856,
  type TcmWorkloadM856,
} from '@/services/api/tcmWorkloadM856';

interface TcmWorkloadM856State {
  items: TcmWorkloadM856[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useTcmWorkloadM856Store = create<TcmWorkloadM856State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchTcmWorkloadM856();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '中医工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
