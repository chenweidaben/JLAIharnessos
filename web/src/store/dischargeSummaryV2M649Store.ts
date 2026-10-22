/**
 * 健澜科技 jlmedaios - 出院小结 v2 Zustand store（M649）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchDischargeSummaries,
  type DischargeSummary,
} from '@/services/api/dischargeSummaryV2M649';

interface DischargeSummaryV2M649State {
  patientId: string;
  items: DischargeSummary[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: (patientId?: string) => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useDischargeSummaryV2M649Store = create<DischargeSummaryV2M649State>((set, get) => ({
  patientId: 'P10002',
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async (patientId) => {
    const pid = (patientId ?? get().patientId).trim() || 'P10002';
    set({ patientId: pid, loading: true, error: null });
    try {
      const res = await fetchDischargeSummaries(pid);
      set({ items: res.items, demo: res.demo || get().demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '出院小结加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
