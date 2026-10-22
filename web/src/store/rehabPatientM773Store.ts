/**
 * 健澜科技 jlmedaios - 康复医学科 Zustand store（M773）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchRehabPatients,
  type RehabPatient,
} from '@/services/api/rehabPatientM773';

interface RehabPatientM773State {
  items: RehabPatient[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useRehabPatientM773Store = create<RehabPatientM773State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchRehabPatients();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '康复患者加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
