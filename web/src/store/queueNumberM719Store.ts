/**
 * 健澜科技 jlmedaios - 门诊排队叫号 Zustand store（M719）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchQueues,
  type QueueCounter,
} from '@/services/api/queueNumberM719';

interface QueueNumberM719State {
  items: QueueCounter[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useQueueNumberM719Store = create<QueueNumberM719State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchQueues();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '叫号队列加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
