/**
 * 健澜科技 jlmedaios - 培训管理 Zustand store（M736）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchTrainings,
  type Training,
} from '@/services/api/trainingM736';

interface TrainingM736State {
  items: Training[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useTrainingM736Store = create<TrainingM736State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchTrainings();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '培训加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
