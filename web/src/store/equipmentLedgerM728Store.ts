/**
 * 健澜科技 jlmedaios - 医疗设备台账 Zustand store（M728）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchEquipmentLedger,
  type EquipmentLedger,
} from '@/services/api/equipmentLedgerM728';

interface EquipmentLedgerM728State {
  items: EquipmentLedger[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useEquipmentLedgerM728Store = create<EquipmentLedgerM728State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchEquipmentLedger();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '设备台账加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
