/**
 * 健澜科技 jlmedaios - 中医科 Zustand store（M826）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchTcmWorkload,
  type TcmWorkload,
} from '@/services/api/tcmWorkloadM826';

interface TcmWorkloadM826State {
  items: TcmWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useTcmWorkloadM826Store = create<TcmWorkloadM826State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchTcmWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '中医工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
