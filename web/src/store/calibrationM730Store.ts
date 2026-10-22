/**
 * 健澜科技 jlmedaios - 设备计量检定 Zustand store（M730）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchCalibrations,
  type CalibrationRecord,
} from '@/services/api/calibrationM730';

interface CalibrationM730State {
  items: CalibrationRecord[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useCalibrationM730Store = create<CalibrationM730State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchCalibrations();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '计量检定加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
