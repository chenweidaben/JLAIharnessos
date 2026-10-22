/**
 * 健澜科技 jlmedaios - 心电检查报告中心 Zustand store（M682）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchEcgReports,
  type EcgReport,
} from '@/services/api/ecgReportCenterM682';

interface EcgReportCenterM682State {
  items: EcgReport[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useEcgReportCenterM682Store = create<EcgReportCenterM682State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchEcgReports();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '心电报告加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
