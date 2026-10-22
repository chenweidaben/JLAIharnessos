/**
 * 健澜科技 jlmedaios - 医保谈判药品 Zustand store（M772）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchNegotiatedDrugs,
  type NegotiatedDrug,
} from '@/services/api/negotiatedDrugM772';

interface NegotiatedDrugM772State {
  items: NegotiatedDrug[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useNegotiatedDrugM772Store = create<NegotiatedDrugM772State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchNegotiatedDrugs();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '谈判药品加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
