/**
 * 健澜科技 jlmedaios - 肾内科 Zustand store（M788）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchNephroPatients,
  type NephroPatient,
} from '@/services/api/nephroPatientM788';

interface NephroPatientM788State {
  items: NephroPatient[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useNephroPatientM788Store = create<NephroPatientM788State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchNephroPatients();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '肾内患者加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
