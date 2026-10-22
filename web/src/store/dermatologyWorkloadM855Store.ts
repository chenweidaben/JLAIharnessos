/**
 * 健澜科技 jlmedaios - 皮肤科 Zustand store（M855）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchDermatologyWorkloadM855,
  type DermatologyWorkloadM855,
} from '@/services/api/dermatologyWorkloadM855';

interface DermatologyWorkloadM855State {
  items: DermatologyWorkloadM855[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useDermatologyWorkloadM855Store = create<DermatologyWorkloadM855State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchDermatologyWorkloadM855();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '皮肤工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
