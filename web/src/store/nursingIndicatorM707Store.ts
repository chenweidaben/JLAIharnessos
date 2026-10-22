/**
 * 健澜科技 jlmedaios - 护理质量指标监测 Zustand store（M707）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchNursingIndicators,
  type NursingIndicator,
} from '@/services/api/nursingIndicatorM707';

interface NursingIndicatorM707State {
  items: NursingIndicator[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useNursingIndicatorM707Store = create<NursingIndicatorM707State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchNursingIndicators();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '护理指标加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
