/**
 * 健澜科技 jlmedaios - 医嘱执行单 Zustand store（M694）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchMedAdministrations,
  type MedAdministration,
} from '@/services/api/medAdministrationM694';

interface MedicationAdministrationM694State {
  items: MedAdministration[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useMedicationAdministrationM694Store = create<MedicationAdministrationM694State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchMedAdministrations();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '医嘱执行加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
