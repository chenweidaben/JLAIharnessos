/**
 * 健澜科技 jlmedaios - 耗材管理 Zustand store（M611，P0）
 *
 * state：库存 items + 申领 requisitions / loading / acting / error / demo。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  createRequisition,
  fetchMaterialsInventory,
  fetchRequisitions,
  type ConsumableItem,
  type RequisitionInput,
  type RequisitionItem,
} from '@/services/api/consumablesM611';

interface ConsumablesM611State {
  items: ConsumableItem[];
  requisitions: RequisitionItem[];
  loading: boolean;
  acting: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  submitRequisition: (input: RequisitionInput) => Promise<boolean>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useConsumablesM611Store = create<ConsumablesM611State>((set, get) => ({
  items: [],
  requisitions: [],
  loading: false,
  acting: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [inv, req] = await Promise.all([fetchMaterialsInventory(), fetchRequisitions()]);
      set({
        items: inv.items,
        requisitions: req.items,
        demo: inv.demo || req.demo,
        loading: false,
      });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '耗材数据加载失败') });
    }
  },

  submitRequisition: async (input) => {
    set({ acting: true, error: null });
    try {
      await createRequisition(input);
      set({ acting: false });
      await get().load();
      return true;
    } catch (e) {
      set({ acting: false, error: errMsg(e, '申领失败') });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
