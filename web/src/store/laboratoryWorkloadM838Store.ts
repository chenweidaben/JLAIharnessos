/**
 * 健澜科技 jlmedaios - 检验科 Zustand store（M838）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchLaboratoryWorkload,
  type LaboratoryWorkload,
} from '@/services/api/laboratoryWorkloadM838';

interface LaboratoryWorkloadM838State {
  items: LaboratoryWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useLaboratoryWorkloadM838Store = create<LaboratoryWorkloadM838State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchLaboratoryWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '检验科工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
