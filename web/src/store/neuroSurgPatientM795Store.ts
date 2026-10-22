/**
 * 健澜科技 jlmedaios - 神经外科 Zustand store（M795）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchNeuroSurgPatients,
  type NeuroSurgPatient,
} from '@/services/api/neuroSurgPatientM795';

interface NeuroSurgPatientM795State {
  items: NeuroSurgPatient[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useNeuroSurgPatientM795Store = create<NeuroSurgPatientM795State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchNeuroSurgPatients();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '神外患者加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
