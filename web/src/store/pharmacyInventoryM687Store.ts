/**
 * 健澜科技 jlmedaios - 药房库存管理 Zustand store（M687）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchPharmacyInventory,
  type PharmacyStock,
} from '@/services/api/pharmacyInventoryM687';

interface PharmacyInventoryM687State {
  items: PharmacyStock[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const usePharmacyInventoryM687Store = create<PharmacyInventoryM687State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchPharmacyInventory();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '药房库存加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
