/**
 * 健澜科技 jlmedaios - 药房发药 Zustand store（M676）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchPrescriptions,
  type Prescription,
} from '@/services/api/pharmacyDispensingM676';

interface PharmacyDispensingM676State {
  items: Prescription[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const usePharmacyDispensingM676Store = create<PharmacyDispensingM676State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchPrescriptions();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '处方列表加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
