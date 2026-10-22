/**
 * 健澜科技 jlmedaios - 儿科 Zustand store（M782）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchPediatricPatients,
  type PediatricPatient,
} from '@/services/api/pediatricPatientM782';

interface PediatricPatientM782State {
  items: PediatricPatient[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const usePediatricPatientM782Store = create<PediatricPatientM782State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchPediatricPatients();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '儿科患者加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
