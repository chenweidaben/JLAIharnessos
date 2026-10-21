/**
 * 健澜科技 jlmedaios - 排班日历 Zustand store（M614，P0）
 *
 * state：shifts / coverage / loading / error / demo。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchCoverage,
  fetchShifts,
  type CoverageRow,
  type ShiftRecord,
} from '@/services/api/schedulingCalendarM614';

interface SchedulingCalendarM614State {
  shifts: ShiftRecord[];
  coverage: CoverageRow[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useSchedulingCalendarM614Store = create<SchedulingCalendarM614State>((set) => ({
  shifts: [],
  coverage: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const [shifts, cov] = await Promise.all([fetchShifts(), fetchCoverage()]);
      set({
        shifts: shifts.items,
        coverage: cov.items,
        demo: shifts.demo || cov.demo,
        loading: false,
      });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '排班数据加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
