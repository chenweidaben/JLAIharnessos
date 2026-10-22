/**
 * 健澜科技 jlmedaios - 麻醉记录单 Zustand store（M684）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchAnesthesiaRecords,
  type AnesthesiaRecord,
} from '@/services/api/anesthesiaRecordM684';

interface AnesthesiaRecordM684State {
  items: AnesthesiaRecord[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useAnesthesiaRecordM684Store = create<AnesthesiaRecordM684State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchAnesthesiaRecords();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '麻醉记录加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
