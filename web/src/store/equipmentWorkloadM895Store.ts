/**
 * 健澜科技 jlmedaios - 设备 Zustand store（M895）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchEquipmentWorkload,
  type EquipmentWorkload,
} from '@/services/api/equipmentWorkloadM895';

interface EquipmentWorkloadM895State {
  items: EquipmentWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useEquipmentWorkloadM895Store = create<EquipmentWorkloadM895State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchEquipmentWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '设备工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
