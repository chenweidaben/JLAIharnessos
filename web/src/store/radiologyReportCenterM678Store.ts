/**
 * 健澜科技 jlmedaios - 影像报告中心 Zustand store（M678）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchRadiologyReports,
  type RadiologyReport,
} from '@/services/api/radiologyReportCenterM678';

interface RadiologyReportCenterM678State {
  items: RadiologyReport[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useRadiologyReportCenterM678Store = create<RadiologyReportCenterM678State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchRadiologyReports();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '影像报告加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
