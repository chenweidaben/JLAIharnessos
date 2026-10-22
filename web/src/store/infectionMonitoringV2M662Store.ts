/**
 * 健澜科技 jlmedaios - 院感监测 v2 Zustand store（M662）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchInfectionMonitoring,
  type InfectionMonitoringBundle,
} from '@/services/api/infectionMonitoringV2M662';

interface InfectionMonitoringV2M662State {
  bundle: InfectionMonitoringBundle | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useInfectionMonitoringV2M662Store = create<InfectionMonitoringV2M662State>((set) => ({
  bundle: null,
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchInfectionMonitoring();
      set({ bundle: res, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '院感监测加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
