/**
 * 健澜科技 jlmedaios - 心血管内科 Zustand store（M783）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchCardioPatients,
  type CardioPatient,
} from '@/services/api/cardioPatientM783';

interface CardioPatientM783State {
  items: CardioPatient[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useCardioPatientM783Store = create<CardioPatientM783State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchCardioPatients();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '心内科患者加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
