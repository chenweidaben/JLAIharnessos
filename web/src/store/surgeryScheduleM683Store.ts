/**
 * 健澜科技 jlmedaios - 手术排程管理 Zustand store（M683）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchSurgerySchedule,
  type SurgerySchedule,
} from '@/services/api/surgeryScheduleM683';

interface SurgeryScheduleM683State {
  items: SurgerySchedule[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useSurgeryScheduleM683Store = create<SurgeryScheduleM683State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchSurgerySchedule();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '手术排程加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
