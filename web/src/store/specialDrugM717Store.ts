/**
 * 健澜科技 jlmedaios - 特殊药品管理 Zustand store（M717）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchSpecialDrugs,
  type SpecialDrugLedger,
} from '@/services/api/specialDrugM717';

interface SpecialDrugM717State {
  items: SpecialDrugLedger[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useSpecialDrugM717Store = create<SpecialDrugM717State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchSpecialDrugs();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '特殊药品加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
