/**
 * 健澜科技 jlmedaios - 医院总值班 Zustand store（M766）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchGeneralDuty,
  type GeneralDuty,
} from '@/services/api/generalDutyM766';

interface GeneralDutyM766State {
  items: GeneralDuty[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useGeneralDutyM766Store = create<GeneralDutyM766State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchGeneralDuty();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '总值班加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
