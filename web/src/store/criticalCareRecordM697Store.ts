/**
 * 健澜科技 jlmedaios - 危重患者护理记录 Zustand store（M697）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchCriticalCareRecords,
  type CriticalCareRecord,
} from '@/services/api/criticalCareRecordM697';

interface CriticalCareRecordM697State {
  items: CriticalCareRecord[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useCriticalCareRecordM697Store = create<CriticalCareRecordM697State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchCriticalCareRecords();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '危重护理记录加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
