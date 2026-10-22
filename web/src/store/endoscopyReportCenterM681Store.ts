/**
 * 健澜科技 jlmedaios - 内镜报告中心 Zustand store（M681）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchEndoscopyReports,
  type EndoscopyReport,
} from '@/services/api/endoscopyReportCenterM681';

interface EndoscopyReportCenterM681State {
  items: EndoscopyReport[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useEndoscopyReportCenterM681Store = create<EndoscopyReportCenterM681State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchEndoscopyReports();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '内镜报告加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
