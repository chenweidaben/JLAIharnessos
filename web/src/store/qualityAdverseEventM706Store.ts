/**
 * 健澜科技 jlmedaios - 医疗不良事件上报 Zustand store（M706）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchQualityAdverseEvents,
  type AdverseEvent,
} from '@/services/api/qualityAdverseEventM706';

interface QualityAdverseEventM706State {
  items: AdverseEvent[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useQualityAdverseEventM706Store = create<QualityAdverseEventM706State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchQualityAdverseEvents();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '不良事件加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
