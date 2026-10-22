/**
 * 健澜科技 jlmedaios - 门诊医生站 Zustand store（M675）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchOutpatientQueue,
  type QueueEntry,
} from '@/services/api/outpatientQueueM675';

interface OutpatientDoctorStationM675State {
  items: QueueEntry[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useOutpatientDoctorStationM675Store = create<OutpatientDoctorStationM675State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchOutpatientQueue();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '门诊队列加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
