/**
 * 健澜科技 jlmedaios - ICU 监护记录 Zustand store（M685）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchIcuMonitorRecords,
  type IcuMonitorRecord,
} from '@/services/api/icuMonitorRecordM685';

interface IcuMonitorRecordM685State {
  items: IcuMonitorRecord[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useIcuMonitorRecordM685Store = create<IcuMonitorRecordM685State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchIcuMonitorRecords();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, 'ICU 监护记录加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
