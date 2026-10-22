/**
 * 健澜科技 jlmedaios - 药品不良反应监测 Zustand store（M715）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchAdrs,
  type AdrReport,
} from '@/services/api/adrReportM715';

interface AdrMonitoringM715State {
  items: AdrReport[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useAdrMonitoringM715Store = create<AdrMonitoringM715State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchAdrs();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, 'ADR 加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
