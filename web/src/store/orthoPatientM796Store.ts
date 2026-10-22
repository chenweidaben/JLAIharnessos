/**
 * 健澜科技 jlmedaios - 骨科 Zustand store（M796）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchOrthoPatients,
  type OrthoPatient,
} from '@/services/api/orthoPatientM796';

interface OrthoPatientM796State {
  items: OrthoPatient[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useOrthoPatientM796Store = create<OrthoPatientM796State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchOrthoPatients();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '骨科患者加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
