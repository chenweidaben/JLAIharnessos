/**
 * 健澜科技 jlmedaios - 教学 Zustand store（M890）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchTeachingWorkload,
  type TeachingWorkload,
} from '@/services/api/teachingWorkloadM890';

interface TeachingWorkloadM890State {
  items: TeachingWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useTeachingWorkloadM890Store = create<TeachingWorkloadM890State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchTeachingWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '教学工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
