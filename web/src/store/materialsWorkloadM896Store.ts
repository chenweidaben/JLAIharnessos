/**
 * 健澜科技 jlmedaios - 物资 Zustand store（M896）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchMaterialsWorkload,
  type MaterialsWorkload,
} from '@/services/api/materialsWorkloadM896';

interface MaterialsWorkloadM896State {
  items: MaterialsWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useMaterialsWorkloadM896Store = create<MaterialsWorkloadM896State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchMaterialsWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '物资工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
