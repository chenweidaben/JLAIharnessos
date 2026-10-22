/**
 * 健澜科技 jlmedaios - 核医学 Zustand store（M881）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchNuclearMedicineWorkloadM881,
  type NuclearMedicineWorkloadM881,
} from '@/services/api/nuclearMedicineWorkloadM881';

interface NuclearMedicineWorkloadM881State {
  items: NuclearMedicineWorkloadM881[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useNuclearMedicineWorkloadM881Store = create<NuclearMedicineWorkloadM881State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchNuclearMedicineWorkloadM881();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '核医学工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
