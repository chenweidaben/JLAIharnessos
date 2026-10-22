/**
 * 健澜科技 jlmedaios - 安全生产 Zustand store（M911）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchSafetyProductionWorkload,
  type SafetyProductionWorkload,
} from '@/services/api/safetyProductionWorkloadM911';

interface SafetyProductionWorkloadM911State {
  items: SafetyProductionWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useSafetyProductionWorkloadM911Store = create<SafetyProductionWorkloadM911State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchSafetyProductionWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '安全生产工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
