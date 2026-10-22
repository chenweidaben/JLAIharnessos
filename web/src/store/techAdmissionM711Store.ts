/**
 * 健澜科技 jlmedaios - 医疗技术准入管理 Zustand store（M711）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchTechAdmissions,
  type TechAdmission,
} from '@/services/api/techAdmissionM711';

interface TechAdmissionM711State {
  items: TechAdmission[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useTechAdmissionM711Store = create<TechAdmissionM711State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchTechAdmissions();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '技术准入加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
