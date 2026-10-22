/**
 * 健澜科技 jlmedaios - 手术室 Zustand store（M873）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchOperatingRoomWorkload,
  type OperatingRoomWorkload,
} from '@/services/api/operatingRoomWorkloadM873';

interface OperatingRoomWorkloadM873State {
  items: OperatingRoomWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useOperatingRoomWorkloadM873Store = create<OperatingRoomWorkloadM873State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchOperatingRoomWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '手术室工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
