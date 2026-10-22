/**
 * 健澜科技 jlmedaios - 院感暴发预警 v2 Zustand store（M633）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchOutbreakAlerts,
  type OutbreakAlert,
  type OutbreakTrendPoint,
} from '@/services/api/infectionOutbreakM633';

interface InfectionOutbreakM633State {
  alerts: OutbreakAlert[];
  trend: OutbreakTrendPoint[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useInfectionOutbreakM633Store = create<InfectionOutbreakM633State>((set) => ({
  alerts: [],
  trend: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchOutbreakAlerts();
      set({ alerts: res.alerts, trend: res.trend, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '院感暴发预警加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
