/**
 * 健澜科技 jlmedaios - 耗材库存 Zustand store（M731）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchMaterialInventory,
  type MaterialStock,
} from '@/services/api/materialStockM731';

interface MaterialStockM731State {
  items: MaterialStock[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useMaterialStockM731Store = create<MaterialStockM731State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchMaterialInventory();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '耗材库存加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
