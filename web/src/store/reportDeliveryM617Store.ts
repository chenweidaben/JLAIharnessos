/**
 * 健澜科技 jlmedaios - 报告推送 Zustand store（M617，P11）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import { fetchReportDeliveries, type ReportDelivery } from '@/services/api/reportDeliveryM617';

interface ReportDeliveryM617State {
  patientId: string;
  items: ReportDelivery[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: (patientId?: string) => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useReportDeliveryM617Store = create<ReportDeliveryM617State>((set) => ({
  patientId: 'P10001',
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async (patientId) => {
    const pid = (patientId ?? 'P10001').trim() || 'P10001';
    set({ patientId: pid, loading: true, error: null });
    try {
      const res = await fetchReportDeliveries(pid);
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '报告列表加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
