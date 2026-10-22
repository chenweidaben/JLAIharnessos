/**
 * 健澜科技 jlmedaios - 康复科 Zustand store（M846）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchRehabilitationWorkloadM846,
  type RehabilitationWorkloadM846,
} from '@/services/api/rehabilitationWorkloadM846';

interface RehabilitationWorkloadM846State {
  items: RehabilitationWorkloadM846[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useRehabilitationWorkloadM846Store = create<RehabilitationWorkloadM846State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchRehabilitationWorkloadM846();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '康复工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
