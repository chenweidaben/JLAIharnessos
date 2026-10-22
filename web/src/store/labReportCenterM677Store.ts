/**
 * 健澜科技 jlmedaios - 检验报告中心 Zustand store（M677）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchLabReports,
  type LabReport,
} from '@/services/api/labReportCenterM677';

interface LabReportCenterM677State {
  items: LabReport[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useLabReportCenterM677Store = create<LabReportCenterM677State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchLabReports();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '检验报告加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
