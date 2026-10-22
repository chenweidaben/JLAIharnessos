/**
 * 健澜科技 jlmedaios - 皮肤科 Zustand store（M825）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchDermatologyWorkload,
  type DermatologyWorkload,
} from '@/services/api/dermatologyWorkloadM825';

interface DermatologyWorkloadM825State {
  items: DermatologyWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useDermatologyWorkloadM825Store = create<DermatologyWorkloadM825State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchDermatologyWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '皮肤科工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
