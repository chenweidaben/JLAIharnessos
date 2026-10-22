/**
 * 健澜科技 jlmedaios - 心胸外科 Zustand store（M794）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchCtSurgPatients,
  type CtSurgPatient,
} from '@/services/api/ctSurgPatientM794';

interface CtSurgPatientM794State {
  items: CtSurgPatient[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useCtSurgPatientM794Store = create<CtSurgPatientM794State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchCtSurgPatients();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '心胸患者加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
