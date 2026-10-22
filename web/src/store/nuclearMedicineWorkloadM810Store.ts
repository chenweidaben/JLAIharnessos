/**
 * 健澜科技 jlmedaios - 核医学科 Zustand store（M810）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchNuclearMedicineWorkload,
  type NuclearMedicineWorkload,
} from '@/services/api/nuclearMedicineWorkloadM810';

interface NuclearMedicineWorkloadM810State {
  items: NuclearMedicineWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useNuclearMedicineWorkloadM810Store = create<NuclearMedicineWorkloadM810State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchNuclearMedicineWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '核医学工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
