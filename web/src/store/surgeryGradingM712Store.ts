/**
 * 健澜科技 jlmedaios - 手术分级授权管理 Zustand store（M712）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchSurgeryGradings,
  type SurgeryGrading,
} from '@/services/api/surgeryGradingM712';

interface SurgeryGradingM712State {
  items: SurgeryGrading[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useSurgeryGradingM712Store = create<SurgeryGradingM712State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchSurgeryGradings();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '手术授权加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
