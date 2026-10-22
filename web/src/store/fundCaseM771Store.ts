/**
 * 健澜科技 jlmedaios - 医保基金监管 Zustand store（M771）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchFundCases,
  type FundCase,
} from '@/services/api/fundCaseM771';

interface FundCaseM771State {
  items: FundCase[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useFundCaseM771Store = create<FundCaseM771State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchFundCases();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '基金监管加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
