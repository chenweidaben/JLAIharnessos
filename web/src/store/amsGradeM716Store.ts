/**
 * 健澜科技 jlmedaios - 抗菌药物分级管理 Zustand store（M716）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchAmsGrades,
  type AmsGradeItem,
} from '@/services/api/amsGradeM716';

interface AmsGradeM716State {
  items: AmsGradeItem[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useAmsGradeM716Store = create<AmsGradeM716State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchAmsGrades();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '抗菌分级加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
