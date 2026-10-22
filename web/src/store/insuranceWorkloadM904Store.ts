/**
 * 健澜科技 jlmedaios - 医保 Zustand store（M904）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchInsuranceWorkload,
  type InsuranceWorkload,
} from '@/services/api/insuranceWorkloadM904';

interface InsuranceWorkloadM904State {
  items: InsuranceWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useInsuranceWorkloadM904Store = create<InsuranceWorkloadM904State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchInsuranceWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '医保工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
