/**
 * 健澜科技 jlmedaios - 小儿外科 Zustand store（M801）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchPedSurgPatients,
  type PedSurgPatient,
} from '@/services/api/pedSurgPatientM801';

interface PedSurgPatientM801State {
  items: PedSurgPatient[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const usePedSurgPatientM801Store = create<PedSurgPatientM801State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchPedSurgPatients();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '小儿外科患者加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
