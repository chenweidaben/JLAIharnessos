/**
 * 健澜科技 jlmedaios - 疼痛科 Zustand store（M774）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchPainPatients,
  type PainPatient,
} from '@/services/api/painPatientM774';

interface PainPatientM774State {
  items: PainPatient[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const usePainPatientM774Store = create<PainPatientM774State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchPainPatients();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '疼痛患者加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
