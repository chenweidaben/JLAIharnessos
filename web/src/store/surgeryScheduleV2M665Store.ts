/**
 * 健澜科技 jlmedaios - 手术排程 v2 Zustand store（M665）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchSurgerySchedules,
  type SurgerySchedule,
} from '@/services/api/surgeryScheduleV2M665';

interface SurgeryScheduleV2M665State {
  date: string;
  items: SurgerySchedule[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: (date?: string) => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useSurgeryScheduleV2M665Store = create<SurgeryScheduleV2M665State>((set, get) => ({
  date: '2026-10-22',
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async (date) => {
    const d = (date ?? get().date).trim() || '2026-10-22';
    set({ date: d, loading: true, error: null });
    try {
      const res = await fetchSurgerySchedules(d);
      set({ items: res.items, demo: res.demo || get().demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '手术排程加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
