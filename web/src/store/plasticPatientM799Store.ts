/**
 * 健澜科技 jlmedaios - 整形外科 Zustand store（M799）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchPlasticPatients,
  type PlasticPatient,
} from '@/services/api/plasticPatientM799';

interface PlasticPatientM799State {
  items: PlasticPatient[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const usePlasticPatientM799Store = create<PlasticPatientM799State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchPlasticPatients();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '整形患者加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
