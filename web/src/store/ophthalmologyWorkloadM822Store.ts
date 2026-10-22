/**
 * 健澜科技 jlmedaios - 眼科 Zustand store（M822）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchOphthalmologyWorkload,
  type OphthalmologyWorkload,
} from '@/services/api/ophthalmologyWorkloadM822';

interface OphthalmologyWorkloadM822State {
  items: OphthalmologyWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useOphthalmologyWorkloadM822Store = create<OphthalmologyWorkloadM822State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchOphthalmologyWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '眼科工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
