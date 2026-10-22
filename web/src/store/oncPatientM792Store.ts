/**
 * 健澜科技 jlmedaios - 肿瘤科 Zustand store（M792）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchOncPatients,
  type OncPatient,
} from '@/services/api/oncPatientM792';

interface OncPatientM792State {
  items: OncPatient[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useOncPatientM792Store = create<OncPatientM792State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchOncPatients();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '肿瘤患者加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
