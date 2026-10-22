/**
 * 健澜科技 jlmedaios - 内分泌科 Zustand store（M787）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchEndoPatients,
  type EndoPatient,
} from '@/services/api/endoPatientM787';

interface EndoPatientM787State {
  items: EndoPatient[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useEndoPatientM787Store = create<EndoPatientM787State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchEndoPatients();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '内分泌患者加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
