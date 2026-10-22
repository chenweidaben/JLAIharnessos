/**
 * 健澜科技 jlmedaios - 标准数据集上报 Zustand store（M658）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchStandardDatasetReports,
  type StandardDatasetReport,
} from '@/services/api/standardDatasetReportM658';

interface StandardDatasetReportM658State {
  items: StandardDatasetReport[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useStandardDatasetReportM658Store = create<StandardDatasetReportM658State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchStandardDatasetReports();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '数据集上报加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
