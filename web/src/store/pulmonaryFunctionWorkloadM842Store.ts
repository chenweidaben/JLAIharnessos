/**
 * 健澜科技 jlmedaios - 肺功能检查 Zustand store（M842）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchPulmonaryFunctionWorkload,
  type PulmonaryFunctionWorkload,
} from '@/services/api/pulmonaryFunctionWorkloadM842';

interface PulmonaryFunctionWorkloadM842State {
  items: PulmonaryFunctionWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const usePulmonaryFunctionWorkloadM842Store = create<PulmonaryFunctionWorkloadM842State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchPulmonaryFunctionWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '肺功能工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
