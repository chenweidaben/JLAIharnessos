/**
 * 健澜科技 jlmedaios - 口腔科 Zustand store（M854）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchDentistryWorkload,
  type DentistryWorkload,
} from '@/services/api/dentistryWorkloadM854';

interface DentistryWorkloadM854State {
  items: DentistryWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useDentistryWorkloadM854Store = create<DentistryWorkloadM854State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchDentistryWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '口腔工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
