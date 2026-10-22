/**
 * 健澜科技 jlmedaios - 运营管理驾驶舱 Zustand store（M830）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchOperationsOverview,
  type OperationsOverview,
} from '@/services/api/operationsOverviewM830';

interface OperationsOverviewM830State {
  items: OperationsOverview[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useOperationsOverviewM830Store = create<OperationsOverviewM830State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchOperationsOverview();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '运营驾驶舱加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
