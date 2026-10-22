/**
 * 健澜科技 jlmedaios - 护理 Zustand store（M889）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchNursingWorkload,
  type NursingWorkload,
} from '@/services/api/nursingWorkloadM889';

interface NursingWorkloadM889State {
  items: NursingWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useNursingWorkloadM889Store = create<NursingWorkloadM889State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchNursingWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '护理工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
