/**
 * 健澜科技 jlmedaios - 眼科 Zustand store（M852）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchOphthalmologyWorkloadM852,
  type OphthalmologyWorkloadM852,
} from '@/services/api/ophthalmologyWorkloadM852';

interface OphthalmologyWorkloadM852State {
  items: OphthalmologyWorkloadM852[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useOphthalmologyWorkloadM852Store = create<OphthalmologyWorkloadM852State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchOphthalmologyWorkloadM852();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '眼科工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
