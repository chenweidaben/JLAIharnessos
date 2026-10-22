/**
 * 健澜科技 jlmedaios - 药剂科 Zustand store（M872）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchPharmacyWorkload,
  type PharmacyWorkload,
} from '@/services/api/pharmacyWorkloadM872';

interface PharmacyWorkloadM872State {
  items: PharmacyWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const usePharmacyWorkloadM872Store = create<PharmacyWorkloadM872State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchPharmacyWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '药剂科工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
