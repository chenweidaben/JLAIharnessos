/**
 * 健澜科技 jlmedaios - 医疗质量 Zustand store（M888）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchQualityWorkload,
  type QualityWorkload,
} from '@/services/api/qualityWorkloadM888';

interface QualityWorkloadM888State {
  items: QualityWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useQualityWorkloadM888Store = create<QualityWorkloadM888State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchQualityWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '医疗质量工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
