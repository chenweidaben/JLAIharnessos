/**
 * 健澜科技 jlmedaios - 普外科 Zustand store（M793）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchGenSurgPatients,
  type GenSurgPatient,
} from '@/services/api/genSurgPatientM793';

interface GenSurgPatientM793State {
  items: GenSurgPatient[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useGenSurgPatientM793Store = create<GenSurgPatientM793State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchGenSurgPatients();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '普外患者加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
