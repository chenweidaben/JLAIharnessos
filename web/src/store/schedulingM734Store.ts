/**
 * 健澜科技 jlmedaios - 排班管理 Zustand store（M734）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchSchedules,
  type Schedule,
} from '@/services/api/scheduleM734';

interface SchedulingM734State {
  items: Schedule[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useSchedulingM734Store = create<SchedulingM734State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchSchedules();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '排班加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
