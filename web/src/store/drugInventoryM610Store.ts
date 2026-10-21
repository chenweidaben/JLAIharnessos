/**
 * 健澜科技 jlmedaios - 药品库存管理 Zustand store（M610，P0）
 *
 * state：items / totalCount / loading / acting / error / demo / onlyExpiring 过滤开关。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchDrugInventory,
  receiveDrugStock,
  type DrugInventoryItem,
  type ReceiveInput,
} from '@/services/api/drugInventoryM610';

interface DrugInventoryM610State {
  items: DrugInventoryItem[];
  totalCount: number;
  loading: boolean;
  acting: boolean;
  error: string | null;
  demo: boolean;
  onlyExpiring: boolean;
  load: () => Promise<void>;
  setOnlyExpiring: (v: boolean) => void;
  receive: (input: ReceiveInput) => Promise<boolean>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useDrugInventoryM610Store = create<DrugInventoryM610State>((set, get) => ({
  items: [],
  totalCount: 0,
  loading: false,
  acting: false,
  error: null,
  demo: false,
  onlyExpiring: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchDrugInventory();
      set({ items: res.items, totalCount: res.totalCount, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '药品库存列表加载失败') });
    }
  },

  setOnlyExpiring: (v) => set({ onlyExpiring: v }),

  receive: async (input) => {
    set({ acting: true, error: null });
    try {
      await receiveDrugStock(input);
      set({ acting: false });
      await get().load();
      return true;
    } catch (e) {
      set({ acting: false, error: errMsg(e, '入库失败') });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
