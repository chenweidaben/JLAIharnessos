/**
 * 健澜科技 jlmedaios - 超声报告中心 Zustand store（M680）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchUltrasoundReports,
  type UltrasoundReport,
} from '@/services/api/ultrasoundReportCenterM680';

interface UltrasoundReportCenterM680State {
  items: UltrasoundReport[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useUltrasoundReportCenterM680Store = create<UltrasoundReportCenterM680State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchUltrasoundReports();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '超声报告加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
