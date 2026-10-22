/**
 * 健澜科技 jlmedaios - 神经内科 Zustand store（M786）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchNeuroPatients,
  type NeuroPatient,
} from '@/services/api/neuroPatientM786';

interface NeuroPatientM786State {
  items: NeuroPatient[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useNeuroPatientM786Store = create<NeuroPatientM786State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchNeuroPatients();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '神内患者加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
