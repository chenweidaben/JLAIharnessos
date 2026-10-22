/**
 * 健澜科技 jlmedaios - 病理报告中心 Zustand store（M679）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchPathologyReports,
  type PathologyReport,
} from '@/services/api/pathologyReportCenterM679';

interface PathologyReportCenterM679State {
  items: PathologyReport[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const usePathologyReportCenterM679Store = create<PathologyReportCenterM679State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchPathologyReports();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '病理报告加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
