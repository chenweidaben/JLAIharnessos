/**
 * 健澜科技 jlmedaios - 呼吸内科 Zustand store（M784）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchPulmPatients,
  type PulmPatient,
} from '@/services/api/pulmPatientM784';

interface PulmPatientM784State {
  items: PulmPatient[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const usePulmPatientM784Store = create<PulmPatientM784State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchPulmPatients();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '呼吸患者加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
