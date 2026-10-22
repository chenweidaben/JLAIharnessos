/**
 * 健澜科技 jlmedaios - 新生儿科 Zustand store（M821）
 *
 * Copyright (c) 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  fetchNeonatologyWorkload,
  type NeonatologyWorkload,
} from '@/services/api/neonatologyWorkloadM821';

interface NeonatologyWorkloadM821State {
  items: NeonatologyWorkload[];
  loading: boolean;
  error: string | null;
  demo: boolean;
  load: () => Promise<void>;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useNeonatologyWorkloadM821Store = create<NeonatologyWorkloadM821State>((set) => ({
  items: [],
  loading: false,
  error: null,
  demo: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetchNeonatologyWorkload();
      set({ items: res.items, demo: res.demo, loading: false });
    } catch (e) {
      set({ loading: false, error: errMsg(e, '新生儿工作量加载失败') });
    }
  },

  clearError: () => set({ error: null }),
}));
