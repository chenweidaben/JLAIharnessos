/**
 * 健澜科技 jlmedaios - 护理排班 v2 Zustand store（M664）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchNursingSchedules,
  type NursingSchedule,
} from '@/services/api/nursingScheduleV2M664';

interface NursingScheduleV2M664State {
  dept: string;
  items: NursingSchedule[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: (dept?: string) => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useNursingScheduleV2M664Store = create<NursingScheduleV2M664State>((set, get) => ({
  dept: '呼吸一病区',
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async (dept) => {
    const d = (dept ?? get().dept).trim() || '呼吸一病区';
    set({ dept: d, loading: true, error: null });
    try {
      const res = await fetchNursingSchedules(d);
      set({ items: res.items, demo: res.demo || get().demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '护理排班加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
