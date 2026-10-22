/**
 * 健澜科技 jlmedaios - 口腔科 Zustand store（M780）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchDentalPatients,
  type DentalPatient,
} from '@/services/api/dentalPatientM780';

interface DentalPatientM780State {
  items: DentalPatient[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useDentalPatientM780Store = create<DentalPatientM780State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchDentalPatients();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '口腔患者加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
