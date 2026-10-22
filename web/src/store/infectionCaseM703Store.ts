/**
 * 健澜科技 jlmedaios - 院感病例监测 Zustand store（M703）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchInfectionCases,
  type InfectionCase,
} from '@/services/api/infectionCaseM703';

interface InfectionCaseM703State {
  items: InfectionCase[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useInfectionCaseM703Store = create<InfectionCaseM703State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchInfectionCases();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '院感病例加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
