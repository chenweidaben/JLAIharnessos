/**
 * 健澜科技 jlmedaios - 设备维护保养 Zustand store（M729）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchMaintenancePlans,
  type MaintenancePlan,
} from '@/services/api/maintenancePlanM729';

interface MaintenanceM729State {
  items: MaintenancePlan[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useMaintenanceM729Store = create<MaintenanceM729State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchMaintenancePlans();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '维护计划加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
