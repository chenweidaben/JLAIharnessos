/**
 * 健澜科技 jlmedaios - 药品库存预警 store
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getDrugInventory, type DrugInventoryView } from '@/services/api/drugInventory';

interface DrugInventoryState {
  data: DrugInventoryView | null;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
}

export const useDrugInventoryStore = create<DrugInventoryState>((set) => ({
  data: null,
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      set({ data: await getDrugInventory() });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '库存加载失败' });
    } finally {
      set({ loading: false });
    }
  },
}));
