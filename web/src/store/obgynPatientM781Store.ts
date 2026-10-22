/**
 * 健澜科技 jlmedaios - 妇产科 Zustand store（M781）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchObgynPatients,
  type ObgynPatient,
} from '@/services/api/obgynPatientM781';

interface ObgynPatientM781State {
  items: ObgynPatient[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useObgynPatientM781Store = create<ObgynPatientM781State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchObgynPatients();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '妇产患者加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
