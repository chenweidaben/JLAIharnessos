/**
 * 健澜科技 jlmedaios - 传染病上报 Zustand store（M763）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchInfectiousReports,
  type InfectiousReport,
} from '@/services/api/infectiousReportM763';

interface InfectiousReportM763State {
  items: InfectiousReport[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useInfectiousReportM763Store = create<InfectiousReportM763State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchInfectiousReports();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '传染病上报加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
